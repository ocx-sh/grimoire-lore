---
title: The Go CLI Contract
summary: The GO-CLI family, owning the exit-code table and its classifier, the three-statement main, cobra usage errors and sealed command groups, SIGPIPE and signal exits, stdout discipline and buffering, the rendered error, colour, prompts, config paths and the CLI framework choice
---

# The Go CLI Contract

Owns everything between `func main` and the exit status a script sees: the exit-code table and the one classifier that picks from it, cobra's wiring for usage errors and command groups, SIGPIPE and SIGINT/SIGTERM, what goes to stdout versus stderr, buffering and flushing, the rendered error, colour, prompts, config paths and the framework choice. Rows bind `package main` and the command packages under it. A library or SDK takes only GO-CLI-01 and GO-CLI-12 from this file, and inverts GO-CLI-02, 03, 07 and 08: library code never exits, prints or registers a signal. Neighbours: the error types, `%w` wrapping and `errors.AsType` classification helpers are `GO-ERR` (errors). The report-all fan-out that produces a joined error is `GO-CONC-14` and the SDK's timeout cause is `GO-CONC-17`, both in `GO-CONC` (concurrency). The atomic-write mechanism and spawning a child are `GO-IO` (files and processes). The SDK's `*ExitError` surface is `GO-API` (API design). The linter configuration text is `GO-GATE-18` in `GO-GATE`, the CLI overlay file, and this file names linters without pasting YAML.

