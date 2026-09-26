---
title: Go topic map — fleet-shaped domain (CLIs over OCI/content-addressed stores, SDKs wrapping a CLI)
corpus: fleet-shaped domain — CLI construction, OCI/registry clients, content-addressed on-disk stores, os/exec wrapping, HTTP hygiene, SDK API design
agent: go-topic-map/domain scout
model: sonnet
date_researched: 2026-09-26
sources_count: 24
scope: |
  Covers what the fleet would actually write if it shipped Go: a CLI (cobra/pflag
  or urfave/cli v3) that talks to an OCI registry and manages a content-addressed
  store on disk, plus a thin SDK wrapping that CLI (mirroring ocx-sdk-python).
  Grounded against 6 exemplar repos read at source level (google/go-containerregistry,
  oras-project/oras-go, regclient/regclient, containerd/containerd, spf13/cobra,
  charmbracelet/bubbletea) plus golang/go stdlib source and go.dev release notes,
  cross-checked against the Rust fleet contracts in /home/mherwig/dev/ocx and the
  sibling rust-quality/python-quality lore sets. Does NOT cover: the Go language
  itself, generic linting/testing/toolchain topics (other scouts' territory), or
  Kubernetes-style controller/operator patterns (out of this corpus's shape).
---

# Go topic map — fleet-shaped domain

## Table of contents

1. [Summary](#summary)
2. [Survey](#survey)
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Sources](#sources)

## Summary

- The fleet already has a **pinned, cross-language exit-code table** (0/1/64–82,
  extended to 86 by `ocx`) in `rust-quality/cli-contract.md` and
  `python-quality/cli-contract.md`. A Go rule's job is the **mechanism**
  (a `Main() int`/`ExitCode` type + a two-line `main`), not new numbers.
- Go's default `SIGPIPE` behavior already gives Rust's `CLI-05` guarantee for
  free: a write to a broken pipe on fd 1/2 kills the process, *unless* the
  program calls `signal.Notify` for a signal set that happens to include
  `SIGPIPE`, which silently switches every stdout/stderr write to return
  `syscall.EPIPE` instead of exiting (`os/signal` package doc, `# SIGPIPE`).
- `os/signal.NotifyContext` changed in Go 1.26: the context it cancels now
  carries a `context.CancelCauseFunc`, so `context.Cause(ctx)` names the
  signal that triggered shutdown — this did not exist before 1.26.
- `errors.AsType` (Go 1.26) is already in production use for exit-code
  dispatch: `cli/cli`'s `internal/ghcmd/cmd.go` classifies a Cobra error into
  one of 5 exit codes (`exitOK=0, exitError=1, exitCancel=2, exitAuth=4,
  exitPending=8`) via a chain of `errors.Is`/`errors.AsType` checks, ending in
  a fallback that passes through an extension's *real* child exit code.
- Streaming digest verification across this ecosystem shares one footgun:
  both `go-containerregistry`'s `verify.ReadCloser` and `go-digest`'s
  `Verifier` interface only check the hash **when the caller reaches EOF**
  (or calls `Verified()`) — a caller that reads a prefix and stops verifies
  nothing, silently.
- `oras-go` v2's `content/file.Store.pushFile` writes content **directly to
  the final path** (`os.Create(target)`), not via same-directory temp+rename;
  on a mid-write digest-verification failure it cleans up with `os.Remove`.
  This is the opposite of the Rust fleet's staged-rename pattern
  (`ocx_util/fs/symlink.rs`) and means a concurrent reader can observe a
  partially-written file at its final, "real" path.
- `regclient`'s `Retry-After` handling (`internal/reghttp/http.go:693-703`,
  `internal/retryable/retryable.go:250-251`) only parses the delay-seconds
  form (`time.ParseDuration(header + "s")`); an HTTP-date value (valid per
  RFC 9110) fails to parse, the error is discarded, and the code silently
  falls back to a fixed backoff-count limit instead of honoring the server's
  requested delay.
- `google/renameio` — the community's answer to atomic file writes — refuses
  to export **any** function on Windows, because there is no reliable atomic
  rename there; the Rust fleet's `ocx_util/fs/symlink.rs` instead implements
  a bounded remove-then-rename retry loop for the same platform gap. A Go
  content store needs one or the other, not silence.
- `os.Root` (Go 1.24+) is traversal-safe for symlinks inside the root, but
  its own doc comment lists what it does *not* stop: filesystem-boundary
  crossing, Linux bind mounts, `/proc` special files, Unix device files; and
  on `GOOS=js` it is explicitly TOCTOU-vulnerable.
- `go-containerregistry`'s `remote` package ships concrete, load-bearing HTTP
  defaults worth citing exactly: retry 3 steps, 1s→3s backoff (factor 3.0,
  jitter 0.1), retried status codes `408, 429, 500, 502, 503, 504, 499, 522`,
  `DefaultTransport` with 30s dial timeout, `MaxIdleConnsPerHost: 50`,
  `defaultJobs = 4`.
- `urfave/cli` v3's `Action` signature changed to
  `func(context.Context, *cli.Command) error` — context is no longer buried
  inside `*cli.Context`; exit codes come from `cli.Exit(msg, code)` (which
  implements `cli.ExitCoder`) or a `cli.MultiError` wrapping one.
- Cobra's error handling is opt-in per command tree: `SilenceUsage` and
  `SilenceErrors` default `false`, so an app that wants "print the error once,
  on stderr, without a usage dump" must set both explicitly on the root
  command — this is not cobra's default behavior.
- `os/exec`'s `Cmd.Cancel`/`Cmd.WaitDelay` (Go 1.20) replaced hand-rolled
  timeout-then-`Process.Kill()` code; `exec.ErrDot`/`GODEBUG=execerrdot`
  (Go 1.19) is the security fix that stops `exec.Command("tool")` from ever
  silently resolving to `./tool`.
- The current `os/exec` source (bundled with the local Go 1.27.1 toolchain)
  carries an undocumented (no go.dev release-note mention found)
  `GODEBUG=execwait=2` finalizer that warns on a leaked, never-`Wait`ed
  `*exec.Cmd` — the process-handle analogue of a goroutine leak detector.
- `containerd`'s `content.Writer` interface documents resumable-ingest
  semantics precisely: `Commit` always closes the writer even on error,
  `size`/`expected` may be zero when unknown, and `ErrAlreadyExists` aborts
  the writer — a concrete contract for a Go SDK's own ingest API to match or
  diverge from deliberately.
- OCI's own spec text (`image-spec/descriptor.md`) states an ordering
  requirement worth enforcing in code review: verify **size before**
  computing the hash, "to reduce hash collision space" — hashing first and
  rejecting on size mismatch afterward wastes CPU on content already known
  to be wrong.
- A real, CVE-adjacent precedent exists for terminal-escape injection in a Go
  CLI: `oh-my-posh`'s `GHSA-fwjx-9p69-h25h` (unsanitized prompt-segment data
  reaching the terminal, enabling OSC 8/52 and CSI cursor-move injection,
  CWE-150) — this is not a theoretical topic for this corpus's shape (tools
  that print registry-supplied strings).
- `bubbletea`'s `ProgramOption` set (`WithoutSignalHandler`, `WithoutSignals`,
  `WithContext`) exists specifically so an outer CLI that already owns
  `signal.NotifyContext` doesn't fight the TUI's own signal handling — a
  direct Go analogue of the Rust fleet's `tui.md` "three doors terminal
  restore has to close."

## Survey

