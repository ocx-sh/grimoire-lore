---
title: "Go CLI exit contract — the exit table, usage errors, SIGPIPE and signals"
topic: "GO-CLI: exit codes, cobra/urfave usage errors, SIGPIPE, signal-to-status mapping, idempotent re-run"
agent: cli/exit-codes-and-signals (wave 2 dive)
model: sonnet
date_researched: 2026-09-26
sources_count: 19
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/exit-codes-and-signals/
scope: >
  Covers rows M-F-01..06 and M-F-16 of go-topic-map.md §F: the typed
  ExitCode/two-line-main shape, ordered error classification, cobra/urfave
  usage-error exit status, SIGPIPE default behaviour and its central fix,
  child-process signal-status passthrough, SIGINT/SIGTERM handling via
  NotifyContext, and idempotent re-run of a crashed mutating command.
  Does NOT cover stdout/stderr stream discipline, JSON envelopes, colour,
  prompts, or config-path precedence (M-F-07..15 — a separate dive); does
  not cover bubbletea/TUI signal yielding (M-F-15) beyond one pointer.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- A Go CLI needs its own `type ExitCode int` mirroring the fleet's pinned 0/1/64–86 table (`rules/rust-quality/cli-contract.md`) — no Go CLI framework or exemplar ships that table; cobra, urfave/cli v3 and `gh` each invent their own, unrelated numbering.