Contents: [Dates and Floors](#dates-and-floors) · [The Exit-Code Table (pinned)](#the-exit-code-table-pinned) · [Caught by golangci-lint](#caught-by-golangci-lint) · [Caught by In-Process Tests of run](#caught-by-in-process-tests-of-run) · [Caught by Running the Built Binary](#caught-by-running-the-built-binary) · [Caught by grep and a Reading Heuristic](#caught-by-grep-and-a-reading-heuristic) · [Documented Gaps](#documented-gaps) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Floors

Measured 2026-09-26 unless a row says otherwise, against Go 1.27.1, golangci-lint v2.14.0, staticcheck 2026.2.1, cobra v1.10.1 (pflag v1.0.10), urfave/cli v3.13.0, termenv v0.16.0 and colorprofile v0.4.3.

- **`errors.AsType`** needs go 1.26 (go-line gated). Below it, use `errors.As`. **`errors.Join`** and **`context.WithCancelCause`** need go 1.20 (go-line gated). **`os.UserConfigDir`** needs go 1.13.
- **`signal.NotifyContext`'s cancel cause** arrived in Go 1.26 as an unexported string type with no signal accessor (toolchain-gated, read 2026-09-26 in go1.27.1 `os/signal`). That is why GO-CLI-08 builds its own typed cause.
- **Every cobra row** was read against cobra v1.10.1 source and watched on fixtures. Re-run the in-process tests on every cobra bump. [spf13/cobra#1708](https://github.com/spf13/cobra/issues/1708) (`SetOut` also redirects deprecation notices) was open on 2026-09-26.
- **colorprofile is pre-1.0.** Re-check its `NO_COLOR` parsing on every bump (GO-CLI-13).
- **Windows is first-class, and its legs are compile-verified only.** The Windows branches of GO-CLI-07, 08 and 13 pass `GOOS=windows go vet ./...` and were not watched on a Windows host.
- **Pinned defaults, each overridable once by an adopter:** a CLI declares `go 1.27.0` plus a `toolchain` line. cobra is the framework. GO-CLI-08 is a SHOULD. On Windows, Ctrl-C exits 130 for script parity with Unix, not the native `0xC000013A`.

## The Exit-Code Table (pinned)

**pinned**: the mechanism (one typed `ExitCode`, sysexits-aligned, no bare integer reaching `os.Exit`) is portable. The numbers are a decision already shipped and scripted against. An adopter keeps the mechanism and assigns its own names above 78.

0 `ExitSuccess` (also a closed downstream pipe) · 1 `ExitFailure` (classifier fall-through only) · 64 `ExitUsageError` (bad flag or argument, unknown or missing subcommand) · 65 `ExitDataError` · 69 `ExitUnavailable` (not retryable) · 74 `ExitIOError` (including a failed stdout flush) · 75 `ExitTempFail` (retryable) · 77 `ExitPermissionDenied` · 78 `ExitConfigError` · 79 `ExitNotFound` · 80 `ExitAuthError` · 81 `ExitPolicyBlocked` (a deliberate `--offline` or `--frozen` refusal) · 128+N, no constant (a signal death, re-raised on Unix or forwarded from a child).

64 to 78 follow BSD `sysexits`, and 79 upward is the private range. Never claim 2 to 63 or 100 and above. An SDK that decodes a wrapped CLI's exits mirrors that CLI's whole table (an SDK over `ocx` mirrors its 0 to 86).

## Caught by golangci-lint

```bash
golangci-lint run ./...
```

Run it with the CLI overlay copied whole to `.golangci.yml` (`GO-GATE-18` owns the file). It enables `errcheck`, revive `deep-exit`, gocritic `exitAfterDefer`, `forbidigo` on `fmt.Print*`, `print` and `println`, and `exhaustive` with `default-signifies-exhaustive: false`. It keeps `issues.uniq-by-line: false` (`GO-GATE-10`), otherwise `deep-exit` hides `exitAfterDefer` on the same line. Exit 0 with `0 issues.` is the pass.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-CLI-01 | Declare one `type ExitCode int` in one shared internal package holding the pinned table above. Allocate new codes upward from the next free slot, never in 2 to 63 or at 100 and above. Pass only `int(code)` to `os.Exit`. Check every `switch` over `ExitCode` (the JSON slug, the docs table) with `exhaustive`, in the CLI and in an SDK that mirrors the table. | Go has no closed enum, so a new code compiles unclassified, and a bare `os.Exit(3)` invents a number no script was written against. | `exhaustive` in the gate (watched: 1 issue on a switch missing `ExitPolicyBlocked`, 0 on the full switch). Then `grep -rn --include='*.go' -E 'os\.Exit\(-?[0-9]' .`: empty output is the pass, any hit is a bare number reaching the exit. | MUST |
| GO-CLI-02 | `main` is exactly three statements: `code := run(os.Args[1:], os.Stdout, os.Stderr)`, `reraise(code)`, `os.Exit(int(code))`. `run` owns every `defer`, flush and `signal.Stop`. Nothing else calls `os.Exit`, `log.Fatal*` or `cobra.CheckErr`. | `os.Exit` skips defers. A dropped flush still exits with the same code, so an exit-code test cannot see the lost output. The re-raise is what makes a signal death visible to a `wait()`-based parent (GO-CLI-08). | The gate: `deep-exit` for an exit outside `main`, `exitAfterDefer` for `defer` plus exit in one function. Then `grep -rn --include='*.go' -F 'cobra.CheckErr(' .`: empty output is the pass, because `deep-exit` does not flag it (watched). | MUST |
| GO-CLI-03 | stdout carries only the result. Commands write to an `io.Writer` injected from `run` (cli/cli's `IOStreams` shape), never to `fmt.Print*` or `os.Stdout` directly. Under `--format json`, a test parses the whole captured stdout. | One progress line on stdout breaks every downstream parser (watched: `jq` exit 5 vs 0). | `forbidigo` in the gate, plus one JSON-parse test per JSON subcommand. A failing parse is the finding. | MUST |
| GO-CLI-04 | Buffer multi-line output in one `bufio.Writer` created in `run`. After `Execute`, do `err = errors.Join(err, out.Flush())` and classify the result. Never `defer w.Flush()` with the error dropped. | `os.Stdout` is unbuffered in Go (5.5x slower per 100k lines, measured). A dropped flush error turns a full disk into a silent exit 0 with truncated output. | `errcheck` in the gate flags `defer w.Flush()`. Then `full-check` in the built-binary block below must print 74 (watched: 0 on the textbook shape, 74 on the fixed one). | MUST |

## Caught by In-Process Tests of run

```bash
go test ./...
```

Every row here is a table test that calls `run(args, &out, &errb)` and asserts the exit code, the number of stderr lines and the captured stdout. A failing test is the finding. These tests are blind until GO-CLI-20 holds, because cobra's own output bypasses the injected writer, so fix that row first.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-CLI-05 | Map errors to codes in one ordered `classify(err) ExitCode` in `run`, in this order: broken pipe to 0, `*SignalError` to 128+N, typed errors most-specific first via `errors.AsType`, "no `RunE` started" to 64, else `ExitFailure`. The case order is also the precedence policy for a joined error (GO-CLI-18). Lock every code with a test that runs a real invocation and asserts the code and exactly one stderr error line (a joined error renders one line per member). | A classifier is a condition chain, so no linter can prove it total. Only a per-code test catches a new error class falling through to 1. | One table-test case per `ExitCode` value. `go vet` (`stdversion`) catches `errors.AsType` under a `go` line below 1.26. | MUST |
| GO-CLI-06 | A cobra CLI sets `SilenceErrors` and `SilenceUsage` on the root and wraps every `RunE` in the tree once (`markStarted`), so an untyped error returned before any `RunE` ran classifies 64. Call `markStarted(root)` after the last `AddCommand`, immediately before `ExecuteContext`. A typed `PersistentPreRunE` error (a config load, 78) is matched before that fallback. `SetFlagErrorFunc` plus wrapped `Args` alone is insufficient. The unknown-subcommand case reaches 64 only at the root, and only with root `Args == nil` and `TraverseChildren` unset or with the GO-CLI-17 wiring. Nested groups need GO-CLI-21. | cobra's `Execute` never exits and never assigns 64. Unknown-subcommand and missing-required-flag errors have no hook, so both arrive untyped. A command added after `markStarted` keeps an unwrapped `RunE`, and its business error then classifies 64. | Cases: `--bogus-flag`, an unknown subcommand, a missing positional and a missing required flag each exit 64 with one stderr line. A failing `RunE` exits something other than 64, which also catches a misordered `markStarted` (watched: 64 misordered vs 1 ordered). | MUST |
| GO-CLI-17 | Declare global flags as root `PersistentFlags` and leave `TraverseChildren` unset, because `app --flag sub` already parses without it. If a root sets `TraverseChildren` or any non-nil `Args`, it must be runnable (`RunE` returning `cmd.Help()` for zero args) and its `Args` must return a `*UsageError` for any leftover token (`unknown command %q for %q`). | cobra checks unknown subcommands only when root `Args == nil`, and `Traverse` returns nil on the first unmatched token. On a non-runnable root the help gate fires before `Args`, so the typo prints usage to stdout and exits 0 even with a rejecting `Args` (watched). `cobra.NoArgs` is safe only by coincidence of wording. | Case: `run([]string{"lsit"}, ...)` (a typo, rename to taste) exits 64 with one stderr line and empty stdout. Reading heuristic: `grep -rn --include='*.go' -e 'TraverseChildren' -e 'Args:' .`, then confirm any root hit has a `RunE` and a rejecting validator. | MUST |
| GO-CLI-18 | When the error can be an `errors.Join` (a report-all batch, GO-CONC-14), choose its code through `classify`'s case order, where the first case whose `errors.AsType` matches anywhere in the tree wins. Never pick the code by walking `Unwrap() []error` and returning on the first typed element. State the precedence in a comment on the chain. | A report-all batch appends in goroutine completion order, so a slice-walk hands out a code by scheduler accident (watched: 79 vs 77 for the two orders). `errors.AsType` searches the whole tree, so the case chain is deterministic. | Unit test: classify `errors.Join(a, b)` and `errors.Join(b, a)` with two distinct typed classes and assert equal codes. | MUST |
| GO-CLI-20 | In `run`, call `root.SetOut(out)` alongside `root.SetErr(stderr)`, where `out` is the buffered writer the commands receive. Call it after the last `AddCommand` and before `root.InitDefaultCompletionCmd()` and `ExecuteContext`. Never use cobra's deprecation machinery (`Deprecated:` on a `Command`, `Mark*Deprecated` on a flag). Print the deprecation warning to stderr from the command's own code. | Without `SetOut`, cobra's help, usage, `--version` and completion scripts go to the real `os.Stdout`, so an in-process test sees 0 bytes and exit 0 and every row in this section goes blind. The completion command captures its writer when created, so a later `SetOut` misses it. With `SetOut` set, cobra's deprecation notices move to stdout ([cobra#1708](https://github.com/spf13/cobra/issues/1708), open), which is why cli/cli declines `SetOut`. | Cases: `run([]string{"config", "--help"}, ...)` and `run([]string{"completion", "bash"}, ...)` each exit 0 with `out.Len() > 0` (watched red on a missing and on a late `SetOut`). Then `grep -rn --include='*.go' -e 'Deprecated: *"' -e '\.Deprecated *= *"' -e 'MarkDeprecated(' -e 'MarkShorthandDeprecated(' -e 'MarkPersistentFlagDeprecated(' .`: empty output is the pass, and a `// Deprecated:` doc comment does not match. Then `setout-locator` below. | MUST |
| GO-CLI-21 | Every non-root command that has subcommands is runnable. Its `RunE` returns a `*UsageError` for whatever reaches it (`%q requires a subcommand` for zero args, `unknown command %q for %q` for a leftover token), classified 64 with one stderr line and a `see <path> --help` hint. Apply it with one `sealGroups(root)` walk after the last `AddCommand` and after `root.InitDefaultCompletionCmd()`, so cobra's own `completion` group is sealed too. Never "fix" a group with `cmd.Help()` as its `RunE`, with `Args: cobra.NoArgs`, or with a no-op `Run` behind a count-only `Args`. The root is exempt: a bare root prints help and exits 0. | cobra checks subcommand membership at the root only ("subcommands will always accept arbitrary arguments"), and a non-runnable command returns `flag.ErrHelp`, which `ExecuteC` turns into help plus a nil error. A script cannot tell `app group typo` from `app group --help` (watched: exit 0 on both). `--help` is checked before the runnable gate, so sealing leaves help untouched. | Unit test: walk `root.Commands()` recursively and fail on any `c.HasParent() && c.HasSubCommands() && !c.Runnable()`. Cases per group: bare and a typo each exit 64 with one stderr line and empty stdout, `--help` and `help config` exit 0 with usage on stdout, `completion bashh` exits 64. Then `noop-group-locator` below. | MUST |

```bash
# setout-locator (GO-CLI-20): files that wire stderr but not stdout. Empty output is the pass.
# A hit is read, because SetOut may live in another file.
grep -rl --include='*.go' -F '.SetErr(' . | xargs -r grep -L -F '.SetOut('
# noop-group-locator (GO-CLI-21): files with a count-only Args that also add subcommands.
# Empty output is the pass. A hit is read for a no-op Run on a command that has children.
grep -rl --include='*.go' -e 'cobra.ExactArgs(' -e 'cobra.RangeArgs(' -e 'cobra.MinimumNArgs(' . | xargs -r grep -l -F '.AddCommand('
```

```go
// wrong: a group whose RunE prints help exits 0 on "app group typo"
var group = &cobra.Command{Use: "group", RunE: func(cmd *cobra.Command, _ []string) error { return cmd.Help() }}

// right: one walk, after the last AddCommand and after root.InitDefaultCompletionCmd()
func sealGroups(c *cobra.Command) {
	if c.HasParent() && c.HasSubCommands() && !c.Runnable() {
		c.RunE = func(cmd *cobra.Command, args []string) error {
			msg := fmt.Sprintf("%q requires a subcommand", cmd.CommandPath())
			if len(args) > 0 {
				msg = fmt.Sprintf("unknown command %q for %q", args[0], cmd.CommandPath())
			}
			return &UsageError{Err: fmt.Errorf("%s; see %q --help", msg, cmd.CommandPath())}
		}
	}
	for _, s := range c.Commands() {
		sealGroups(s)
	}
}
```

## Caught by Running the Built Binary

Build once, then run each named check under bash from the build directory.

```bash
# pipe-check (GO-CLI-07): prints 0, and stderr stays empty
./cli list 100000 | head -1; echo "${PIPESTATUS[0]}"
# full-check (GO-CLI-04): prints 74
./cli list 10 >/dev/full; echo $?
# prompt-check (GO-CLI-09): prints 64 at once, never 124
timeout 2 ./cli delete < <(sleep 100); echo $?
# wait-check (GO-CLI-08): prints -2 (and -15 for SIGTERM), never 130
python3 -c 'import subprocess,signal,time; p=subprocess.Popen(["./cli","wait"]); time.sleep(1); p.send_signal(signal.SIGINT); print(p.wait())'
```

`list`, `delete` and `wait` stand for a long-output, a prompting and a blocking subcommand: rename them. A bash `$?` shows 130 whether or not the signal was re-raised, so only `wait-check` sees the difference (watched: -2 with the re-raise, 130 without).

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-CLI-07 | Call `signal.Notify(make(chan os.Signal, 1), syscall.SIGPIPE)` at the top of `run`. A broken pipe becomes exit 0 only in `classify`, through a per-OS `isBrokenPipe`: `errors.Is(err, syscall.EPIPE)` under `!windows`, and `ERROR_BROKEN_PIPE` or `syscall.Errno(232)` under `windows`. | Go's default is death by SIGPIPE (141), not the pinned 0. `Ignore`, or `Notify` without the central check, gives 2 or 1 (watched). `syscall.EPIPE` never matches on Windows. | `pipe-check` (watched: 141 textbook vs 0 fixed). `grep -rn --include='*.go' -e 'syscall.EPIPE' .` is a locator: every hit must sit in the `!windows` helper. `GOOS=windows go vet ./...` exits 0 (compile only, not watched on a Windows host). | MUST |
| GO-CLI-08 | Derive the SIGINT/SIGTERM status from a typed cause: a `signal.Notify` channel goroutine calls `cancel(&SignalError{Sig})` on a `context.WithCancelCause` context passed to `ExecuteContext`. On Unix, `reraise` does `signal.Reset(sig)`, `syscall.Kill(os.Getpid(), sig)` and a bounded wait, so the parent sees a signal death. Never hardcode 130, and never string-match `NotifyContext`'s cause. **pinned**: SHOULD by default, and Windows exits 128+N. | The Go 1.26 `NotifyContext` cause is an unexported string type with no signal accessor. `os.Exit(130)` cannot fake `WIFSIGNALED`, so a calling shell script does not abort. | `wait-check`. Reading heuristic: no literal 130 or 143 on the exit path. | SHOULD |
| GO-CLI-09 | Prompt only when `term.IsTerminal(int(os.Stdin.Fd()))` is true and no `--yes` or `--no-input` was passed. Otherwise return a `*UsageError`, never `os.Exit(64)` inline. Read secrets from `--password-file`, stdin, or `term.ReadPassword` behind the same gate, never from a flag value or a plain env var. | An ungated prompt on an open, silent stdin pipe hangs CI forever (watched: 124). Flag values leak into `ps`, and env vars leak into `/proc` and CI logs. | `prompt-check`. Reading heuristic for secrets: `grep -rn --include='*.go' -e '"password"' -e '"token"' -e '"secret"' .`, where a hit on a flag definition or an `os.Getenv` is the finding. | MUST |
| GO-CLI-10 | A mutating subcommand is safe to re-run after a crash. Stage the change and make the commit atomic and idempotent (the atomic-write mechanism is `GO-IO`), and treat a registry "already exists" as success. | Append-in-place plus a retry duplicates records after an ordinary Ctrl-C or OOM kill (watched: 2 lines vs 1). | A crash-then-retry integration test asserts the output is byte-identical to one clean run. | SHOULD |

```go
// wrong: SIGTERM also exits 130, and a wait()-based parent sees a normal exit
func exitFor(err error) int {
	if errors.Is(err, context.Canceled) {
		return 130
	}
	return 1
}

// right: one ordered chain; the case order is the precedence policy (GO-CLI-18)
func classify(err error, started bool) ExitCode {
	if err == nil || isBrokenPipe(err) {
		return ExitSuccess
	}
	if se, ok := errors.AsType[*SignalError](err); ok {
		return ExitCode(128 + int(se.Sig))
	}
	if _, ok := errors.AsType[*ConfigError](err); ok {
		return ExitConfigError
	}
	if _, ok := errors.AsType[*UsageError](err); ok || !started {
		return ExitUsageError
	}
	return ExitFailure
}
```

## Caught by grep and a Reading Heuristic

Each row carries its own command, run from the module root. Empty output is the pass unless the cell says otherwise.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GO-CLI-11 | Render the error chain once, in `run`, to stderr, through a named `sanitize` that replaces C0 and C1 controls (except `\n` and `\t`) and `unicode.Bidi_Control` runes. `%q` is not the sanitizer. Wire content written to stdout gets the same treatment. | CWE-150: registry- or Git-supplied names carry ESC, OSC or U+202E ([GHSA-fwjx-9p69-h25h](https://github.com/advisories/GHSA-fwjx-9p69-h25h)). cobra's own `Error:` print plus a print in `main` renders the error twice. | Structural test: an error containing `\x1b` and U+202E reaches stderr with zero raw bytes of either (watched: 1 and 1 with `%s`, 0 and 0 sanitized). Reading heuristic: every stderr error write routes through `sanitize`. | MUST |
| GO-CLI-12 | Never forward `(*exec.ExitError).ExitCode()` unchecked. If `ws, ok := ee.Sys().(syscall.WaitStatus); ok && ws.Signaled()`, forward `128+int(ws.Signal())`. A signal-killed child never maps to success. No build tag is needed, because Windows' `WaitStatus.Signaled()` compiles and returns false. | `ExitCode()` is -1 on a signal death, and `os.Exit(-1)` becomes 255, a plausible wrong number (cli/cli forwards it). | `grep -rn --include='*.go' -F '.ExitCode()' .` is a locator: read each hit on an `*exec.ExitError`. Test: a child that kills itself with SIGTERM makes the parent exit 143 (watched: 255 bare vs 143 checked). | MUST |
| GO-CLI-13 | Decide colour per stream in one function: `--color auto`, `always` or `never`, then `os.Getenv("NO_COLOR") != ""`, then `TERM=dumb`, then `term.IsTerminal(fd)` or `isatty.IsCygwinTerminal(fd)`. Never `os.LookupEnv("NO_COLOR")`. Never let a library decide in place of that function: not `fatih/color`'s global `NoColor`, not the package-level `termenv.EnvNoColor()` or `ColorProfile()` (bound to stdout at init), and not `colorprofile.Detect` or `Env` unless the `NO_COLOR` check has already short-circuited ahead of it. | [no-color.org](https://no-color.org/) says "present and not an empty string", so a presence check disables colour for `NO_COLOR=""`. One shared decision is wrong when only one stream is redirected. colorprofile v0.4.3 parses `NO_COLOR` with `strconv.ParseBool`, so `NO_COLOR=yes` leaves colour on. | `grep -rn --include='*.go' -F 'LookupEnv("NO_COLOR")' .` and `grep -rn --include='*.go' -e 'colorprofile\.Env(' -e 'colorprofile\.Detect(' -e 'termenv\.EnvNoColor()' -e 'termenv\.ColorProfile()' -e 'termenv\.EnvColorProfile()' .`: empty output from both is the pass, and a colorprofile hit passes only when a `NO_COLOR` short-circuit precedes it. Reading heuristic: the colour function takes an fd. | MUST |
| GO-CLI-14 | Take config, cache and data directories from `os.UserConfigDir()` and `os.UserCacheDir()`, never from a `HOME` or `USERPROFILE` join. Prefix every tool env var with the tool's name (`MYTOOL_CACHE`). | The hand-rolled join ignores `XDG_CONFIG_HOME` and is wrong on Darwin and Windows. It agrees with the stdlib only on a developer's unset-XDG shell. | `grep -rn --include='*.go' -e 'Getenv("HOME")' -e 'Getenv("USERPROFILE")' .`: a hit outside the one platform-conventions module is the finding (watched). | MUST |
| GO-CLI-15 | Apply precedence flags > env > project > user > system as an explicit highest-first walk over named layers. Do not add `spf13/viper` unless remote providers or hot reload are real requirements, and use `knadh/koanf` for multi-format or multi-provider config. | viper links 5.19 MB and 47 `go.sum` entries for one `SetDefault` (koanf 2.07 MB and 12), does not deep-merge, and cobra-cli's scaffold wires it in by default. | A two-layer test: the higher layer wins, and removing it exposes the next. `grep -rn --include='go.mod' -F 'spf13/viper' .`: a hit needs a stated reason in the diff. | SHOULD |
| GO-CLI-16 | Build multi-command CLIs on cobra and pflag, with global flags as root `PersistentFlags` (without `TraverseChildren`, GO-CLI-17) and completions from cobra's generator. Build single-command tools on stdlib `flag` with `ContinueOnError`. Do not adopt urfave/cli v3. **pinned**: cobra is the owner default. | urfave/cli v3.13.0 hardcodes exit 3 for an unknown command, and its own exit-code example ends in `log.Fatal`, which discards `ExitCoder`. | `./cli nosuchcmd; echo $?` prints 64 (watched: urfave 3, cobra 64, stdlib 64). | SHOULD |
| GO-CLI-19 | Do not add a colour dependency to make the colour decision, because `golang.org/x/term` (already required by GO-CLI-09) covers it. Add a styling library only for styled output. If it is termenv, construct `termenv.NewOutput(w)` once per stream. A lipgloss v2 or colorprofile user still gates on GO-CLI-13's function. | termenv adds 44% and colorprofile 75% to a stripped linux/amd64 binary (measured), and the most-trained-on library (lipgloss v2) carries the `ParseBool` defect. | `grep -rn --include='go.mod' -e 'muesli/termenv' -e 'charmbracelet/colorprofile' -e 'charm.land/lipgloss' -e 'fatih/color' .`: a hit needs a stated styled-output reason in the diff. | SHOULD |

Four stream rules carry over unchanged from the Rust CLI contract (`rust-quality` CLI-04, CLI-08, CLI-12, CLI-16) and get no Go ID. Structured errors (CLI-04, MUST) print `{"error": {"code": slug, "exit": int, "message": text}}` on stdout, with slugs from GO-CLI-01's switch. Progress bars (CLI-08, MUST) draw to stderr and are suppressed when it is not a TTY, when `CI` is set, or under a machine-output flag. Help text (CLI-12) is ASCII, short, and free of internal references. A command doing network I/O prints a status line within 100 ms (CLI-16, CONSIDER).

## Documented Gaps

- **A root, or a group, that takes both subcommands and its own positional arguments** has no validator that tells a typo from a real argument. The GO-CLI-17 and GO-CLI-21 validators reject every leftover token, so neither may take positionals. A CLI that needs both names the ambiguity in its help.
- **`app help lsit` exits 0.** cobra's built-in `help` prints `Unknown help topic` and returns nothing. Fixing it means replacing the command with `SetHelpCommand`, which is not ruled because the invocation asked for help.
- **A group with a no-op `Run` behind a count-only `Args`** is `Runnable()`, so GO-CLI-21's tree-walk test passes it. `noop-group-locator` finds the candidates, and the no-op itself is a reading call.
- **The `TraverseChildren` typo gap has no upstream tracker**, and cobra's docs are silent, so GO-CLI-17 treats it as the CLI's problem regardless of intent.
- **The stderr order of a joined error is scheduler order.** A golden-stderr test on a concurrent batch compares lines as a set. Only the exit code is deterministic under GO-CLI-18.
- **If colorprofile's `envNoColor` becomes a non-empty check**, GO-CLI-13's colorprofile ban relaxes to a version floor.

## What Agents Get Wrong Here

1. **The textbook `if err := root.Execute(); err != nil { os.Exit(1) }`.** One code for every error class, the error printed twice, usage dumped on business errors. cobra never exits by itself. GO-CLI-06's four-case test catches it.
2. **`defer w.Flush()` with the error dropped**, or placed ahead of an `os.Exit`. `errcheck` and `exitAfterDefer` both catch it.
3. **Assuming Go handles a closed pipe like Rust.** It dies with 141, and on Windows `syscall.EPIPE` never matches (GO-CLI-07).
4. **`fmt.Println` of progress in a JSON command.** `forbidigo` catches it.
5. **Trusting `ExitError.ExitCode()`** on a signal-killed child, which becomes 255 (GO-CLI-12).
6. **Hardcoding 130 on `context.Canceled`**, or assuming `NotifyContext`'s 1.26 cause exposes the signal (GO-CLI-08).
7. **`os.LookupEnv("NO_COLOR")`**, or `fatih/color` globals shared across two streams (GO-CLI-13).
8. **An ungated prompt**, which hangs CI (GO-CLI-09).
9. **Copying urfave's exit-code example** (`log.Fatal`), or keeping viper from cobra-cli's scaffold (GO-CLI-15, GO-CLI-16).
10. **`cobra.CheckErr` in `main`**, a library exit `deep-exit` misses (GO-CLI-02).
11. **`TraverseChildren: true` "so global flags can come first"**, or a custom root `Args`. Unknown-subcommand detection silently vanishes, and persistent flags never needed it (GO-CLI-17).
12. **Classifying a joined error by walking its slice** under a comment saying one class "takes precedence", when the winner is whichever goroutine finished first (GO-CLI-18).
13. **Reaching for lipgloss v2, colorprofile or the package-level `termenv.EnvNoColor()` for the `NO_COLOR` check** (GO-CLI-13, GO-CLI-19).
14. **Calling `markStarted` before `AddCommand`** ("set up the wrapping, then build the tree"), which turns business errors into 64 (GO-CLI-06).
15. **Building a command group the way cobra's docs show it**, `AddCommand` on a parent with no `RunE`, so `app group typo` exits 0 with help (GO-CLI-21).
16. **Believing GO-CLI-17's root wiring protects nested groups**, or "fixing" a group with `Args: cobra.NoArgs` or a `RunE` returning `cmd.Help()`. Both still exit 0 (GO-CLI-21).
17. **Wiring `SetErr(stderr)` but not `SetOut(out)`**, or calling `SetOut` after `InitDefaultCompletionCmd`. Production looks identical, and only the in-process tests go blind (GO-CLI-20).
18. **Marking a command or flag deprecated with cobra's built-ins once `SetOut` is set**, which puts the notice on stdout (GO-CLI-20).