### 1. spf13/cobra — user guide and `Command` source

[User Guide](https://raw.githubusercontent.com/spf13/cobra/main/site/content/user_guide.md),
[`command.go`](https://raw.githubusercontent.com/spf13/cobra/main/command.go)
(exemplar: `spf13__cobra@adbc881`).

Error handling is opt-in: `RunE` (not `Run`) returns an `error` to
`Execute`/`ExecuteC`. `SilenceErrors` ("quiet errors downstream") and
`SilenceUsage` ("silence usage when an error occurs") both default `false`;
`command.go:235-239`. `ExecuteContext(ctx)` / `ExecuteContextC(ctx)` set the
context Cobra threads through `cmd.Context()` in every `RunE`.
`TraverseChildren` parses flags on all parent commands before dispatching to a
child. Positional-argument validation is a `PositionalArgs` function:
`cobra.ExactArgs(n)`, `cobra.MinimumNArgs(n)`, `cobra.OnlyValidArgs` (checked
against `Command.ValidArgs`), composed via `cobra.MatchAll(ExactArgs(2),
OnlyValidArgs)`. `MarkFlagRequired("region")` turns a missing flag into a
usage error automatically.

### 2. spf13/pflag — README

[README](https://raw.githubusercontent.com/spf13/pflag/master/README.md).

Drop-in POSIX/GNU-style replacement for stdlib `flag`; the fact that cobra is
built on it (not stdlib `flag`) is why long/short-flag combining
(`-abc`) and `--flag=value` work in every fleet-shaped Go CLI example seen
elsewhere in this survey.

### 3. urfave/cli v3 — getting-started and exit-codes docs

[`getting-started.md`](https://raw.githubusercontent.com/urfave/cli/main/docs/v3/getting-started.md),
[`examples/exit-codes.md`](https://raw.githubusercontent.com/urfave/cli/main/docs/v3/examples/exit-codes.md)
(exemplar: `urfave__cli@d1d8108`).

`Action` is `func(context.Context, *cli.Command) error` — v3's headline change
over v2 is putting `context.Context` as the literal first parameter instead of
inside `*cli.Context`. `(&cli.Command{}).Run(context.Background(), os.Args)`
does not call `os.Exit` itself: "by default the exit code will 'fall through'
to being 0." An explicit non-zero exit comes from returning an error that
satisfies `cli.ExitCoder` — concretely `cli.Exit("message", 86)` — or a
`cli.MultiError` containing one. The caller's own `main` still does
`if err := cmd.Run(...); err != nil { log.Fatal(err) }`.

### 4. clig.dev — Command Line Interface Guidelines

[clig.dev](https://clig.dev/).

Concrete, quotable rules: "Return zero exit code on success, non-zero on
failure... Map the non-zero exit codes to the most important failure modes."
On color: check three things before adding ANSI color — "stdout or stderr is
not an interactive terminal (a TTY)... check individually," `NO_COLOR` is set
and non-empty, `TERM=dumb`, or an explicit `--no-color` flag; suggests an
app-specific `MYAPP_NO_COLOR` var too. On output: "Send output to stdout...
Anything that is machine readable should [go there]," with human/diagnostic
text on stderr.

### 5. cli/cli (`gh`) — `pkg/cmdutil/errors.go` and `internal/ghcmd/cmd.go`

Read at source (exemplar: `cli__cli@9b03115`, no separate doc — thin here).

`pkg/cmdutil/errors.go` defines the error taxonomy Cobra's `RunE` returns
through: `FlagError` (wraps a flag/argument error and "cause[s] the
application to display the usage message"), and three untyped sentinels —
`SilentError` ("triggers exit code 1 without any error messaging"),
`CancelError` ("signals user-initiated cancellation"), `PendingError`
("nothing failed but something is pending"). `internal/ghcmd/cmd.go:41-49`
defines the numeric taxonomy: `exitOK=0, exitError=1, exitCancel=2,
exitAuth=4, exitPending=8`. `Main()` (called by a 2-line `cmd/gh/main.go`:
`code := ghcmd.Main(); os.Exit(int(code))`) dispatches on the error returned
from `rootCmd.ExecuteContextC(ctx)` through an ordered chain
(`cmd.go:187-212`): `== cmdutil.SilentError` → `exitError`; `==
cmdutil.PendingError` → `exitPending`; `cmdutil.IsUserCancellation(err)` (which
itself checks `errors.Is(err, terminal.InterruptErr)`) → `exitCancel`;
`errors.AsType[*root.AuthError](err)` → `exitAuth`;
`errors.AsType[*iostreams.ErrClosedPagerPipe](err)` → `exitOK` (a closed pager
pipe is not a failure); `errors.AsType[cmdutil.NoResultsError](err)` →
`exitOK`; `errors.AsType[*root.ExternalCommandExitError](err)` →
`exitCode(extError.ExitCode())` — i.e. an extension's or shell alias's *real*
child exit code passes through untouched. Only after all of that does it fall
to generic error printing.

### 6. go.dev — Go 1.25/1.26/1.27 release notes

[Go 1.27](https://go.dev/doc/go1.27), [Go 1.26](https://go.dev/doc/go1.26),
[Go 1.25](https://go.dev/doc/go1.25).

Go 1.26: `errors.AsType` — "a generic version of `As`. It is type-safe,
faster, and, in most cases, easier to use." `os/signal.NotifyContext` — "now
cancels the returned context with `context.CancelCauseFunc` and an error
indicating which signal was received." Go 1.27: `testing/synctest.Sleep`
combines `time.Sleep` and `synctest.Wait`; `unicode` upgraded 15→17;
`GODEBUG` settings the `go` command now recognizes are surfaced in `go.mod`.
Go 1.25: nothing in this survey's surface beyond `B.Loop` inlining fixes.

### 7. golang/go stdlib source — `os/exec`, `os/signal`

Read at source: [`os/exec/exec.go`](https://raw.githubusercontent.com/golang/go/master/src/os/exec/exec.go),
[`os/exec/lp_unix.go`](https://raw.githubusercontent.com/golang/go/master/src/os/exec/lp_unix.go),
[`os/signal/signal.go`](https://raw.githubusercontent.com/golang/go/master/src/os/signal/signal.go),
[`os/signal/doc.go`](https://raw.githubusercontent.com/golang/go/master/src/os/signal/doc.go).
Confirmed against the local toolchain (`go version go1.27.1`).

`Cmd.Cancel func() error` — "must have been created with `CommandContext`,"
called when the context is done; by default set to `Process.Kill`.
`Cmd.WaitDelay time.Duration` bounds time spent waiting on I/O and process
exit after `Cancel` fires or the context is done; `ErrWaitDelay` is returned
if it's hit. `exec.ErrDot`: "as of Go 1.19, this package will not resolve a
program using an implicit or explicit path entry relative to the current
directory" — `LookPath("prog")` will not return `./prog`; disable via
`GODEBUG=execerrdot=0` (temporary opt-out, not permanent). A separate,
undocumented-in-release-notes mechanism: `var execwait = godebug.New("#execwait")`
— with `GODEBUG=execwait=2`, `Command()` captures the caller's stack, and a
`runtime.SetFinalizer` on the `*Cmd` warns to stderr ("GODEBUG=execwait=2
detected a leaked exec.Cmd created by:") if the process was `Start`ed but
never reached `ProcessState != nil` (i.e., never `Wait`ed) before GC.
`os/signal`'s `# SIGPIPE` doc section: writing to a broken pipe on fd 1 or 2
with no `Notify` registered for `SIGPIPE` "will cause the program to exit
with a SIGPIPE signal" — "by default, command line programs will behave like
typical Unix command line programs." Registering `Notify` for `SIGPIPE` (even
incidentally, as part of a broader signal set) changes fd 1/2 writes to
return `syscall.EPIPE` as an ordinary error instead. `NotifyContext`'s doc:
"If a signal causes the returned context to be canceled, calling
[`context.Cause`] on it will return an error describing the signal."

### 8. golang/go stdlib source — `os/root.go`

[`os/root.go`](https://raw.githubusercontent.com/golang/go/master/src/os/root.go).

`OpenRoot`/`OpenInRoot`: "Methods on Root can only access files and
directories beneath a root directory... Methods on Root will follow symbolic
links, but symbolic links may not reference a location outside the root."
Explicit non-guarantees in the same doc comment: "Methods on Root do not
prohibit traversal of filesystem boundaries, Linux bind mounts, `/proc`
special files, or access to Unix device files." Platform divergence: Windows
disallows reserved device names (`NUL`, `COM1`) inside a Root; Unix
`Root.Chmod`/`Chown`/`Chtimes` are "vulnerable to a race condition" if the
target changes from regular file to symlink mid-operation; `GOOS=js` is
"vulnerable to TOCTOU... attacks in symlink validation"; `GOOS=plan9` and
`GOOS=js` "do not track directories across renames" (name-based, not
fd-based). `rootMaxSymlinks = 8`, matching POSIX `SYMLOOP_MAX`'s minimum.

### 9. google/go-containerregistry — README, `remote/options.go`, `internal/verify/verify.go`

[README](https://raw.githubusercontent.com/google/go-containerregistry/main/README.md);
options and verify read at source (exemplar: `google__go-containerregistry@0c8bedb`,
docs thin on option defaults — one of the 3 libraries read at source).

Functional-options shape: `type Option func(*options) error`. `WithAuth` and
`WithAuthFromKeychain` are documented as mutually exclusive ("It is an error
to use both... in the same Option set"). `WithContext`, `WithPlatform`,
`WithJobs` (parallelism), `WithUserAgent`, `WithProgress(chan<- v1.Update)`.
Concrete defaults (`options.go:100-135`): `defaultRetryBackoff = {Duration:
1s, Factor: 3.0, Jitter: 0.1, Steps: 3}`; `defaultRetryStatusCodes =
[408, 429, 500, 502, 503, 504, 499, 522]` (with an inline comment: "429:
OCI distribution-spec rate limit... 499 nginx-specific... 522
Cloudflare-specific"); `defaultRetryPredicate` also matches
`retry.IsTemporary(err)`, `io.ErrUnexpectedEOF`, `io.EOF`, `syscall.EPIPE`,
`syscall.ECONNRESET`, `net.ErrClosed`; `defaultJobs = 4`; `defaultPageSize =
1000` ("ECR returns an error if n > 1000"). `DefaultTransport` sets `Proxy:
http.ProxyFromEnvironment`, dial `Timeout`/`KeepAlive: 30s`,
`ForceAttemptHTTP2: true`, `MaxIdleConns: 100`, `MaxIdleConnsPerHost: 50`,
`IdleConnTimeout: 90s`, `TLSHandshakeTimeout: 10s`. `internal/verify.ReadCloser`
wraps a downloaded blob in `io.TeeReader` (into a `hash.Hash`) then
`io.LimitReader(size)`; the wrapping `verifyReader.Read` only compares the
computed digest against the expected one **when the inner reader returns
`io.EOF`** — a caller that stops reading early gets no verification and no
error.

### 10. oras-project/oras-go v2 — README, `content/file/file.go`, `registry/remote/credentials/`

[README](https://raw.githubusercontent.com/oras-project/oras-go/main/README.md);
`content/file` and `credentials` read at source (exemplar:
`oras-project__oras-go@cb6d6dc`, one of the 3 libraries read at source —
package-level doc is thin, prose docs live in separate `.md` tutorials that
don't cover the on-disk-store internals).

`content.file.Store` (`file.go`) implements a local, OCI-layout-shaped content
store. `pushFile` (`file.go:499-518`): `os.Create(target)` directly at the
final path, then `saveFile` (`ioutil.CopyBuffer` with a verifying `io.Writer`
wrapper) — no temp file, no rename. On failure it removes the target
(`os.Remove`) with an explicit comment: "Do not leave content that failed
verification, or was only partly written, at the target path, where it looks
like a pulled file." `tempFile()` (`file.go:713-714`) uses
`os.CreateTemp("", "oras_file_*")` — the OS default temp directory, not a
sibling of `workingDir` — relevant only to `pushDir`'s gzip staging, not to
the final blob path. `registry/remote/credentials` ships `NewNativeStore`
(wraps a platform `docker-credential-*` helper binary, split
`native_store_{linux,darwin,windows}.go`), `NewFileStore` (plaintext,
`~/.docker/config.json`-shaped), `NewStoreWithFallbacks` (native primary +
file fallback), and `NewStoreFromDocker` (reads the Docker CLI's own config).

### 11. regclient/regclient — README, `internal/reghttp/http.go`, `internal/retryable/retryable.go`

[README](https://raw.githubusercontent.com/regclient/regclient/main/README.md);
retry/backoff internals read at source (exemplar: `regclient__regclient@43d2acb`,
one of the 3 libraries read at source — README documents *features*, not the
retry mechanism's edge cases).

README claims: "Automatic retry, and fallback to a chunked blob push, when
network issues are encountered"; "Automatically import logins from the docker
CLI, and registry certificates from the docker engine"; "Ability to postpone
mirror step when rate limit... is below a threshold" (Docker Hub rate-limit
awareness in `regsync`). At the source level, `backoffSet()`
(`reghttp/http.go:687-715`) reads the `Retry-After` header and does
`time.ParseDuration(ras + "s")` — the delay-seconds form only; a parse error
is discarded (`ra, _ := ...`), and if `ra <= 0` the code falls through to an
unrelated backoff-*count* limit (`ch.backoffCur >= c.retryLimit`) instead of
respecting the header. `internal/retryable/retryable.go:250-251` repeats the
identical pattern in a second call site.

### 12. containerd/containerd — `core/content/content.go`

Read at source (exemplar: `containerd__containerd@934434d`).

`content.Store` composes `Provider` + `Ingester` + `Manager` + `Manager`'s own
`Update`/`Walk`/`Delete`. The `Writer` interface (`io.WriteCloser` plus
`Digest()`, `Commit(ctx, size, expected digest.Digest, opts ...Opt) error`,
`Status()`, `Truncate(size)`) documents its contract inline: "`Commit` commits
the blob (but no roll-back is guaranteed on an error). size and expected can
be zero-value when unknown. Commit always closes the writer, even on error.
`ErrAlreadyExists` aborts the writer." `WriterOpts{Ref string, Desc
ocispec.Descriptor}` — `Ref` is the key a concurrent-ingest lock is keyed on,
so two callers writing the same digest serialize on the same in-progress
ingest rather than racing two temp files. `WithLabels(map[string]string)` is
the mutable-metadata `Opt` for `Manager.Update`'s field-path-scoped partial
update.

### 13. opencontainers/image-spec — `descriptor.md`

[`descriptor.md`](https://raw.githubusercontent.com/opencontainers/image-spec/main/descriptor.md).

Digest grammar (EBNF): `digest ::= algorithm ":" encoded`, `algorithm ::=
algorithm-component (algorithm-separator algorithm-component)*`,
`algorithm-component ::= [a-z0-9]+`, `algorithm-separator ::= [+._-]`,
`encoded ::= [a-zA-Z0-9=_-]+`. "Implementations SHOULD allow digests with
unrecognized algorithms to pass validation if they comply with the above
grammar." Registered algorithms include `sha256` (canonical: "compliant
implementations SHOULD use SHA-256"), `sha512`, and `blake3`. Verification
order, stated explicitly: "Before calculating the digest, the size of the
content SHOULD be verified to reduce hash collision space. Heavy processing
before calculating a hash SHOULD be avoided."

### 14. opencontainers/go-digest — `verifiers.go`

[repo](https://github.com/opencontainers/go-digest); read via vendored copy
(exemplar: `google__go-containerregistry@0c8bedb:vendor/.../go-digest/verifiers.go`).

`Verifier` interface: `io.Writer` + `Verified() bool`. "Users instantiate a
Verifier from one of the various methods, write the data under test to it
then check the result with the `Verified` method" — the same "caller must
finish writing, then remember to check" shape as go-containerregistry's
`verify.ReadCloser`, independently implemented.

### 15. golang.org/x/term — `term.go` (source; README is a stub)

[`term.go`](https://raw.githubusercontent.com/golang/term/master/term.go) —
read at source (README is two lines; this is the third of the 3 libraries
read at source because its doc is thin).

Full public surface: `IsTerminal(fd int) bool`; `MakeRaw(fd int) (*State,
error)`; `GetState(fd int) (*State, error)` — doc note: "may be useful to
restore the terminal after a signal"; `Restore(fd int, oldState *State)
error`; `GetSize(fd int) (width, height int, err error)`; `ReadPassword(fd
int) ([]byte, error)` ("without local echo... commonly used for inputting
passwords").

### 16. mattn/go-isatty — README

[README](https://raw.githubusercontent.com/mattn/go-isatty/master/README.md).

`isatty.IsTerminal(fd)` plus, distinctly, `isatty.IsCygwinTerminal(fd)` — a
second check needed on Windows because a Cygwin/MSYS2 pty doesn't satisfy the
native `IsTerminal` test the way `golang.org/x/term` implements it.

### 17. no-color.org — the NO_COLOR spec

[no-color.org](https://no-color.org/).

The full normative text: "Command-line software which adds ANSI color to its
output by default should check for a `NO_COLOR` environment variable that,
when present and not an empty string (regardless of its value), prevents the
addition of ANSI color." Explicitly a hint to the *software*, not the
terminal: "It is reasonable to configure certain software... to use color...
while still desiring that other software not add color unless configured to."

### 18. google/renameio — README

[README](https://raw.githubusercontent.com/google/renameio/master/README.md).

States the atomic-write subtleties precisely: a naive temp-file-then-rename
gets three things wrong unless handled explicitly — (1) "a remove must not be
attempted if the rename succeeded, as a new file might have been created with
the same name," so a bare `defer os.Remove(t.Name())` is wrong, state must be
tracked; (2) the temp file must be on the *same filesystem* as the target for
`rename` to work, while still respecting `TMPDIR`; (3) `fsync` is required or
`os.Rename` "will [not] result in a 0-length file" being *avoided* after a
crash. v2 changed `WriteFile` to apply the process umask to permissions
(previously ignored) — `IgnoreUmask()` restores v1 behavior. "It is not
possible to reliably write files atomically on Windows... this package does
not export any functions on Windows" (linking
[golang/go#22397](https://github.com/golang/go/issues/22397#issuecomment-498856679)).

### 19. golang/exp — `apidiff` README, `gorelease.go` doc comment

[`apidiff` README](https://raw.githubusercontent.com/golang/exp/master/apidiff/README.md),
[`gorelease.go`](https://raw.githubusercontent.com/golang/exp/master/cmd/gorelease/gorelease.go).

`apidiff` "reports two kinds of changes: incompatible ones, which require
incrementing the major part of the semantic version, and compatible ones,
which require a minor version increment." `gorelease [-base=version]
[-version=version]` compares the checked-out revision against a base version
and "reports whether the changes are consistent with semantic versioning";
for a module at major version ≥ 1, an incompatible change makes it "exit with
a non-zero status" — but for major version 0, incompatible changes are
described without affecting exit status (v0 modules are exempt by design).

### 20. GHSA-fwjx-9p69-h25h — oh-my-posh terminal escape injection

[advisory](https://github.com/JanDeDobbeleer/oh-my-posh/security/advisories/GHSA-fwjx-9p69-h25h).

A real, shipped vulnerability in a Go CLI: unsanitized prompt-segment data
(sourced from things like a git branch name or working-directory path)
reaches the terminal unescaped, enabling OSC 8/52 and CSI cursor-repositioning
injection (CWE-150, improper output neutralization). Directly on-point for
this corpus: any Go CLI that prints a registry-supplied tag, annotation, or
repository name is exposed to the same class of bug.

### 21. charmbracelet/bubbletea — README and `options.go`

[README](https://raw.githubusercontent.com/charmbracelet/bubbletea/main/README.md);
`ProgramOption` set read at source.

`ProgramOption` functions: `WithContext(ctx)`, `WithOutput(io.Writer)`,
`WithInput(io.Reader)`, `WithoutSignalHandler()`, `WithoutCatchPanics()`,
`WithoutSignals()`, `WithoutRenderer()`, `WithFilter(func(Model, Msg) Msg)`,
`WithFPS(int)`, `WithColorProfile(colorprofile.Profile)`,
`WithWindowSize(w, h)`. The existence of `WithoutSignalHandler`/
`WithoutSignals` as opt-outs (rather than bubbletea always owning signals
unconditionally) is the load-bearing fact: an outer CLI that installs its own
`signal.NotifyContext` needs one of these, or the two handlers race on
`SIGINT`/`SIGWINCH`.

### 22. Rust fleet cross-reference — `ocx` and `grimoire` (read-only)

`crates/ocx_exit/src/exit_code.rs` (`/home/mherwig/dev/ocx`) — the pinned
`ExitCode` enum (`Success=0, Failure=1, UsageError=64, DataError=65,
Unavailable=69, IoError=74, TempFail=75, PermissionDenied=77, ConfigError=78,
NotFound=79, AuthError=80, PolicyBlocked=81, DirtyRcBlock=82,
TransparencyLogUnavailable=83, ReferrersUnsupported=84,
UnsupportedKeyBackend=85, ForgeCapabilityUnavailable=86`), documented
`#[non_exhaustive]` and append-only. `crates/ocx_util/src/fs/symlink.rs:172-357`
— staged-temp-link-then-`rename(2)` publish, with a documented bounded
remove-then-rename retry loop for Windows (`rename_replace`,
`rename_race_backoff`). `crates/ocx_util/src/fs/file_lock.rs:1-53` —
`FileLock` wrapping `fs4::FileExt::try_lock`, with an explicit note that
Windows `LockFileEx` locks a byte range on a *specific handle*, so in-place
reads/writes must go through the lock-owning handle. `crates/ocx_store/src/file_structure/temp_store.rs`
— a sibling `.lock` file next to a to-be-renamed temp directory, discovered on
startup via `list_all` to recover orphaned entries. `crates/ocx_oci/src/digest.rs` —
a closed `Algorithm` enum (`Sha256|Sha384|Sha512`) with `hash`/`hash_file`/
`hash_file_read` as the single dispatch point. `rust-quality/cli-contract.md`
— the pinned, cross-fleet exit-code table and the 16 `CLI-01..CLI-16` stream/
color/TTY/secrets rules a Go rule set would need a mechanism-equivalent of.
`rust-quality/durable-state.md`, `platform-and-paths.md`, `tui.md` — existing
depth files for atomic writes/content-store staging, Windows/path handling,
and terminal-restore guarantees, respectively; their *mechanism* sections are
Rust-specific and do not transfer, but their *shape* (what must be guaranteed,
and where agents get it wrong) is exactly what a Go equivalent needs to cover
independently.

## Candidate topics

| Topic | Why it matters | Source | Covered? | Surface | Priority |
|---|---|---|---|---|---|
| Should a Go CLI's exit codes reuse the fleet's pinned sysexits table (0/1/64–86) rather than invent new numbers? | Scripts already branch on these numbers across `ocx`/`grim`; a Go tool with its own scheme breaks cross-tool composition | [rust-quality/cli-contract.md](file:///home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/rust-quality/cli-contract.md) | partial | cli | P0 |
| What is the Go mechanism for "only `main` calls `os.Exit`" (a testable `Main() int`/`ExitCode`, two-line `main`)? | Matches `gh`'s own pattern; calling `os.Exit` deep in a function skips every deferred cleanup (unflushed writers, unclosed locks, unremoved temp files) | [cli/cli `cmd/gh/main.go`](https://github.com/cli/cli) | no | cli | P0 |
| How should an arbitrary error be classified into an exit code exhaustively (chained `errors.Is`/`errors.AsType`, not a type switch with a silent default)? | `gh`'s own dispatch (`SilentError`/`CancelError`/`PendingError`/`*AuthError`/`*ExternalCommandExitError`) is the concrete, working reference shape | [`internal/ghcmd/cmd.go`](https://github.com/cli/cli) | no | errors | P0 |
| Does the fleet's Go code need to do anything for SIGPIPE, or does the runtime's default already give the Rust `CLI-05` guarantee — and what silently breaks it? | Registering `signal.Notify` for a broad signal set that happens to include `SIGPIPE` switches fd 1/2 writes from "process exits" to "returns EPIPE," with no visible change at the call site | [`os/signal` doc, `# SIGPIPE`](https://pkg.go.dev/os/signal) | no | cli | P0 |
| Are `SilenceUsage` and `SilenceErrors` both set on the root Cobra command, and what happens if only one is? | Cobra defaults both to `false`; the common bug is a usage dump on every runtime error, or the error printed twice | [cobra `command.go:235-239`](https://github.com/spf13/cobra) | no | cli | P0 |
| Does a Go OCI client's digest verifier actually check the hash before the caller stops reading, or only at EOF? | `go-containerregistry`'s `verify.ReadCloser` and `go-digest`'s `Verifier` both only compare on EOF/`Verified()` call — an early-return caller gets silent non-verification | [`internal/verify/verify.go`](https://github.com/google/go-containerregistry) | no | security | P0 |
| Does the content-addressed store publish a blob via same-directory temp+rename, or write in place at the final path? | `oras-go` v2's `content/file.Store.pushFile` does the latter (`os.Create(target)` directly); a concurrent reader can observe a partial file at its "real" path | [`content/file/file.go:499-518`](https://github.com/oras-project/oras-go) | partial | fs | P0 |
| Does Retry-After parsing handle both the delay-seconds and HTTP-date forms, or silently no-op on the date form? | `regclient`'s `time.ParseDuration(header+"s")` fails on an HTTP-date value; the error is discarded and the code falls back to a fixed backoff-count limit | [`internal/reghttp/http.go:687-715`](https://github.com/regclient/regclient) | no | http | P0 |
| Is HTTP 429 handled per the OCI distribution-spec's rate-limit semantics, with which concrete retry backoff numbers? | `go-containerregistry` ships load-bearing defaults (3 steps, 1s→3s, factor 3.0, jitter 0.1) with an inline comment tying 429 to distribution-spec | [`remote/options.go:78-101`](https://github.com/google/go-containerregistry) | no | http | P0 |
| What does `exec.ErrDot`/`GODEBUG=execerrdot` protect against, and where would disabling it reintroduce the Go 1.19 vulnerability class? | Any fleet Go binary that shells out to a bare-named helper depends on this by default; flipping the GODEBUG for convenience reopens implicit-`./`-resolution | [`os/exec/exec.go:20-84`](https://github.com/golang/go) | no | security | P0 |
| Does the wrapper extract the child's real exit code via `*exec.ExitError.ExitCode()`, or collapse every failure into a generic 1? | Matches the fleet's own extension-passthrough pattern (`gh`'s `ExternalCommandExitError`); losing the real code breaks scripts that branch on it | [`internal/ghcmd/cmd.go:209-212`](https://github.com/cli/cli) | no | cli | P0 |
| Does every exported SDK method take `context.Context` first and forward cancellation into the wrapped CLI via `exec.CommandContext`? | Matches the fleet's own SDK contract (`ocx-sdk-python`); a call that ignores `ctx` can't be canceled or timed out by its caller | [os/exec source](https://github.com/golang/go) | no | sdk | P0 |
| What are go-containerregistry's exact HTTP client defaults (dial timeout, `MaxIdleConnsPerHost`, `IdleConnTimeout`, `TLSHandshakeTimeout`), and should the fleet's client match or justify a departure? | Concrete, load-bearing numbers from a widely-used registry client; copying them is cheaper and safer than re-deriving | [`remote/options.go:113-125`](https://github.com/google/go-containerregistry) | no | http | P1 |
| Does the fleet's Go store fsync both the written file and its containing directory before/after rename? | `renameio`'s README states the containing-directory fsync is what makes the rename durable across a crash; skipping it is a silent data-loss window | [renameio README](https://github.com/google/renameio) | partial | fs | P1 |
| Does a Go atomic-write helper exist for Windows, or does the fleet need its own remove-then-rename retry loop the way `ocx_util/fs/symlink.rs` does? | `renameio` refuses to export anything on Windows ("not possible to reliably write files atomically"); silence there is not an option for a cross-platform fleet tool | [renameio README](https://github.com/google/renameio) | partial | fs | P1 |
| What does `os.Root` explicitly NOT protect against (bind mounts, `/proc`, device files), and which platforms degrade to name-based (not fd-based) tracking? | Agents will reach for `os.Root` as a traversal-safety silver bullet; its own doc comment lists real gaps, and `GOOS=js`/`plan9` degrade silently | [`os/root.go`](https://github.com/golang/go) | no | fs | P1 |
| What changed in `os/signal.NotifyContext` in Go 1.26 (`context.Cause` now names the signal), and how should a graceful-shutdown handler use it? | Pre-1.26 code that assumed a bare `context.Canceled` on shutdown loses information a 1.26+ handler can recover for free | [Go 1.26 release notes](https://go.dev/doc/go1.26) | no | concurrency | P1 |
| Does `signal.NotifyContext` register `os.Interrupt` alone, or `os.Interrupt, syscall.SIGTERM` — and where does "SIGTERM works the same on Windows" break? | A fleet CLI must run on Windows CI at minimum; `syscall.SIGTERM` is not a real signal there | [`os/signal` source](https://github.com/golang/go) | no | cli | P1 |
| Is there a leaked-subprocess detector available for free (`GODEBUG=execwait=2`), and should CI enable it? | Confirmed present in the local Go 1.27.1 stdlib but absent from any go.dev release note found — genuinely under-documented, high-value for catching a goroutine that `Start()`s a helper and forgets to `Wait()` | [`os/exec/exec.go:341,391,420-450`](https://github.com/golang/go) | no | concurrency | P1 |
| What is `Cmd.Cancel`/`Cmd.WaitDelay` (Go 1.20), and does the fleet's subprocess wrapper use them instead of a hand-rolled timeout+`Process.Kill()`? | Replaces a whole class of racy hand-rolled timeout code with a stdlib-guaranteed bound and a distinguishable `ErrWaitDelay` | [`os/exec/exec.go:245-300`](https://github.com/golang/go) | no | concurrency | P1 |
| Does the fleet's process wrapper set `SysProcAttr` for a process group (or a Windows job object) so `Cancel` kills grandchildren too? | Without it, `Cancel`/`WaitDelay` only reaches the immediate child; a helper that forks its own children survives | [`os/exec` source](https://github.com/golang/go) | no | concurrency | P1 |
| Which functional-options shape should a Go OCX SDK constructor use, and does it enforce mutually-exclusive options (like `WithAuth`/`WithAuthFromKeychain`) at the type level or only at call time? | `go-containerregistry`'s `Option func(*options) error` returns an error from the option itself for exactly this case; a Go SDK mirroring `ocx-sdk-python`'s near-zero-dependency goal needs the same discipline | [`remote/options.go:202-226`](https://github.com/google/go-containerregistry) | no | sdk | P1 |
| Is `gorelease`/`apidiff` run in CI to catch an accidental breaking SDK change before release? | Direct Go analogue of a semver-checker the Rust SDK crates already run; skipping it lets a minor release silently break callers | [`apidiff` README](https://github.com/golang/exp), [`gorelease.go`](https://github.com/golang/exp) | no | release | P1 |
| Does the fleet sanitize a registry-supplied string (tag, annotation, repo name) before printing it, given the documented CWE-150 class of bug? | `oh-my-posh`'s real advisory shows this is not theoretical for a Go CLI that prints untrusted upstream text | [GHSA-fwjx-9p69-h25h](https://github.com/JanDeDobbeleer/oh-my-posh/security/advisories/GHSA-fwjx-9p69-h25h) | no | security | P1 |
| Does TTY detection check stdout and stderr independently (not one shared bool), matching clig.dev's explicit guidance? | "If you're piping stdout... it's still useful to get colors on stderr"; a single shared check disables color everywhere once either stream is redirected | [clig.dev](https://clig.dev/) | no | cli | P1 |
| What exact string/value does `NO_COLOR` require ("present and not an empty string, regardless of its value"), and does the fleet's check match that precisely? | A common bug is checking `NO_COLOR == "1"` or `"true"`, rejecting the spec's own example of `NO_COLOR=` with any non-empty value | [no-color.org](https://no-color.org/) | partial | cli | P1 |
| Should a Go TUI (bubbletea) opt out of its own signal handling (`WithoutSignalHandler`/`WithoutSignals`) when the outer CLI already owns `signal.NotifyContext`? | Two independent signal handlers on the same process race on `SIGINT`; the option exists specifically to prevent this | [bubbletea `options.go`](https://github.com/charmbracelet/bubbletea) | no | cli | P1 |
| What are the concrete platform caveats for `Root.Chmod`/`Chown`/`Chtimes` (a documented TOCTOU race), and does the fleet's code depend on them for anything security-relevant? | The stdlib's own doc comment admits the race exists; treating `os.Root` as a complete sandbox for permission changes is wrong | [`os/root.go`](https://github.com/golang/go) | no | security | P1 |
| Should the fleet standardize on one OCI registry client library (go-containerregistry, oras-go v2, regclient, or containerd's content package), given their different content-store abstractions? | `Store` (containerd) vs `Ingester`/`Manager` vs a flat `Target` interface are not drop-in compatible; picking late means a rewrite | [survey §9–12] | no | sdk | P1 |
| Does the credential layer read Docker's `config.json` and wrap `docker-credential-*` helper binaries, or is a bespoke store acceptable for v1? | `oras-go` v2's `NewStoreWithFallbacks(native, file)` is the ecosystem-standard shape; users expect their existing `docker login` state to just work | [`registry/remote/credentials`](https://github.com/oras-project/oras-go) | no | sdk | P1 |
| Is response-body size bounded (`io.LimitReader`/`http.MaxBytesReader`) before buffering an OCI registry response into memory? | A registry (or a compromised mirror) can send an unbounded or falsely-small `Content-Length`; unbounded buffering is a DoS vector | [`internal/verify/verify.go`](https://github.com/google/go-containerregistry) | no | security | P1 |
| Does the HTTP client's redirect policy (`CheckRedirect`) strip `Authorization` on a cross-host redirect? | `net/http`'s default `CheckRedirect` (nil) forwards headers on same-scheme redirects; a registry redirecting to a CDN host can otherwise leak a bearer token | [frame's own domain description] | no | security | P1 |
| Does `os.CreateTemp("", ...)` ever get used for a file that will later be renamed onto a different filesystem, breaking atomicity? | `oras-go` v2's `pushDir` gzip-staging path does exactly this for a *non-final* file; the same pattern applied to a final blob path would break the same-filesystem rename requirement | [`content/file/file.go:713-714,526-543`](https://github.com/oras-project/oras-go) | no | fs | P1 |
| Does the fleet verify size before computing the hash (per image-spec's stated ordering), or hash first and check size after? | Hashing a known-oversized or truncated blob before checking its length wastes CPU on content already known to fail | [image-spec `descriptor.md`](https://github.com/opencontainers/image-spec) | no | perf | P2 |
| Does the fleet's digest handling accept any spec-valid `algorithm:encoded` string (per the EBNF grammar), or hardcode `sha256` only and reject spec-valid content (e.g. `blake3:...`)? | The grammar explicitly allows unregistered algorithms to validate; a Go type that only recognizes `sha256` rejects conforming input | [image-spec `descriptor.md`](https://github.com/opencontainers/image-spec) | no | lang | P2 |
| Does the fleet's ingest API mirror containerd's `Writer.Commit` contract (size/expected may be zero when unknown, `Commit` always closes, `ErrAlreadyExists` aborts)? | A resumable, concurrency-safe ingest API needs an explicit contract for "what happens on partial commit," not an ad hoc one | [`core/content/content.go:145-166`](https://github.com/containerd/containerd) | no | sdk | P2 |
| Does a concurrent-ingest lock key on the content digest (containerd's `Ref` string), so two goroutines pulling the same layer serialize rather than race two temp files? | Without a shared key, two pulls of the same layer both stage, verify, and rename independently — wasted bandwidth at best, a race at worst | [`core/content/content.go:189-212`](https://github.com/containerd/containerd) | no | concurrency | P2 |
| Should flag/argument parsing use cobra+pflag or urfave/cli v3, given v3's `context.Context`-first `Action` signature vs cobra's `RunE(cmd, args)`? | A real, current API-shape difference between the two most common choices, not a stylistic one | [urfave/cli v3 docs](https://github.com/urfave/cli), [cobra `command.go`](https://github.com/spf13/cobra) | no | cli | P2 |
| What is `cli.Exit(msg, code)`/`cli.ExitCoder`/`cli.MultiError` in urfave/cli v3, and how does a caller extract a per-error exit code the way `gh` does for cobra? | The equivalent mechanism exists in both frameworks under different names; a rule needs to name both | [urfave/cli v3 `exit-codes.md`](https://github.com/urfave/cli) | no | cli | P2 |
| Does positional-argument validation use cobra's composable validators (`MatchAll(ExactArgs(2), OnlyValidArgs)`) instead of hand-rolled `len(args)` checks? | Hand-rolled checks produce inconsistent usage-error text and miss `OnlyValidArgs`-style allow-listing | [cobra `user_guide.md:449-475`](https://github.com/spf13/cobra) | no | cli | P2 |
| Does the fleet ever accept a secret via a flag value or a plain env var, versus stdin/a credential-file path/the credential store? | Flag values land in `ps`/shell history; env vars leak via `/proc` and CI log dumps — the Go analogue of the fleet's `CLI-11` rule | [rust-quality/cli-contract.md CLI-11] | partial | security | P2 |
| Is `golang.org/x/term.ReadPassword` (or an equivalent no-echo read) used for interactive secret entry instead of a plain `bufio.Scanner` read? | A plain scanner echoes the secret to the terminal and to any terminal-recording tool | [`term.go`](https://github.com/golang/term) | no | cli | P2 |
| Does the fleet check `mattn/go-isatty`'s `IsCygwinTerminal` in addition to `IsTerminal`, or only the latter, on Windows? | A Cygwin/MSYS2 pty fails the native Windows TTY check; missing the second check disables interactive prompts/color under a common Windows dev shell | [go-isatty README](https://github.com/mattn/go-isatty) | no | cli | P2 |
| Does map iteration ever leak into user-visible or on-disk output (JSON key order, a generated manifest, a printed diff) without an explicit sort? | Go's map iteration order is intentionally randomized; unsorted output breaks byte-for-byte reproducibility and diff-based tests | [Go spec / general Go knowledge] | no | lang | P2 |
| Is every `Close()` error actually checked, or does a `defer f.Close()` silently swallow a flush failure on a written file? | The single most common resource-cleanup bug in Go; directly relevant to a content store writing blobs to disk | [general Go knowledge, cross-checked against `content/file/file.go`'s `defer fp.Close()` pattern] | no | errors | P2 |
| Does the fleet rely on `time.Time`'s monotonic reading for measuring a duration, and does serializing a `time.Time` (losing the monotonic reading) ever get diffed expecting monotonic behavior? | A `time.Time` round-tripped through JSON drops its monotonic component; subtracting two such values after that point uses wall-clock time, which can go backward | [general Go knowledge] | no | lang | P2 |
| Is an explicit schema-version field present in the store's on-disk metadata format from the start? | Retrofitting a version field after shipping a v1 format requires sniffing field presence to distinguish versions, exactly the ambiguity a version field avoids | [general fleet knowledge, cross-checked against `ocx_store` layout comments] | no | fs | P2 |
| Does a fleet Go binary print anything within ~100ms of starting a network operation, matching the Rust fleet's `CLI-16` responsiveness guidance? | A silent CLI during a slow registry call reads as hung; the Rust rule is explicit and low-severity but easy to port | [rust-quality/cli-contract.md CLI-16] | partial | cli | P3 |
| What is the deprecation timeline for a `GODEBUG` default flip (e.g. `execerrdot`, `tls3des`) before the setting is removed permanently? | Code that relies on a `GODEBUG` opt-out to keep old behavior has a limited, documented shelf life per go.dev's own godebug policy | [Go 1.27 release notes, `GODEBUG` section] | no | toolchain | P3 |
| Does the fleet's Go code ever index a string byte-wise where rune-wise is needed (a registry name or annotation containing multi-byte UTF-8)? | `for i := range s` over bytes vs `for i, r := range s` over runes silently diverge on any non-ASCII content | [general Go knowledge] | no | lang | P3 |
| Are filenames derived from a registry digest or tag sanitized against Windows-reserved device names (`NUL`, `COM1`) before touching the filesystem? | `os.Root`'s own doc calls this out as a Windows-specific rejection case; a Linux-only CI matrix won't catch it | [`os/root.go`](https://github.com/golang/go) | partial | fs | P3 |

## Recent shifts seen in this corpus

- **`errors.AsType` (Go 1.26)** — generic, type-safe replacement for
  `errors.As`; already load-bearing in `cli/cli`'s exit-code dispatch as of
  the exemplar SHA. Older idiom (`var x *T; errors.As(err, &x)`) is not wrong,
  just no longer the terse/fast option — flag pre-1.26 code that avoids it
  only for compatibility with older Go as historical-only once a fleet Go
  binary can require 1.26+.
- **`os/signal.NotifyContext` cancel-cause (Go 1.26)** — the returned context
  now cancels via `context.CancelCauseFunc`; `context.Cause(ctx)` names the
  signal. Any graceful-shutdown code written against pre-1.26 semantics that
  logs a bare "shutting down" without checking the cause is leaving free
  information on the table post-1.26.
- **`GODEBUG=execwait=2` leaked-`Cmd` finalizer** — present in the local Go
  1.27.1 stdlib source; no mention found in the Go 1.25, 1.26, or 1.27 release
  notes text fetched for this survey. Treat as a recent, under-announced
  addition rather than long-standing behavior; verify against a fresh `go
  doc os/exec` on whatever toolchain a rule targets before citing a landing
  version number.
- **`os.Root` / `OpenInRoot` (Go 1.24)** — traversal-safe file access is now a
  stdlib primitive; pre-1.24 code necessarily hand-rolled `filepath.Clean` +
  prefix-check path containment, which the Rust fleet's own
  `platform-and-paths.md` calls out as a closed WONTFIX footgun
  (`Path::join` is never a security boundary) — the Go stdlib now offers a
  real fix where Rust still requires a hand-rolled resolver.
- **`renameio` v2's umask handling** — v1 ignored the process umask on
  `WriteFile`'s permission argument; v2 applies it. Code copied from a v1-era
  example (common in older blog posts and Stack Overflow answers) silently
  changes behavior on upgrade unless `IgnoreUmask()` is added.
- **BLAKE3 as a registered OCI digest algorithm** — present in the current
  `image-spec/descriptor.md` fetched for this survey alongside SHA-256/512;
  older material (pre-dating BLAKE3's registration) that hardcodes "OCI
  digests are always `sha256` or `sha512`" is now incomplete, not just
  imprecise.
- **urfave/cli v3's context-first `Action` signature** — v2's
  `func(*cli.Context) error` became v3's `func(context.Context, *cli.Command)
  error`; any v2-era example code (still common in blog posts) does not
  compile against v3 without a mechanical signature change.

## Contested

- **Same-directory temp+rename vs write-in-place-then-cleanup for a
  content-addressed store.** `oras-go` v2 (`content/file.Store`) writes
  directly to the final path and cleans up on verification failure; the Rust
  fleet's `ocx_util/fs/symlink.rs` and the `renameio` package both insist on
  staged-temp+rename specifically so a partially-written file is never
  observable at its final name. This survey did not find a Go OCI-ecosystem
  library that uses the staged-rename shape for its *content* path (only for
  metadata/index files in some stores) — the field is trending toward
  "rename for indexes and manifests, write-in-place-with-cleanup for large
  blobs," but that trend is inferred from this corpus's limited sample, not
  confirmed by an explicit design doc.
- **Which OCI Go client is "the" standard.** `go-containerregistry`,
  `oras-go` v2, `regclient`, and containerd's own `core/content` package all
  solve overlapping problems with incompatible abstractions (`remote.Image`
  vs `oras.Target` vs `content.Store`). None of the docs read for this survey
  claim consolidation; `regclient`'s README instead lists interoperability
  features (import Docker CLI logins, honor Docker Hub rate limits) that
  suggest the ecosystem expects several clients to coexist rather than
  converge on one.
- **Whether a small Go SDK should depend on any of the above at all**, versus
  wrapping the `ocx`/mirrored-tool CLI directly via `os/exec` the way
  `ocx-sdk-python` wraps `ocx`. The frame's own hypothesis is the latter; this
  survey did not find a documented argument for the former beyond "it saves a
  subprocess" — worth a design decision, not a scout-level resolution.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [spf13/cobra user_guide.md](https://raw.githubusercontent.com/spf13/cobra/main/site/content/user_guide.md) | Tool's own docs | fetched 2026-09-26, `main` branch | RunE/error handling, positional-arg validators, command-tree structure |
| [spf13/cobra command.go](https://raw.githubusercontent.com/spf13/cobra/main/command.go) | Tool's own source | fetched 2026-09-26, `main` branch | `SilenceUsage`/`SilenceErrors`/`ExecuteContext` — not fully covered in the guide |
| [spf13/pflag README](https://raw.githubusercontent.com/spf13/pflag/master/README.md) | Tool's own docs | fetched 2026-09-26 | POSIX/GNU flag syntax cobra depends on |
| [urfave/cli v3 getting-started.md](https://raw.githubusercontent.com/urfave/cli/main/docs/v3/getting-started.md) | Tool's own docs | fetched 2026-09-26, `main` branch | v3's context-first `Action` signature |
| [urfave/cli v3 exit-codes.md](https://raw.githubusercontent.com/urfave/cli/main/docs/v3/examples/exit-codes.md) | Tool's own docs | fetched 2026-09-26, `main` branch | `cli.Exit`/`cli.ExitCoder`/`cli.MultiError` |
| [clig.dev](https://clig.dev/) | Community-authored CLI guidelines | last updated 2026-09-23 (site footer) | Exit codes, stdout/stderr, TTY/NO_COLOR guidance, cited directly by the Rust fleet's own `cli-contract.md` |
| [cli/cli repository](https://github.com/cli/cli) | Real, widely-used Go CLI (exemplar `9b03115`) | fetched as exemplar 2026-09-26 | `pkg/cmdutil/errors.go` + `internal/ghcmd/cmd.go`: a complete, real exit-code dispatch mechanism |
| [Go 1.27 release notes](https://go.dev/doc/go1.27) | Official Go release notes | Go 1.27, released Aug 2026 | Confirms current-era stdlib surface; GODEBUG policy |
| [Go 1.26 release notes](https://go.dev/doc/go1.26) | Official Go release notes | Go 1.26 | `errors.AsType`, `signal.NotifyContext` cancel-cause change — both load-bearing for this survey |
| [Go 1.25 release notes](https://go.dev/doc/go1.25) | Official Go release notes | Go 1.25 | Negative check: neither `execwait` nor `os.Root` announced here |
| [golang/go os/exec/exec.go](https://raw.githubusercontent.com/golang/go/master/src/os/exec/exec.go) | Stdlib source | fetched 2026-09-26, `master`; confirmed against local `go1.27.1` | `Cmd.Cancel`/`WaitDelay`, `ErrDot`, undocumented `execwait` finalizer |
| [golang/go os/signal/doc.go](https://raw.githubusercontent.com/golang/go/master/src/os/signal/doc.go) | Stdlib source doc | fetched 2026-09-26, `master` | Exact `SIGPIPE` default-behavior text |
| [golang/go os/root.go](https://raw.githubusercontent.com/golang/go/master/src/os/root.go) | Stdlib source | fetched 2026-09-26, `master` | `os.Root`'s explicit non-guarantees and platform divergence |
| [google/go-containerregistry](https://github.com/google/go-containerregistry) | Real, widely-used OCI client (exemplar `0c8bedb`) | fetched as exemplar 2026-09-26 | Functional options, concrete retry/backoff/transport defaults, streaming digest verification — read at source, doc was thin on defaults |
| [oras-project/oras-go](https://github.com/oras-project/oras-go) | Real OCI artifacts client (exemplar `cb6d6dc`) | fetched as exemplar 2026-09-26 | Content-addressed on-disk store internals, credential-store fallback chain — read at source, doc was thin on internals |
| [regclient/regclient](https://github.com/regclient/regclient) | Real OCI registry client (exemplar `43d2acb`) | fetched as exemplar 2026-09-26 | `Retry-After` parsing gap found at source — read at source, README documents features not edge cases |
| [containerd/containerd](https://github.com/containerd/containerd) | Real container runtime (exemplar `934434d`) | fetched as exemplar 2026-09-26 | `content.Writer` resumable-ingest contract |
| [opencontainers/image-spec](https://github.com/opencontainers/image-spec) | OCI specification | fetched 2026-09-26, `main` branch | Digest grammar, verification order, registered algorithms including BLAKE3 |
| [opencontainers/go-digest](https://github.com/opencontainers/go-digest) | OCI reference implementation | vendored copy read via exemplar, fetched 2026-09-26 | `Verifier` interface's same verify-on-demand shape |
| [golang.org/x/term](https://github.com/golang/term) | Go team's terminal package | fetched 2026-09-26, `master` | Full `IsTerminal`/`MakeRaw`/`GetState`/`ReadPassword` API — read at source, README is a stub |
| [mattn/go-isatty](https://github.com/mattn/go-isatty) | Widely-used TTY-detection library | fetched 2026-09-26 | The Cygwin/MSYS2 second-check case `x/term` doesn't cover |
| [no-color.org](https://no-color.org/) | Community standard | last updated 2026-09-23 (site footer) | Exact normative `NO_COLOR` text |
| [google/renameio](https://github.com/google/renameio) | Google's atomic-file-write package | fetched 2026-09-26 | Atomic-write subtleties enumerated explicitly, including the Windows non-support admission |
| [golang/exp apidiff](https://github.com/golang/exp) | Go team's experimental API-compat tool | fetched 2026-09-26 | `apidiff`/`gorelease` semantics for SDK semver enforcement |
| [oh-my-posh GHSA-fwjx-9p69-h25h](https://github.com/JanDeDobbeleer/oh-my-posh/security/advisories/GHSA-fwjx-9p69-h25h) | Real security advisory in a Go CLI | disclosed advisory (fetched via search 2026-09-26) | Concrete precedent for terminal-escape injection in exactly this corpus's shape |
| [charmbracelet/bubbletea](https://github.com/charmbracelet/bubbletea) | Widely-used Go TUI framework (exemplar `d5bfd5c`) | fetched as exemplar 2026-09-26 | `ProgramOption` signal-handling opt-outs |
| [ocx repository (local, read-only)](file:///home/mherwig/dev/ocx) | Fleet's own Rust CLI/registry/store implementation | current working tree, 2026-09-26 | The Rust-side contract (`ocx_exit`, `ocx_store`, `ocx_util/fs`, `ocx_oci`) a Go analogue must name explicitly |
| [rust-quality/cli-contract.md (local, read-only)](file:///home/mherwig/dev/grimoire-lore/.agents/worktrees/go/rules/rust-quality/cli-contract.md) | Sibling lore rule set | current working tree, 2026-09-26 | The pinned exit-code table and stream/color/TTY rules a Go rule must reuse or explicitly diverge from |