- `main` is two lines — `os.Exit(int(run(...)))` — with every defer, flush and signal-stop living inside `run`, because `os.Exit` skips every deferred call on the stack it is invoked from (confirmed: a violation fixture exits 0 while silently dropping a buffered write; [pkg.go.dev/os#Exit](https://pkg.go.dev/os#Exit)).
- Cobra's `Execute()`/`ExecuteC()` **never calls `os.Exit` and never assigns 64 to anything** — every returned error, whether from a bad flag, a bad arg count, or `RunE` business logic, is exit 1 by the textbook `if err := cmd.Execute(); err != nil { os.Exit(1) }` template (verified: unknown flag and bad arg count both exit 1 with default wiring).
- Cobra exposes exactly **one** typed error hook for this — `SetFlagErrorFunc` — which fires only for flag-*parsing* errors (`command.go:919-921`); positional-argument-count errors from `cobra.ExactArgs`/`MinimumNArgs` are plain untyped `fmt.Errorf` with no hook at all and need a second wrapper (`args.go`). Both wired together is the minimum code that yields exit 64 for both cases (verified).
- Cobra's "unknown subcommand" error (a mistyped subcommand name) is detected by `legacyArgs` **only when the matched command's `Args` field is nil** (`command.go:775-776`); setting a custom `Args` validator on the root command silently disables that typo detection unless the wrapper also re-implements it — a real footgun, not just a wiring gap.
- urfave/cli v3's `Command.Run` "will not automatically call `os.Exit`... by default the exit code will 'fall through' to being 0" — an explicit non-zero code needs a returned error satisfying `cli.ExitCoder` (`cli.Exit(msg, code)`); v3's `Action` signature is `func(context.Context, *cli.Command) error`, context-first, unlike v2.
- Ordered error classification (`gh`'s `internal/ghcmd/cmd.go:187-212` shape) is the right *mechanism* but the wrong *numbers* for the fleet: `gh` maps to its own ad hoc `exitOK=0, exitError=1, exitCancel=2, exitAuth=4, exitPending=8`, not sysexits. A fleet CLI copies the ordered-`errors.Is`/`errors.AsType` chain and the two-line `main`, and assigns its own chain's terminal codes from the pinned OCX table instead.
- Go's default SIGPIPE behaviour is the **opposite** of Rust's: Rust sets `SIGPIPE` to `SIG_IGN` before `main` so a broken pipe is always a caught `Err`; Go's unhandled default is death by signal on fd 1/2 (exit **141** for SIGPIPE, verified), not the pinned clean exit 0 that CLI-05 requires.
- `signal.Notify` **or** `signal.Ignore` for SIGPIPE both turn the would-be-fatal signal into an ordinary `syscall.EPIPE` write error on fd 1/2 — but neither one, by itself, produces exit 0: a naive check after `Notify` still exits 1 (verified), and skipping the check entirely after `Ignore` panics to exit 2 (verified). The clean exit 0 needs one central `errors.Is(err, syscall.EPIPE)` check in `main`, not a per-call-site special case.
- `os.ProcessState.ExitCode()` "returns -1 if the process hasn't exited or was terminated by a signal" ([pkg.go.dev/os#ProcessState.ExitCode](https://pkg.go.dev/os#ProcessState.ExitCode)) — trusting it directly on a signal-killed child and passing it straight to `os.Exit` truncates to exit **255**, not the expected 128+N (verified: 255 vs the correct 143 for SIGTERM).
- The correct child-signal mapping is Unix-only: `exitErr.Sys().(syscall.WaitStatus)`, then `ws.Signaled()` and `128 + int(ws.Signal())` (verified: SIGTERM-self-killed child → parent exits 143).
- `os/signal.NotifyContext`'s Go 1.26 cause ("an error indicating which signal was received") is **not a typed accessor** — the concrete type is an unexported `signalError string` whose only methods are `Error() string` and `Is(target error) bool` (true only for `context.Canceled`); recovering the *signal value itself* means either string-matching `context.Cause(ctx).Error()` against `syscall.SIGINT.String()+" signal received"` (fragile but confirmed working), or dropping `NotifyContext` for this purpose and using a plain `signal.Notify` channel to get the typed `os.Signal` directly (confirmed working, and the design this file recommends).
- SIGINT and SIGTERM received directly by the CLI's own process map to the shell convention 128+N (130, 143 respectively) purely as a chosen convention — unlike a genuinely signal-killed child, the process choosing its own exit code after catching a signal is not "signal death" at the OS level, so nothing forces this number; it is adopted so `$?` matches what a script would see if the signal had killed the process outright.
- On Windows, `os.Process.Signal` only implements `os.Kill`; any other signal, including `syscall.SIGTERM`, returns `syscall.EWINDOWS` (`src/os/exec_windows.go:76`, go1.27.1) — a fleet CLI cannot send a graceful SIGTERM to a *child* process on Windows and must fall back to `Process.Kill()` there. Receiving `os.Interrupt` (Ctrl-C/Ctrl-Break) via `signal.Notify`/`NotifyContext` in the CLI's *own* process does work cross-platform; sending SIGTERM to a *child* does not.
- `nishanths/exhaustive` (bundled into golangci-lint v2 as the `exhaustive` linter) is the substitute for Rust's compiler-enforced exhaustive match over a closed enum (EXIT-07): Go has no closed sum type, so a `switch` over a typed `ExitCode` that omits a variant compiles silently unless this linter runs (verified: 1 issue on a switch missing one of seven `ExitCode` cases; 0 issues once every case is present).
- Idempotent re-run (M-F-16) is a **write-then-rename** discipline, not an exit-code question: appending directly to the destination on a crash mid-write and re-running duplicates the record (verified: 2 lines after crash+retry); writing to a `.tmp` sibling, `fsync`-ing, then `os.Rename`-ing over the destination leaves it untouched by a pre-rename crash, so a retry reproduces the exact same content (verified: 1 line).
- containerd's `content.Writer.Commit` documents the same shape at the SDK level: "size and expected can be zero-value when unknown... Commit always closes the writer, even on error. `ErrAlreadyExists` aborts the writer" — a two-phase ingest keyed on a ref-scoped lock so concurrent writers of the same digest serialize instead of racing two temp files (`containerd/containerd@934434dde54b:core/content/content.go`).
- Every row here has a Rust EXIT/CLI-ID mirror except M-F-16, which the Rust contract's own text calls out only as an unnamed "shape" (idempotent mutation is implied by the atomic-write discipline in `rust-quality/durable-state.md`, not spelled out as its own numbered rule).

## Findings

### 1. The exit table is a Go-native reinvention, not a port

No exemplar, and no Go CLI framework, carries anything resembling the fleet's
64–86 range. `spf13/cobra` assigns no numbers at all — it only decides
whether to print usage text. `urfave/cli` v3's only numeric convention is
"whatever `cli.Exit(msg, n)` is told," with no house table
([`docs/v3/examples/exit-codes.md`](https://raw.githubusercontent.com/urfave/cli/main/docs/v3/examples/exit-codes.md)).
`cli/cli` (`gh`) is the deepest real-world reference in the corpus for the
*mechanism* — an ordered dispatch on a returned error into a small numeric
taxonomy — but its own taxonomy (`exitOK=0, exitError=1, exitCancel=2,
exitAuth=4, exitPending=8`,
`cli/cli@9b031151a825:internal/ghcmd/cmd.go:41-49`) has nothing to do with
sysexits. `aquasecurity/trivy` carries typed `ExitError`/`UserError`
(`trivy@ae561f8cca36:pkg/types/error.go:11,20`) but not a sysexits-aligned
table either ([go-topic-map/domain.md](../go-topic-map/domain.md) §5,
[go-topic-map.md](../go-topic-map.md) conflict 7).

**Decision**: the Go `ExitCode` is a direct, standalone port of
`ocx_exit::ExitCode` (`/home/mherwig/dev/ocx/crates/ocx_exit/src/exit_code.rs:20-113`),
not an adaptation of any Go framework's own numbering:

```go
// Process exit codes for every binary in this workspace.
//
// 64-78 mirror BSD sysexits(3); 79+ is the private range above EX__MAX.
// Values are a public contract: append only, never reassign.
type ExitCode int

const (
	Success      ExitCode = 0
	Failure      ExitCode = 1  // unclassified fall-through only
	UsageError   ExitCode = 64
	DataError    ExitCode = 65
	Unavailable  ExitCode = 69
	IOError      ExitCode = 74
	TempFail     ExitCode = 75
	PermissionDenied ExitCode = 77
	ConfigError  ExitCode = 78
	NotFound     ExitCode = 79
	AuthError    ExitCode = 80
	PolicyBlocked ExitCode = 81
	// 82-86 project-specific slots; 83-99 next-free per the Rust table
)

func (c ExitCode) ExitCode() int { return int(c) } // satisfies os.Exit's int param
```

Go has no `#[repr(u8)]`/`#[non_exhaustive]` equivalent; the substitute for
"no bare integer literal reaches a process exit" (EXIT-01) is a grep, not a
compiler check (Normative guidance candidate 1).

### 2. The two-line `main` and a testable `run`

`os.Exit`'s own doc is unambiguous: "The program terminates immediately;
deferred functions are not run"
([pkg.go.dev/os#Exit](https://pkg.go.dev/os#Exit)). `gh`'s own `main.go` is
exactly two lines:

```go
// cli/cli@9b031151a825:cmd/gh/main.go
func main() {
	code := ghcmd.Main()
	os.Exit(int(code))
}
```

This is the shape a fleet CLI copies verbatim, substituting the fleet's own
`ExitCode` for `gh`'s `exitCode`:

```go
func main() {
	os.Exit(int(run(os.Args[1:])))
}

func run(args []string) ExitCode {
	// every defer, signal.Stop, and buffered flush lives here —
	// nothing below this point calls os.Exit
	...
}
```

Verified (`osexitdefer/violation` vs `osexitdefer/fixed`, fixtures below):
calling `os.Exit` from inside a helper after a `defer w.Flush()` has already
been registered drops the buffered write silently — **the exit code is 0 in
both the broken and the fixed version**; only the file's content differs.
This is the sharpest reason `EXIT-02`'s Go mirror matters: an exit-code test
alone cannot catch this class of bug, because `os.Exit` skipping defers is
not itself an error condition.

### 3. Ordered classification: the right mechanism, not gh's own numbers

`gh`'s dispatch (`internal/ghcmd/cmd.go:187-212`) is an ordered chain of
`==`/`errors.Is`/`errors.AsType` checks against untyped sentinels
(`cmdutil.SilentError`, `cmdutil.PendingError`) and typed errors
(`*root.AuthError`, `*root.ExternalCommandExitError`), falling through to
generic error printing only at the end. `errors.AsType[E error](err error)
(E, bool)` is Go 1.26's generic, type-safe replacement for `errors.As` (no
pointer-to-target argument, no manual type assertion) —
[pkg.go.dev/errors#AsType](https://pkg.go.dev/errors#AsType),
[go.dev/doc/go1.26](https://go.dev/doc/go1.26).

A fleet CLI's `run` mirrors the *shape* (ordered, first-match dispatch,
`errors.AsType` over `errors.As` where the code path is 1.26+) but assigns
its own terminal values from the OCX table, e.g.:

```go
func classify(err error) ExitCode {
	switch {
	case errors.Is(err, syscall.EPIPE):
		return Success // CLI-05's Go mirror — never a failure
	case errors.As(err, new(*UsageError)):
		return UsageError
	case errors.As(err, new(*ConfigFileError)):
		return ConfigError
	// ... every other typed/sentinel class, most specific first
	default:
		return Failure // EXIT-04: fall-through only
	}
}
```

`exhaustive`'s map-literal mode (`-check=switch,map`) does not apply here
because this switch has no tag type to be exhaustive over (it is a
condition list, not a value switch) — exhaustiveness on *this* function is
enforced only by test coverage per error class (mirrors EXIT-07's "one test
per fall-through" for the untyped path, and a dedicated `exhaustive`-checked
switch elsewhere for the *typed* `ExitCode` itself, finding 9 below).

### 4. Usage errors: cobra's actual default is 1, not 64, and getting to 64 needs two hooks

Cobra's `Command.Execute()` is `_, err := c.ExecuteC(); return err` — it
**never touches `os.Exit`**
(`spf13/cobra@adbc8813901b:command.go:1070-1073`, confirmed against the
locally-fetched `main` branch source, same lines in the pinned exemplar
SHA). The textbook cobra `main.go`

```go
if err := rootCmd.Execute(); err != nil {
	os.Exit(1)
}
```

exits 1 for **every** error class cobra can produce: an unknown flag, a bad
positional-argument count, an unrecognized subcommand, or a `RunE` business
error — verified directly (`cobra64/violation`, below): `--bogus-flag` and
zero args both print a cobra-formatted usage error to stderr and exit 1.

Cobra exposes exactly one typed hook, and it covers only one of the three
error sources:

| Error source | Where it originates | Typed hook available? |
|---|---|---|
| Unknown/malformed flag | `c.ParseFlags(a)` → `c.FlagErrorFunc()(c, err)` (`command.go:919-921`) | Yes — `SetFlagErrorFunc` |
| Bad positional-arg count | `cobra.ExactArgs`/`MinimumNArgs` etc., called from `execute()` via `c.ValidateArgs` (`command.go:1172`, `args.go`) | No — plain `fmt.Errorf`, no callback |
| Unrecognized subcommand | `legacyArgs` inside `Find`, **only when `commandFound.Args == nil`** (`command.go:774-776`) | No — plain `fmt.Errorf`, and setting a custom `Args` on that command *disables* this detection path entirely |

The minimum wiring that reliably yields exit 64 (verified,
`cobra64/fixed`): (a) `root.SetFlagErrorFunc` wraps the flag-parse error in
a typed `*UsageError`; (b) every `Args` validator on every command is
wrapped through a small `wrapArgs(v cobra.PositionalArgs) cobra.PositionalArgs`
helper that does the same; (c) `classify(err)` in `main` checks
`errors.As(err, &usageErr)` before falling through to 1. Unknown-subcommand
detection is preserved only because the fixture's root command keeps a
wrapped, non-nil `Args` (so `legacyArgs` is skipped correctly by cobra's own
`commandFound.Args == nil` check, and the wrapper's own arg-count validator
still runs on whatever cobra treats as positional args at that point) — a
CLI that instead sets `Args: cobra.ArbitraryArgs` on the root to "accept
anything" loses the mistyped-subcommand usage error silently, letting it
fall through to `RunE` as if it were a real positional argument.

urfave/cli v3 has the opposite default: `Command.Run` "will not
automatically call `os.Exit`... by default the exit code will 'fall
through' to being 0"
([`docs/v3/getting-started.md`](https://raw.githubusercontent.com/urfave/cli/main/docs/v3/getting-started.md)) —
an unhandled parse error there risks exit **0** unless the caller's own
`if err := cmd.Run(...); err != nil { ... }` assigns a code, the mirror
image of cobra's "everything is 1" default. Neither framework gets a fleet
CLI to 64 without explicit classification code; the owner's decision (frame
Q3) to use cobra + pflag means the two-hook wiring above, not urfave's
`ExitCoder`, is the one the `go-quality/cli-contract.md` rule documents.

### 5. SIGPIPE: opposite default from Rust, one central fix

`os/signal`'s SIGPIPE doc section, read at
[pkg.go.dev/os/signal](https://pkg.go.dev/os/signal) and at source
(`src/os/signal/signal.go`, go1.27.1): writing to a broken pipe on fd 1 or 2
with **no** `Notify` registered for `SIGPIPE` "will cause the program to
exit with a SIGPIPE signal" so that "command line programs will behave like
typical Unix command line programs." Registering `Notify` for `SIGPIPE` —
even incidentally, as part of a broader signal set registered for Ctrl-C
handling — changes fd 1/2 writes to return `syscall.EPIPE` as an ordinary
error instead of killing the process. `signal.Ignore(SIGPIPE)` has the same
practical effect on those writes as `Notify` (both stop the kernel-default
disposition from terminating the process); the difference is only whether a
channel receives the signal too.

Rust's contract (CLI-05) is unconditional: "Rust sets `SIGPIPE` to
`SIG_IGN` before `main`, so `println!` panics once a reader like `head`
closes it" — that panic is Rust's *signal* for "you must catch this," not
its steady state; the actual pinned behavior is exit 0. Go's unhandled
default is the reverse of Rust's *unhandled* default (Go dies by signal;
Rust gets a catchable panic) but the two languages converge once each is
wired correctly — CLI-05's clean-exit-0 requirement is achievable in Go,
just not for free. Three verified fixture states (`sigpipe/`, all built and
run against `| head -1`) show why none of the partial fixes suffice:

| Fixture | Mechanism | Result piped to `head -1` |
|---|---|---|
| `default` | nothing registered | **141** (128+13, death by SIGPIPE) — violates CLI-05 |
| `notifynaive` | `Notify(SIGPIPE, ...)`, ad hoc `if err != nil { os.Exit(1) }` at the write site | **1** — no longer a signal death, but still not the pinned 0 |
| `ignore` | `Ignore(SIGPIPE)`, no error check at the write site (`panic(err)`) | **2** (Go runtime panic exit) — worse than the default |
| `central` | `Notify(SIGPIPE, ...)`, one `errors.Is(err, syscall.EPIPE)` check in `main` only | **0** — meets CLI-05 |

The fix is `Notify` **plus** exactly one central check in `main`/`run`, not
per-call-site error handling. `signal.Ignore` needs the identical central
check; it is not a shortcut that removes the need for one — its only
advantage over `Notify` is not needing a channel, and its risk (demonstrated
by the `ignore` fixture) is that skipping the write-error check entirely,
which feels safe once the signal is "ignored," produces a panic instead of
silence.

### 6. Child exit status: `ExitCode()` alone lies on a signal death

`os.ProcessState.ExitCode()`'s doc is exact: "ExitCode returns the exit code
of the exited process, or -1 if the process hasn't exited or was terminated
by a signal"
([pkg.go.dev/os#ProcessState.ExitCode](https://pkg.go.dev/os#ProcessState.ExitCode)).
`os/exec#ExitError` embeds `*os.ProcessState`; its own doc is thin ("An
ExitError reports an unsuccessful exit by a command," plus a `Stderr []byte`
debugging field) and does not itself warn about the -1 case — the warning
lives on `ProcessState.ExitCode()`, one hop away, which is exactly the kind
of indirection an agent skips. `syscall.WaitStatus` (from
`exitErr.Sys().(syscall.WaitStatus)`, Unix-only) is the only way to recover
*why*: `Signaled() bool` and `Signal() Signal`.

Verified (`sigterm/parent` vs `sigterm/badparent`, child self-kills with
`syscall.Kill(os.Getpid(), syscall.SIGTERM)`):

- Trusting `exitErr.ExitCode()` directly and passing it to `os.Exit`:
  **255** (the int8 truncation of `-1`).
- Checking `WaitStatus.Signaled()` first and computing `128 +
  int(ws.Signal())`: **143** — the correct mirror of Rust's EXIT-05
  (`128 + status.signal()`).

This is the same class of bug EXIT-05 names for Rust
(`.unwrap()`/`.unwrap_or(n)` on `ExitStatus::code()`), just via a different
API shape: Go's footgun is not a panic, it is a silent wrong number (255
instead of 143), which is strictly worse for scripting (`if [ $? -eq 143
]` silently never matches).

### 7. SIGINT/SIGTERM: `NotifyContext`'s cause is a string, not a typed signal

`NotifyContext`'s own doc, and the Go 1.26 release notes, both promise
context: "now cancels the returned context with
`context.CancelCauseFunc` and an error indicating which signal was
received" ([go.dev/doc/go1.26](https://go.dev/doc/go1.26)); `NotifyContext`
itself: "calling `context.Cause` on it will return an error describing the
signal" ([pkg.go.dev/os/signal](https://pkg.go.dev/os/signal)). Reading that
as "a typed accessor for the signal exists" is the natural but wrong
inference — the concrete cause type is `os/signal`'s unexported
`signalError string`
(`src/os/signal/signal.go:306,352-361`, go1.27.1 source read directly):

```go
type signalError string
func (s signalError) Error() string { return string(s) }
func (s signalError) Is(target error) bool { return target == context.Canceled }
```

`context.Cause(ctx).Error()` returns exactly `s.String() + " signal
received"` — for SIGINT, `"interrupt signal received"`; for SIGTERM,
`"terminated signal received"` (verified in the `ctrlc` fixture). There is
no `Signal() os.Signal` method, no wrapped `syscall.Signal`, nothing
`errors.As`-able beyond `context.Canceled` itself. Two working ways to
still get 130/143, both verified:

1. **String-match the cause** (`ctrlc/main.go`): `strings.HasPrefix(cause.Error(), syscall.SIGINT.String())`. Confirmed: SIGINT → exit 130, SIGTERM → exit 143. Fragile — the string is not part of any documented contract and could change wording across releases.
2. **Skip `NotifyContext` for this purpose** (`ctrlc/typed/main.go`): a plain `signal.Notify(ch, sigs...)` channel receive hands back the concrete `os.Signal`; `sig.(syscall.Signal)` casts it to an int directly. Confirmed identical exit codes (130/143), no string parsing. This is the recommended shape — `NotifyContext` is still useful for *propagating* cancellation into subsystems via `ctx.Done()`, but the exit-status derivation should come from a typed `Notify` channel, not from parsing `context.Cause`.

Windows: `os.Process.Signal`'s Windows implementation only special-cases
`sig == os.Kill` (`TerminateProcess`); everything else, including
`syscall.SIGTERM`, returns `syscall.EWINDOWS`
(`src/os/exec_windows.go:55-77`, go1.27.1 source read directly — "TODO(rsc):
Handle Interrupt too?" is still the comment on the fallback branch). This
means a fleet CLI can `signal.Notify`/`NotifyContext` for `os.Interrupt` in
its *own* process cross-platform (Windows delivers Ctrl-C/Ctrl-Break
through the console layer to the same `os.Interrupt` value), but cannot
send a graceful SIGTERM to a *child* process on Windows — `cmd.Process.Kill()`
(hard-kill) is the only portable option there, which is a real behavioural
gap, not a naming difference, from the Unix path this file's fixtures
exercise.

### 8. Idempotent re-run: a write discipline, not an exit-code question

M-F-16 has no numbered mirror in `rules/rust-quality/cli-contract.md` — the
closest kin is the atomic-write shape implied by
`rust-quality/durable-state.md` (not read in full for this dive; named by
the topic map as the shape M-F-16 partially covers). The mechanism is
language-neutral and Go's stdlib supports it directly: write to a sibling
temp path, `Sync()`, then `os.Rename()` over the destination — POSIX
`rename(2)` is atomic within one filesystem, so a crash before the rename
leaves the destination exactly as it was.

Verified (`idempotent/violation` appends directly to the destination;
`idempotent/fixed` writes-then-renames), each run twice with a simulated
crash (`os.Exit(1)` mid-operation) then a clean retry:

- Direct-append: crash leaves one record written; the retry appends a
  second — **2 duplicate lines** in the final file.
- Write-temp-then-rename: crash leaves the destination file **absent**
  (the old destination is untouched, and in this fixture there was no old
  destination); the retry produces exactly **1 line** — re-running is a
  no-op beyond redoing the same, safe write.

`containerd/containerd`'s `content.Writer` documents the same contract at
SDK scale: `Commit(ctx, size, expected digest.Digest, opts ...Opt) error`
where "size and expected can be zero-value when unknown... Commit always
closes the writer, even on error. `ErrAlreadyExists` aborts the writer," and
`WriterOpts.Ref` keys a concurrent-ingest lock so two callers writing the
same digest serialize on one in-progress ingest instead of racing two temp
files (`containerd/containerd@934434dde54b:core/content/content.go`,
[go-topic-map/domain.md](../go-topic-map/domain.md) §12). A fleet CLI's
mutating subcommands (publish, ingest) adopt the same two-phase shape:
write to a content-addressed or `.tmp` location first, commit (rename or a
registry-level PUT) last, and make the commit step itself idempotent
(rename over an existing file, or treat a registry 409/"already exists" as
success) so a crash anywhere before the commit is a safe no-op on retry.

## Normative guidance candidates

1. **Every Go CLI binary defines one `type ExitCode int` mirroring the OCX
   0/1/64–86 table; no other integer reaches `os.Exit`.** *Rationale*:
   mirrors EXIT-01/04/06/08; Go has no closed enum to enforce this at
   compile time. *Verify*: `grep -rn --include='*.go' -e 'os\.Exit(' .`
   in the target repo, then for each hit confirm the argument is either
   `int(someExitCode)` or a call inside `main`'s own two-line tail — a
   literal integer (`os.Exit(3)`) or `os.Exit(1)` outside that tail is a
   finding. Empty *additional* findings beyond the two-line `main` is pass.
   *Run*: **yes** — `grep-check` below, run against this fixture tree,
   clean; planted violation (`os.Exit` inside a non-`main.go` helper)
   flagged it.
2. **`main` is exactly `os.Exit(int(run(args)))` (or equivalent); every
   defer, `signal.Stop`, and buffered flush lives inside `run`, and nothing
   inside `run` calls `os.Exit`.** *Rationale*: `os.Exit`'s own doc —
   deferred functions are not run — mirrors EXIT-02. *Verify*: reading
   heuristic — `main`'s body must be ≤ 3 statements with a single
   `os.Exit` call as its last statement; a lint substitute is `revive`'s
   `unhandled-error`/custom rule, none exact in golangci-lint v2 today.
   *Run*: **yes**, `osexitdefer/violation` (buffered write silently lost,
   exit 0 both ways) vs `osexitdefer/fixed` (write durable) — the same
   exit code on both sides is itself the finding: this rule cannot be
   verified by exit-code testing alone, only by asserting on the *output*
   the deferred code was supposed to produce.
3. **Cobra CLIs wrap every `Args` validator through a helper that turns a
   validation failure into the fleet's typed `UsageError`, and call
   `SetFlagErrorFunc` on the root command with the same wrapper.**
   *Rationale*: mirrors EXIT-03; cobra's own default collapses every error
   class to exit 1, and offers a typed hook for flag-parse errors only.
   *Verify*: `grep -rn --include='*.go' -e 'SetFlagErrorFunc' -e 'cobra\.ExactArgs' -e 'cobra\.MinimumNArgs' -e 'cobra\.RangeArgs' .` — every `cobra.ExactArgs`/`MinimumNArgs`/`RangeArgs`
   call site must be wrapped (not passed to `Args:` bare); absence of a
   `SetFlagErrorFunc` call anywhere in the same binary alongside any of
   those is a finding. *Run*: **yes** — `cobra64/violation` (bare wiring)
   exits 1 on both `--bogus-flag` and a missing positional arg;
   `cobra64/fixed` (wrapped) exits 64 on both, 0 on the happy path.
4. **A CLI that customizes the root command's `Args` field must not use an
   arbitrary-accepting validator (`cobra.ArbitraryArgs`) without also
   re-checking the first positional token against known subcommand names.**
   *Rationale*: cobra's own unknown-subcommand detection (`legacyArgs`) is
   skipped whenever `Args` is non-nil; silently disabling a usage error is
   worse than not adding the custom validator at all. *Verify*: reading
   heuristic — any root command with `Args: cobra.ArbitraryArgs` (or
   equivalent) needs an accompanying comment or test asserting a mistyped
   subcommand still exits 64. *Run*: no — reading heuristic only (the
   cobra source lines are read and confirmed above; a fixture demonstrating
   the *silent* failure mode was judged lower value than the four already
   built for this row).
5. **`syscall.SIGPIPE` is registered with `signal.Notify` (or `Ignore`)
   early in `main`, and exactly one place — the top-level error
   classifier, not any individual write call site — maps `errors.Is(err,
   syscall.EPIPE)` to `Success` (exit 0).** *Rationale*: Go's unhandled
   SIGPIPE default kills the process (exit 141), which is the opposite of
   the pinned CLI-05 clean exit 0; a per-call-site check produces
   inconsistent results depending on which write hit the broken pipe
   first. *Verify*: `grep -rn --include='*.go' -e 'syscall\.SIGPIPE' .`
   must show at least one `Notify`/`Ignore` registration; separately,
   `grep -rn --include='*.go' -e 'syscall\.EPIPE' .` outside the single
   classifier function is a finding (ad hoc handling). *Run*: **yes** —
   all four `sigpipe/*` fixtures piped to `head -1`: default 141, naive-
   Notify 1, Ignore-without-check 2 (panic), central-classifier 0.
6. **A CLI never calls `exitErr.ExitCode()` on an `*exec.ExitError` (or
   passes it to `os.Exit`) without first checking
   `exitErr.Sys().(syscall.WaitStatus).Signaled()`; a signaled child maps
   to `128 + int(ws.Signal())`.** *Rationale*: mirrors EXIT-05;
   `ProcessState.ExitCode()` returns -1 on a signal death, which
   `os.Exit` truncates to 255 — a silent wrong number, not a crash.
   *Verify*: `grep -rn --include='*.go' -e '\.ExitCode()' .` — every hit on
   an `*exec.ExitError` (not the CLI's own `ExitCode` type) must be
   preceded, in the same function, by a `Sys().(syscall.WaitStatus)`
   assertion; a bare `os.Exit(exitErr.ExitCode())` with no such assertion
   nearby is a finding. This grep is a shape heuristic (it cannot itself
   tell the two `ExitCode()` call kinds apart in every case) — pair with a
   reading pass on hits. *Run*: **yes** — `sigterm/badparent` (bare
   `ExitCode()`) exits 255 on a self-SIGTERM'd child; `sigterm/parent`
   (WaitStatus-checked) exits 143.
7. **Deriving an exit status from `os/signal.NotifyContext`'s
   `context.Cause` requires string-matching the cause, because there is no
   typed signal accessor; prefer a plain `signal.Notify` channel when the
   concrete `os.Signal` value is needed for the exit code, and reserve
   `NotifyContext` for propagating `ctx.Done()` into subsystems.**
   *Rationale*: `signalError` (unexported, `src/os/signal/signal.go:352`)
   exposes only `Error() string`; treating the Go 1.26 release-note
   wording ("an error indicating which signal was received") as a typed
   API is the exact hallucination risk this row exists to close off.
   *Verify*: reading heuristic — any code doing
   `strings.Contains(context.Cause(ctx).Error(), ...)` should carry a
   comment noting the fragility and the version it was verified against;
   prefer grepping for a parallel `signal.Notify(ch, ...)` channel
   alongside any `NotifyContext` call in the same binary. *Run*: **yes**
   — both `ctrlc/main.go` (string-match) and `ctrlc/typed/main.go` (typed
   channel) verified to produce 130 for SIGINT and 143 for SIGTERM.
8. **On any code path that sends a signal to a *child* process for
   graceful shutdown, Windows falls back to `Process.Kill()` (hard-kill,
   no graceful SIGTERM equivalent) and the fallback is an explicit,
   commented branch, not an ignored error.** *Rationale*: `os/exec_windows.go`'s
   `signal()` returns `syscall.EWINDOWS` for anything but `os.Kill`
   (go1.27.1 source, read directly); silently swallowing that error means
   the child is never actually asked to shut down on Windows. *Verify*:
   reading heuristic — any `cmd.Process.Signal(syscall.SIGTERM)` call site
   needs an accompanying `runtime.GOOS == "windows"` branch or a build-tag
   split; `grep -rn --include='*.go' -e 'Process\.Signal' .` finds the
   call sites to check by hand. *Run*: no — confirmed by reading
   `exec_windows.go`'s source directly (cited above); a Windows-hosted
   fixture run was out of scope for this Linux toolchain environment.
9. **Any `switch` over a typed exit-code (or other closed-by-convention)
   enum is checked by golangci-lint's `exhaustive` linter, enabled with no
   `default:` case as the escape hatch for new variants.** *Rationale*:
   substitutes for Rust's compiler-enforced exhaustive match (EXIT-07); Go
   silently compiles a switch that omits a case. *Verify*: `.golangci.yml`
   with `linters: {enable: [exhaustive]}`; `run.sh golangci-lint run .`
   with an explicit directory operand. Empty (`0 issues.`) output is pass.
   *Run*: **yes** — `exhaustiveswitch/violation` (missing `ConfigError`
   case): `exhaustive: 1` issue, exit 1; `exhaustiveswitch/fixed` (every
   case present): `0 issues.`, exit 0.
10. **A mutating subcommand writes to a `.tmp` sibling path, `Sync()`s it,
    then `os.Rename()`s it over the destination — never appends to or
    truncates the destination in place.** *Rationale*: M-F-16; POSIX
    `rename(2)` is atomic within one filesystem, so a crash before the
    rename leaves the destination in its prior (valid) state, making a
    retry idempotent by construction rather than by careful bookkeeping.
    *Verify*: `grep -rn --include='*.go' -e 'os\.OpenFile' -e 'os\.Create' .`
    in a mutating command's package, then read heuristic — for the
    destination path (not a `.tmp`/staging path), the flags must not
    include `O_APPEND` and the write must be followed by `os.Rename`
    somewhere in the same function or a helper it calls before the
    function returns. *Run*: **yes** — `idempotent/violation`
    (direct append, simulated crash then retry): 2 duplicate lines in the
    final file; `idempotent/fixed` (temp-then-rename, same crash+retry):
    1 line, byte-identical to a clean single run.

## Verification runs

All commands run through
`/home/mherwig/.cache/research-lang/go-tools/run.sh` (Go 1.27.1,
golangci-lint 2.14.0) except the plain shell pipes/signals, which need no
Go toolchain wrapper. Fixture root:
`/home/mherwig/.cache/research-lang/go-tools/fixtures/exit-codes-and-signals/`.

**SIGPIPE (sigpipe/{default,notifynaive,ignore,central})**

```
$ go build -o /tmp/sigpipe_default ./sigpipe/default   # (via run.sh go build)
$ bash -c '/tmp/sigpipe_default | head -1; echo PIPESTATUS=${PIPESTATUS[@]}'
0
PIPESTATUS=141 0
```
141 = 128+13 (SIGPIPE). Violation of CLI-05's pinned exit 0.

```
$ bash -c '/tmp/sigpipe_notifynaive | head -1; echo PIPESTATUS=${PIPESTATUS[@]}'
0
write failed: write /dev/stdout: broken pipe
PIPESTATUS=1 0
```
Notify without a central classifier: exit 1, still wrong.

```
$ bash -c '/tmp/sigpipe_ignore | head -1; echo PIPESTATUS=${PIPESTATUS[@]}'
0
panic: write /dev/stdout: broken pipe
...
PIPESTATUS=2 0
```
Ignore without an error check at the write site: exit 2 (Go runtime panic exit), worse than doing nothing.

```
$ bash -c '/tmp/sigpipe_central | head -1; echo PIPESTATUS=${PIPESTATUS[@]}'
0
PIPESTATUS=0 0
```
Notify + one central `errors.Is(err, syscall.EPIPE)` check: exit 0. Meets CLI-05.

**Cobra exit 64 (cobra64/{violation,fixed})**

```
$ /tmp/cobra64_violation --bogus-flag; echo "exit=$?"
Error: unknown flag: --bogus-flag
...
exit=1
$ /tmp/cobra64_violation; echo "exit=$?"      # ExactArgs(1), 0 args given
Error: accepts 1 arg(s), received 0
...
exit=1
```

```
$ /tmp/cobra64_fixed --bogus-flag; echo "exit=$?"
exit=64
$ /tmp/cobra64_fixed; echo "exit=$?"
exit=64
$ /tmp/cobra64_fixed hello; echo "exit=$?"
ok: hello
exit=0
```

**Child signal status (sigterm/{parent,badparent}, sigterm/child self-kills with SIGTERM)**

```
$ /tmp/sigterm_parent /tmp/sigterm_child; echo "exit=$?"
child killed by signal terminated -> exit 143
exit=143
$ /tmp/sigterm_badparent /tmp/sigterm_child; echo "exit=$?"
exit=255
```

**NotifyContext / signal.Notify (ctrlc/{main,typed})**

```
$ /tmp/ctrlc & pid=$!; sleep 0.3; kill -INT $pid; wait $pid; echo "exit=$?"
waiting for a signal...
cause: interrupt signal received
exiting with 130
exit=130
$ /tmp/ctrlc & pid=$!; sleep 0.3; kill -TERM $pid; wait $pid; echo "exit=$?"
cause: terminated signal received
exiting with 143
exit=143
$ /tmp/ctrlc_typed & pid=$!; sleep 0.3; kill -INT $pid; wait $pid; echo "exit=$?"
exiting with 130
exit=130
$ /tmp/ctrlc_typed & pid=$!; sleep 0.3; kill -TERM $pid; wait $pid; echo "exit=$?"
exiting with 143
exit=143
```

**os.Exit skipping deferred flush (osexitdefer/{violation,fixed})**

```
$ /tmp/osexit_violation /tmp/oe_v.txt; echo "exit=$?"; cat /tmp/oe_v.txt
exit=0
[file is empty]
$ /tmp/osexit_fixed /tmp/oe_f.txt; echo "exit=$?"; cat /tmp/oe_f.txt
exit=0
payload
```
Same exit code both times — the bug is invisible to an exit-code test and
visible only in the output.

**exhaustive linter (exhaustiveswitch/{violation,fixed}, each its own
package + `.golangci.yml` enabling only `exhaustive`)**

```
$ (cd exhaustiveswitch/violation && golangci-lint run .)
violation.go:20:2: missing cases in switch of type exhaustiveswitch.ExitCode: exhaustiveswitch.ConfigError (exhaustive)
1 issues:
* exhaustive: 1
exit=1
$ (cd exhaustiveswitch/fixed && golangci-lint run .)
0 issues.
exit=0
```

**Idempotent re-run (idempotent/{violation,fixed}, `crash` arg simulates a
mid-operation `os.Exit(1)`)**

```
$ /tmp/idem_violation /tmp/idem_v.txt crash; echo "exit=$?"   # exit=1
$ /tmp/idem_violation /tmp/idem_v.txt; echo "exit=$?"          # exit=0 (retry)
$ cat /tmp/idem_v.txt
record-v1
record-v1
```
2 lines — the retry duplicated the record.

```
$ /tmp/idem_fixed /tmp/idem_f.txt crash; echo "exit=$?"        # exit=1
$ ls /tmp/idem_f.txt                                            # absent — pre-rename crash, destination untouched
$ /tmp/idem_fixed /tmp/idem_f.txt; echo "exit=$?"               # exit=0 (retry)
$ cat /tmp/idem_f.txt
record-v1
```
1 line — the retry reproduced the same, safe result.

**grep shape check for bare `os.Exit` outside `main.go`** (normative
candidate 1; directory operand `.`, `-r` implied by `find … -print0 | xargs
-r -0 grep -l`, no `**`, no command substitution)

```
$ find . -name '*.go' -not -name '*_test.go' -print0 \
    | xargs -r -0 grep -l -e 'os\.Exit(' \
    | grep -v -e '/main\.go$' -e '^main\.go$'
[empty output]
```
Empty output = pass, run against the fixture tree as it stands (every
`os.Exit` call site here is in a file literally named `main.go`). Planted
violation: added `exitgrepcheck/helper.go` containing `func Bail() {
os.Exit(1) }` (not named `main.go`) — the same command then printed
`./exitgrepcheck/helper.go`, correctly flagging it; the file was removed
afterward and is not part of the fixture tree.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| Two-line `main` + testable `run` (#2) | `cli/cli@9b031151a825:cmd/gh/main.go` (2 lines, `os.Exit(int(code))`); `aquasecurity/trivy@ae561f8cca36:pkg/types/error.go:11,20`'s typed `ExitError`/`UserError` implies the same dispatch-then-exit shape | 644 `os.Exit`/`log.Fatal*` call sites outside `main` corpus-wide ([go-audit/exemplar-code-shape.md](../go-audit/exemplar-code-shape.md) §4, cited at [go-topic-map.md](../go-topic-map.md) conflict 8) — most of these are services (shape C), not CLIs, but every one is a candidate for this rule's grep if the repo also ships a CLI entrypoint |
| Ordered classification, own numbers (#3, finding 3) | `cli/cli@9b031151a825:internal/ghcmd/cmd.go:187-212` (the mechanism); `trivy`'s typed error hierarchy (the data shape) | None of the 35 exemplars use a sysexits-aligned 64–99 range; this is a fleet-specific decision with no exemplar precedent to check against |
| Cobra usage-error wiring (#3, #4) | None of the 14 direct-cobra exemplars ([go-topic-map.md](../go-topic-map.md) row M-F-12: cobra 14/35, pflag 9/35) were found using `SetFlagErrorFunc` in this dive's spot-reads of `cli/cli` and `bazel-contrib/rules_go`'s cobra-based tooling — this is corpus-wide *uncovered* practice, not a contradiction, matching the topic map's `uncovered` coverage tag for M-F-12 | — |
| SIGPIPE central classifier (#5) | None spot-read; `restic/restic@5127c4abf921` and `etcd-io/etcd@7583cc6e7e27` use plain `signal.Notify` for their broader signal handling ([go-audit/exemplar-runtime-posture.md](../go-audit/exemplar-runtime-posture.md) §2), which is the same primitive this rule's fix depends on, but SIGPIPE specifically was not in either spot-read's registered signal set | `NotifyContext` (17) vs plain `Notify` (71) corpus-wide — the older, non-context API remains 4x more common ([go-audit/exemplar-runtime-posture.md](../go-audit/exemplar-runtime-posture.md) §2), so a rule assuming `NotifyContext` as the only pattern would miss most real signal-handling code |
| Child `WaitStatus` mapping (#6) | `cli/cli`'s `ExternalCommandExitError` passthrough (`errors.AsType[*root.ExternalCommandExitError](err)` → `exitCode(extError.ExitCode())`, [go-topic-map/domain.md](../go-topic-map/domain.md) §5) passes a child's *own* `ExitCode()` through — it does not itself demonstrate the `WaitStatus.Signaled()` check this rule requires, so it is a partial, not a full, precedent | No exemplar spot-read in this dive demonstrated the signal-aware `128+N` mapping directly; this is genuinely novel wiring for the fleet, mirrored 1:1 from `rules/rust-quality/cli-contract.md` EXIT-05 |
| `exhaustive` linter on a typed exit code (#9) | golangci-lint v2's own bundled `exhaustive` analyzer exists and is enabled by the fixture's `.golangci.yml`; no exemplar was checked for enabling `exhaustive` specifically in this dive (out of scope — [go-audit/exemplar-quality-gates.md](../go-audit/exemplar-quality-gates.md) headline lists the corpus's 17-linter consensus set without breaking out `exhaustive` by name) | — |
| Idempotent write-then-rename (#10) | `containerd/containerd@934434dde54b:core/content/content.go`'s `Writer.Commit` + ref-scoped ingest lock (cited in [go-topic-map/domain.md](../go-topic-map/domain.md) §12); `google/renameio` exists in the ecosystem specifically for this pattern ([go-topic-map/domain.md](../go-topic-map/domain.md) §18, not read in full for this dive) | — |

## AI-agent angle

1. **Assuming cobra assigns 64 to usage errors by default.** An agent
   writing a cobra CLI from memory routinely writes `os.Exit(1)` after
   `Execute()` and separately assumes "cobra handles the exit code
   correctly" for bad flags — it does not; both paths are 1 unless wired.
   *Smallest check*: the grep in normative candidate 3 (`SetFlagErrorFunc`
   present alongside every `cobra.ExactArgs`/`MinimumNArgs` use).
2. **Trusting `exec.ExitError.ExitCode()` unconditionally.** This is the
   single highest-value catch in this dive: the bug produces a *plausible,
   silently wrong* number (255) rather than a crash, so it survives casual
   testing (only a signal-killed child, not a normally-failing one,
   triggers it) and code review unless the reviewer knows to ask "what if
   the child was killed by a signal?" *Smallest check*: normative
   candidate 6's grep plus the two fixtures' side-by-side 255-vs-143 exit
   codes as a talking point in review.
3. **Inventing a `Signal() os.Signal` accessor on `context.Cause(ctx)`
   after `NotifyContext`.** The Go 1.26 release-note wording ("an error
   indicating which signal was received") reads exactly like a typed API
   promise; this file's author made this exact mistake while drafting the
   first version of the `ctrlc` fixture (see finding 7) before reading
   `src/os/signal/signal.go` directly and discovering `signalError` exposes
   only `Error() string`. *Smallest check*: `go doc os/signal.NotifyContext`
   or a direct read of `signal.go` before trusting any accessor beyond
   `Error()`/`errors.Is(cause, context.Canceled)` on the cause value.
2b. **Calling `os.Exit` from inside a helper function "to fail fast."**
   Reads as harmless because the exit code is often still correct — the
   bug is lost deferred cleanup (an unflushed write, an un-released lock,
   an un-restored terminal mode), which no exit-code test catches.
   *Smallest check*: normative candidate 2's structural rule (`main`'s body
   is the only place `os.Exit` appears) plus an output-content assertion
   in tests, not just an exit-code assertion.
4. **Writing a `switch` over a hand-typed "enum" (`type ExitCode int` +
   `const` block) and trusting the compiler to catch a missing case.** Go
   has no closed sum types; this compiles silently. *Smallest check*: the
   `exhaustive` linter, normative candidate 9 — confirmed to flag exactly
   this shape (verification run above).
5. **`io/ioutil`, `interface{}`, `pkg/errors`, `golang/mock` do not appear
   in this dive's fixtures** (none of them are relevant to exit-code or
   signal mechanics), but an agent asked to "add error handling to a CLI"
   is statistically likely to reach for `github.com/pkg/errors.Wrap`
   out of habit; the fleet's own resolved position (topic map conflict 7)
   is stdlib `errors.Is`/`As`/`AsType` with `%w`, which is what every
   fixture and classifier example in this file uses. *Smallest check*:
   `grep -rn --include='*.go' -e '"github.com/pkg/errors"' .` — any hit is
   a finding for new fleet code.
6. **Appending directly to a mutating command's output/state file "for
   simplicity," reasoning that a crash mid-write is rare enough not to
   matter.** The idempotent-rerun fixture shows the failure mode is not
   rare-and-catastrophic, it is common-and-silent: a normal Ctrl-C or OOM
   kill mid-write, followed by the operator simply re-running the same
   command, duplicates data every time. *Smallest check*: normative
   candidate 10's grep for `O_APPEND`/bare `os.Create` on a destination
   path with no accompanying `os.Rename`.

## Contested / evolving

- **String-matching `NotifyContext`'s cause vs. a typed `Notify` channel**
  (finding 7) is not a settled question in the ecosystem — no exemplar in
  this corpus was found doing either deliberately for exit-code derivation,
  because `NotifyContext`'s cause-with-signal behavior is itself only
  Go 1.26 (August 2026 era); code written before 1.26 has no cause to
  inspect at all. This file's recommendation (prefer a typed `Notify`
  channel for the exit code, keep `NotifyContext` for `ctx.Done()`
  propagation) is this dive's own synthesis, not yet a corpus-measured
  consensus — flag it for revisit once 1.26-native code accumulates in the
  wild.
- **Whether cobra's `Args` wrapping (normative candidate 3/4) should be a
  house helper function shipped in `go-quality`'s support directory, or
  left as a documented pattern each CLI repeats.** The Rust contract ships
  its `ExitCode` enum in a shared library crate "so every sibling binary
  and every test can name it" (`cli-contract.md`, closing note) — the Go
  analogue (a small shared package with `ExitCode`, `UsageError`, and the
  `wrapArgs`/`SetFlagErrorFunc` wiring) is implied but not yet decided by
  this program; it is a natural candidate for the wave-3 SDK-surface dive
  or the `go-quality` authoring pass, not resolved here.
- **`exhaustive`'s default strictness** (whether `-check=switch,map` should
  be the house default, or `switch`-only as this dive's fixture used) is
  unmeasured against the corpus for CLI-shaped code specifically; the
  broader gates dive ([go-audit/exemplar-quality-gates.md](../go-audit/exemplar-quality-gates.md))
  did not break `exhaustive` out by name, so its corpus-wide adoption rate
  and false-positive rate on map literals are open questions for whoever
  authors the `go-quality` linter-config row.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [pkg.go.dev/os/signal](https://pkg.go.dev/os/signal) | Stdlib package doc | go1.27.1, fetched 2026-09-26 | The SIGPIPE section, `Notify`/`Ignore`/`NotifyContext` signatures and the cause-propagation note, read directly (finding 5, 7) |
| [pkg.go.dev/os#Exit](https://pkg.go.dev/os#Exit) | Stdlib function doc | go1.27.1, fetched 2026-09-26 | The exact "deferred functions are not run" wording behind the two-line-`main` rule (finding 2) |
| [pkg.go.dev/os#ProcessState.ExitCode](https://pkg.go.dev/os#ProcessState.ExitCode) | Stdlib method doc | go1.27.1, fetched 2026-09-26 | The exact "-1 ... terminated by a signal" wording behind finding 6 |
| [pkg.go.dev/errors#AsType](https://pkg.go.dev/errors#AsType) | Stdlib function doc | Added go1.26.0, fetched 2026-09-26 | Confirms the generic signature `AsType[E error](err error) (E, bool)` used in `gh`'s classifier and this file's own example |
| [go.dev/doc/go1.26](https://go.dev/doc/go1.26) | Official release notes | Released 2026 (pre-1.27), fetched 2026-09-26 | Primary source for `NotifyContext`'s new cause behavior and `errors.AsType` — read to catch the gap between what it promises and what the type actually exposes (finding 7) |
| `src/os/signal/signal.go` (go1.27.1, read via local GOROOT) | Stdlib source | go1.27.1, read 2026-09-26 | The unexported `signalError` type — the ground truth behind finding 7's "no typed accessor" claim |
| `src/os/exec_windows.go` (go1.27.1, read via local GOROOT) | Stdlib source | go1.27.1, read 2026-09-26 | `Process.signal()`'s `syscall.EWINDOWS` fallback for every signal but `os.Kill` — the Windows-child-SIGTERM gap (finding 7, candidate 8) |
| [`spf13/cobra` `command.go`](https://raw.githubusercontent.com/spf13/cobra/main/command.go) | Library source, fetched via raw GitHub | main branch, fetched 2026-09-26; exemplar pinned at `adbc8813901b` | `Execute`/`ExecuteC`'s lack of `os.Exit`, `SetFlagErrorFunc`, `FlagErrorFunc`, and the `ParseFlags` call site (finding 4) |
| [`spf13/cobra` `args.go`](https://raw.githubusercontent.com/spf13/cobra/main/args.go) | Library source, fetched via raw GitHub | main branch, fetched 2026-09-26 | `legacyArgs`'s `commandFound.Args == nil` gate — the unknown-subcommand detection footgun (finding 4, candidate 4) |
| [`spf13/cobra` user guide](https://raw.githubusercontent.com/spf13/cobra/main/site/content/user_guide.md) | Official docs, fetched via raw GitHub | fetched 2026-09-26 | `SilenceErrors`/`SilenceUsage` semantics in prose |
| [`urfave/cli` v3 getting-started](https://raw.githubusercontent.com/urfave/cli/main/docs/v3/getting-started.md) | Official docs | v3 docs, fetched 2026-09-26; exemplar pinned at `d1d810845dbc` | v3's context-first `Action` signature and the "no automatic `os.Exit`" default |
| [`urfave/cli` v3 exit-codes example](https://raw.githubusercontent.com/urfave/cli/main/docs/v3/examples/exit-codes.md) | Official docs | v3 docs, fetched 2026-09-26 | The exact "exit code will 'fall through' to being 0" wording and `cli.Exit`/`ExitCoder` shape (finding 4) |
| [`nishanths/exhaustive` README](https://raw.githubusercontent.com/nishanths/exhaustive/master/README.md) | Tool docs, fetched via raw GitHub | fetched 2026-09-26; golangci-lint v2.14.0 bundles it | Confirms the `-check=switch,map` flag and the exact diagnostic wording matched by the verified fixture output |
| [OpenBSD `sysexits` man page](https://man.openbsd.org/sysexits) | Reference man page | fetched 2026-09-26 | The canonical EX_* numeric table the fleet's `ExitCode` mirrors 64–78 from |
| [clig.dev](https://clig.dev/) | Community CLI guidelines | fetched 2026-09-26 | "Return zero exit code on success... map the non-zero exit codes to the most important failure modes"; the Ctrl-C-exits-fast guidance behind the signal-handling framing |
| `cli/cli` `internal/ghcmd/cmd.go` and `cmd/gh/main.go` (fetched via raw GitHub from `trunk`) | Real-world CLI source | fetched 2026-09-26; exemplar pinned at `9b031151a825` | The two-line `main`, the numeric taxonomy (`exitOK`/`exitError`/...), and the ordered `errors.Is`/`errors.AsType` dispatch chain (finding 3, 4) |
| `/home/mherwig/dev/ocx/crates/ocx_exit/src/exit_code.rs:1-113` | The fleet's own pinned Rust exit table | read 2026-09-26 | The exact numbers and doc comments the Go `ExitCode` ports 1:1 (finding 1) |
| `rules/rust-quality/cli-contract.md` | The fleet's pinned Rust CLI contract | read in full 2026-09-26 | EXIT-01..11 and CLI-01..16, the rule IDs every candidate in this file cross-references |
| [go-audit/config-inventory.md](../go-audit/config-inventory.md) §4 | Wave-1 audit, this program | 2026-09-26 | The row-by-row EXIT/CLI classification (neutral / Rust-specific-mechanism / inverted) this dive builds directly on, especially its CLI-05 and EXIT-07 calls |
| [go-topic-map/domain.md](../go-topic-map/domain.md) §1, §3, §5, §7, §12 | Wave-1 scout, this program | 2026-09-26 | Prior reads of cobra, urfave, `gh`, `os/exec`/`os/signal`, and containerd that this dive re-verified at source and extended (fixtures, exit codes, Windows signal gap) |
