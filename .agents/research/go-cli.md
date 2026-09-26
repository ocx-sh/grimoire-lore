---
title: "The Go CLI contract — exit table, usage errors, SIGPIPE, signals, streams and terminal"
topic: "GO-CLI: how a fleet Go CLI meets rules/rust-quality/cli-contract.md (EXIT-01..11, CLI-01..16)"
model: opus
id_family: GO-CLI
consolidates:
  - go-cli/exit-codes-and-signals.md
  - go-cli/streams-and-terminal.md
  - go-cli/reference-skeleton.md
  - go-cli/group-help.md
date: 2026-09-26
revised: 2026-09-26
toolchain: "Go 1.27.1, golangci-lint v2.14.0, staticcheck 2026.2.1, cobra v1.10.1, urfave/cli v3.13.0, termenv v0.16.0, colorprofile v0.4.3"
fixtures:
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/go-cli-consolidation/
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/go-cli-revision/
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/group-help/
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/go-cli-group-revision/
---

# The Go CLI contract (GO-CLI)

Map rows M-F-01..16 ([go-topic-map.md](go-topic-map.md) §F). The map's conflict 16 and the
orchestrator decisions in [go-frame.md](go-frame.md) (Q3 framework, Q6 Windows first-class) bind
this file. The target is `rules/go-quality/cli-contract.md`. It mirrors the Rust contract
(`rules/rust-quality/cli-contract.md`): the mechanism transfers, and the numbers stay pinned.

## Verdict

1. **Exit table (CLI, SDK).** Every Go binary declares one `type ExitCode int` that holds the fleet's shared core: 0, 1, 64, 65, 69, 74, 75, 77, 78, 79, 80 and 81. The core is identical in `ocx_exit::ExitCode` (`/home/mherwig/dev/ocx@2691d3c1638e:crates/ocx_exit/src/exit_code.rs:170-216`) and grimoire's table (`/home/mherwig/dev/grimoire@60249496edba:src/cli/exit_code.rs:22-55`). The Go SDK mirrors ocx's *full* table, 0–86, because it decodes ocx's exits. Constants are named `ExitXxx` so error types keep the `XxxError` names. The exit dive's `UsageError` const/type pair cannot compile in one package; GO-ERR's `ExitUsageError` naming wins.
2. **`main` has three statements (CLI):** `code := run(os.Args[1:], os.Stdout, os.Stderr); reraise(code); os.Exit(int(code))`. All defers, flushes and `signal.Stop` calls live in `run`. Nothing else in the process may exit, and that includes `cobra.CheckErr`, which revive `deep-exit` does not catch.
3. **Cobra usage errors reach 64 through a phase marker, not through the two-hook wiring.** The exit dive's `SetFlagErrorFunc` + `wrapArgs` still exits 1 on an unknown subcommand and on a missing required flag (verified). The streams dive's "any `Execute` error → 64" wrongly exits 64 on business errors. **Decided:** set `SilenceErrors`/`SilenceUsage` on the root, wrap every `RunE` in the tree once to record "started", and classify an untyped error returned before any `RunE` ran as 64 (verified on all four usage classes). *Revised:* the phase marker only catches an unknown subcommand that cobra *reports*. With `TraverseChildren` set, or with any non-nil root `Args`, cobra never reports it: the typo runs the root with exit 0, or prints usage with exit 0 if the root is not runnable. GO-CLI-17 closes that (watched). `markStarted` must run after the last `AddCommand` (GO-CLI-06). Settled: an untyped `PersistentPreRunE` error classifies 64 and a typed one keeps its code (78 for config), including under `TraverseChildren`, aliases, `help`, `--version` and `__complete`. *Revised again (group-help):* cobra's unknown-subcommand check (`legacyArgs`) runs at the root only (`spf13/cobra@adbc8813901b:args.go:35`, `!cmd.HasParent()`). A nested command that holds subcommands but has no `RunE` is `!Runnable()`, so `execute` returns `flag.ErrHelp` (`command.go:955-957`): a bare `app group` and a mistyped `app group typo` print usage to stdout and exit 0, byte-identical to `app group --help`. This happens with or without GO-CLI-17's root wiring (watched on both shapes). cobra's own `completion` group has the same hole (`app completion bashh` → 0). GO-CLI-21 closes it with one `sealGroups` walk. **Contract decided:** a bare root prints help and exits 0; a bare or mistyped *group* prints one stderr line and exits 64; `--help` and `help <cmd>` exit 0 on stdout. This matches the Rust sibling, watched: `grim` → 0, `grim config` → 64, `grim config bogus` → 64, `grim config --help` and `grim help config` → 0 (`/home/mherwig/dev/grimoire@60249496edba:src/main.rs:153-156`).
4. **SIGPIPE (CLI):** register `Notify(SIGPIPE)` and map a broken pipe to 0 in exactly one place, through a per-OS `isBrokenPipe`. On Windows a closed pipe is `ERROR_BROKEN_PIPE`/`ERROR_NO_DATA` (232), and neither matches `syscall.EPIPE` (go1.27.1 `src/syscall/syscall_windows.go:189-209`, `src/os/exec/exec_windows.go:15-22`). `cli/cli` already splits the check the same way.
5. **Output buffering (CLI):** one `bufio.Writer` is created in `run` and flushed in `run`. The flush error is joined into the command error and classified, so `> /dev/full` exits 74 instead of silently exiting 0.
6. **Signals (CLI).** This is a divergence from both dives, resolved in favour of the Rust contract's EXIT-11. The exit status comes from a *typed* cause: a `signal.Notify` channel plus `context.WithCancelCause(&SignalError{Sig})`. On Unix, `main` re-raises the signal so the parent sees `WIFSIGNALED`. The exit dive's `os.Exit(128+N)` looks right to bash (`$?`=130) but is a normal exit to any `wait()`-based parent (verified: Python sees `130`, not `-2`). The GO-CONC dive's "rely on NotifyContext's cause" is kept for messages only, because that cause is an unexported string type.
7. **Streams and terminal (CLI):**
   - stdout carries only the result. forbidigo bans `fmt.Print*`, and commands write to an injected writer.
   - The error is rendered once, sanitized with `unicode.IsControl` + `unicode.Bidi_Control`.
   - `NO_COLOR` counts only when it is non-empty, and colour is decided per fd, by the hand-rolled function. No surveyed library can be the gate unwrapped. `charmbracelet/colorprofile` v0.4.3 (the lipgloss v2 detector) parses `NO_COLOR` with `strconv.ParseBool`, so `NO_COLOR=yes` or `=0` leaves colour on. The package-level `termenv.*` functions are bound to stdout. Only `termenv.NewOutput(w)` built per stream is spec-correct, and it costs +44% binary size (GO-CLI-13/19).
   - cobra's own output (help, usage, `--version`, completion scripts) goes to the injected writer only through `root.SetOut(out)`, which must come before `InitDefaultCompletionCmd`. Without it that output bypasses `run`'s writer and lands on the real `os.Stdout`, so an in-process test sees 0 bytes. `SetOut` also moves cobra's deprecation notices onto stdout (cobra#1708, open), so deprecation warnings are the command's own stderr write (GO-CLI-20).
   - Prompts need a TTY gate and a `--yes` bypass. Paths come from `os.UserConfigDir`/`UserCacheDir`.
8. **Framework (CLI):** multi-command CLIs use cobra + pflag, and single-command tools use stdlib `flag` with `ContinueOnError`. urfave/cli v3 is not adopted: at v3.13.0 it hardcodes exit 3 for an unknown command. viper is not the default.
9. **Idempotent re-run (CLI):** a SHOULD here. The write mechanism belongs to GO-IO ([go-io/files-and-atomicity.md](go-io/files-and-atomicity.md)).
10. **Joined errors (CLI):** a report-all fan-out (GO-CONC-14's `WaitGroup` + mutex + `errors.Join`) delivers every failure, but the slice order is goroutine completion order. `classify` must therefore choose the code through its *case order*: `errors.AsType` searches the whole tree, so the first matching case wins whatever the slice order. A loop that walks `Unwrap() []error` and returns the first typed element picks a code by scheduler accident (watched: 77 vs 79 depending on the order, GO-CLI-18). The errgroup half is GO-CONC-14's evidence. It was watched in [reference-skeleton](go-cli/reference-skeleton.md) §7: errgroup delivered 1 of 3 errors and the join delivered 3 of 3. go-concurrency.md must fold that in; it is not a GO-CLI rule.

**Documented gaps (researched, no rule possible or needed):**

- **A root that takes both subcommands and its own positional arguments** has no validator shape that tells a typo from a real argument. The fleet skeleton's roots never take both. GO-CLI-17's validator rejects every leftover token. A CLI that needs both must name the ambiguity in its help text; no fixture pins a shape.
- **Commands cobra adds inside `ExecuteC`** (`help`, `completion`, `__complete`, `__completeNoDesc`) are never wrapped by `markStarted`. The *wrapping* gap is inert, because none of them returns an error whose phase matters (all exit 0 in [R] §6). *Revised:* the claim that these commands are inert overall was wrong. `completion` is a non-runnable group, so `app completion bashh` exits 0 [W]. GO-CLI-21 closes it by calling `root.InitDefaultCompletionCmd()` before `sealGroups`, and cobra then skips its own creation (`completions.go:750-755`).
- **`app help <typo>` exits 0.** cobra's built-in `help` command prints `Unknown help topic` through `c.Printf`, which writes to stdout once `SetOut` is set, and its `Run` returns nothing (`command.go:1294-1297`). Watched: exit 0 on all four group-help binaries [W]. A fix means replacing the command with `SetHelpCommand`. That is not ruled, because the invocation asked for help.
- **A group that also takes its own positional arguments** is GO-CLI-21's version of the root ambiguity above. `sealGroups` rejects every leftover token, so a group must not take positionals.
- **A group with a no-op `Run` behind a count-only `Args`** (`ExactArgs(1)`, [openeverest#2816](https://github.com/openeverest/openeverest/issues/2816)) is `Runnable()`, so GO-CLI-21's tree-walk test passes it. This stays a reading heuristic and was not watched in a fixture ([G] candidate 5).
- **The shipped consolidation fixture `go-cli-consolidation/cmd/skeleton` violates GO-CLI-20 and GO-CLI-21.** It calls `SetErr` without `SetOut` ([G] grep hit, re-run [W]). The fixture is left unmodified as evidence, and the copyable `cli-skeleton/` must take its shape from `go-cli-group-revision/fix` instead.
- **The `TraverseChildren` typo gap has no upstream tracker.** Cobra's docs are silent (`command.go:815`), so GO-CLI-17 treats it as fleet-side regardless of upstream intent.
- **The stderr order of a joined error is scheduler order.** A golden-stderr test on a concurrent batch must compare lines as a set. Only the exit code is deterministic under GO-CLI-18.
- **colorprofile is pre-1.0 (v0.4.3).** If `envNoColor` becomes a non-empty check, GO-CLI-13's colorprofile ban relaxes to a version floor. Re-check on each bump.

## The ruleset

Severity: MUST = Block, SHOULD = Warn, CONSIDER = Suggest (house tiers, config-inventory §1.6).
Every rule binds **CLI code** (`package main` and the command packages under it) unless it says
otherwise. `Watched` cites the red/green run; `[C]` means this consolidation's own run, recorded
under [Verification runs (consolidation)](#verification-runs-consolidation). `[E]` means
[exit-codes-and-signals](go-cli/exit-codes-and-signals.md) §Verification runs, and `[S]` means
[streams-and-terminal](go-cli/streams-and-terminal.md) §Verification runs. `[R]` means
[reference-skeleton](go-cli/reference-skeleton.md) §Verification runs, and `[V]` means this
revision's own runs, recorded under [Verification runs (revision)](#verification-runs-revision).
`[G]` means [group-help](go-cli/group-help.md) §Verification runs, and `[W]` means the second
revision's runs, recorded under [Verification runs (revision 2)](#verification-runs-revision-2).

### GO-CLI — caught by golangci-lint (config below, v2.14.0)

```yaml
version: "2"
linters:
  enable: [errcheck, gocritic, revive, forbidigo, exhaustive]   # on top of the go-quality baseline
  settings:
    revive: { rules: [ { name: deep-exit } ] }                   # opt-in; not in revive's default set (GO-ERR dive)
    forbidigo:
      forbid:
        - pattern: ^(fmt\.Print(f|ln)?|print|println)$
          msg: stdout is the result stream; write through the injected writer (GO-CLI-03)
    exhaustive: { default-signifies-exhaustive: false }
issues: { uniq-by-line: false }   # else deep-exit hides exitAfterDefer on the same line (GO-ERR dive, run 11-12)
```

| ID | Rule | Rationale (failure prevented) | Verification | Watched | Sev | Floor | Mirrors |
|---|---|---|---|---|---|---|---|
| GO-CLI-01 | Declare one `type ExitCode int` in one shared internal package holding the fleet table: 0, 1 (fall-through only), 64, 65, 69, 74, 75, 77, 78, 79, 80, 81, plus ocx's 82–86 in the SDK only. Allocate new codes upward from the next free slot, never in 2–63 or ≥100. Pass only `int(code)` to `os.Exit`, and check every `switch` over `ExitCode` (the CLI-04 slug, the docs table) with `exhaustive`. | Go has no closed enum, so a new code compiles unclassified, and a bare `os.Exit(3)` invents an unpinned number. | `exhaustive` (config above). Also `grep -rn --include='*.go' -E 'os\.Exit\(-?[0-9]' .`, where empty output = pass. | yes: `exhaustive` 1 issue on a switch missing `ConfigError` [E] and on `planted/exhaustive_missing` missing `ExitPolicyBlocked` [C], 0 on the full switch. The grep hit `textbook/main.go:35` and `twohook/main.go:40,42` and was empty on `skeleton` [C] | MUST | — | EXIT-01/04/06/07/08 |
| GO-CLI-02 | `main` is exactly `code := run(os.Args[1:], os.Stdout, os.Stderr); reraise(code); os.Exit(int(code))`. `run` owns every `defer`, flush and `signal.Stop`. Nothing else calls `os.Exit`, `log.Fatal*` or `cobra.CheckErr`. | `os.Exit` skips defers ([pkg.go.dev/os#Exit](https://pkg.go.dev/os#Exit)). A dropped flush still exits with the *same* code, so an exit-code test cannot see it. | revive `deep-exit` for exits outside `main`. gocritic `exitAfterDefer` for `defer` + exit in one function. `grep -rn --include='*.go' -F 'cobra.CheckErr(' .`, where empty = pass, because deep-exit does not flag it. | yes: `exitAfterDefer` flagged `planted/early_exit_violation/main.go:23:3` and was clean on the fix twin [C]. `deep-exit` watched in [go-errors/panics-exits-cleanup](go-errors/panics-exits-cleanup.md) run 1. `CheckErr` grep hit `planted/checkerr`, and `deep-exit` reported 0 issues there [C]. Output lost with exit 0 on both sides: `osexitdefer` [E], `early_exit` 0 vs 35 bytes [S] | MUST | — | EXIT-02 |
| GO-CLI-03 | stdout carries only the result. Commands write to an `io.Writer` injected from `run` (cli/cli's `IOStreams` shape), never to `fmt.Print*` or `os.Stdout` directly. Under `--format json`, a test parses the whole captured stdout. | One progress line on stdout breaks every downstream parser. | forbidigo (config above), plus one JSON-parse test per JSON subcommand. | yes: forbidigo flagged `textbook/main.go:17:57` and `twohook/main.go:29:57` and gave 0 on `skeleton` [C]. `jsonmode`: `jq` exit 5 vs 0 [S] | MUST | — | CLI-01/02 |
| GO-CLI-04 | Buffer multi-line output in one `bufio.Writer` created in `run`. After `Execute`, do `err = errors.Join(err, out.Flush())` and classify the result. Never `defer w.Flush()` with the error dropped. | `os.Stdout` is unbuffered (5.5x slower per 100k lines [S]). A dropped flush error turns a full disk into a silent exit 0 with truncated output. | `errcheck` (in the golangci `standard` set). Integration: `./cli list 10 >/dev/full; echo $?` must be 74. | yes: `errcheck` flagged `textbook/main.go:24:17 defer w.Flush()` [C]. `/dev/full`: textbook exit 0 with empty stderr, skeleton exit 74 `write /dev/stdout: no space left on device` [C] | MUST | 1.20 (`errors.Join`) | CLI-06 |

### GO-CLI — caught by an integration test on the built binary

| ID | Rule | Rationale | Verification | Watched | Sev | Floor | Mirrors |
|---|---|---|---|---|---|---|---|
| GO-CLI-05 | Map errors to codes in one ordered `classify(err) ExitCode` in `run`, in this order: broken pipe → 0; `*SignalError` → 128+N; typed errors most-specific first via `errors.AsType`; "no `RunE` started" → 64; else `ExitFailure`. The case order is also the precedence policy when a joined error holds several typed classes (GO-CLI-18). Lock every code with a test that runs a real invocation and asserts both the code and that stderr has exactly one error line (a joined error renders one line per member). | A classifier is a condition chain, so no linter can prove it total. Only a per-code test catches a new error class falling through to 1. Error-classification shape and `AsType` belong to GO-ERR ([wrapping-and-classification](go-errors/wrapping-and-classification.md)). | One table test per `ExitCode` value. `go vet` `stdversion` catches `errors.AsType` under a `go` line below 1.26 (GO-ERR dive). | yes: the skeleton matrix [C] gives 64 for four usage classes, 1 for a business error, 0 for a pipe, 74 for disk-full and 130/143 for signals | MUST | 1.26 (`errors.AsType`); else `errors.As` | EXIT-07/09/10 |
| GO-CLI-06 | A cobra CLI sets `SilenceErrors` and `SilenceUsage` on the root and wraps every `RunE` in the tree once (`markStarted`), so any untyped error returned before a `RunE` ran classifies 64. Call `markStarted(root)` after the last `AddCommand` and immediately before `ExecuteContext`, never earlier. Typed errors from `PersistentPreRunE`, such as a config load (78), are matched before that fallback, and an untyped one classifies 64. `SetFlagErrorFunc` + wrapped `Args` alone is insufficient. The unknown-subcommand case reaches 64 only when cobra reports it, which requires root `Args == nil` and `TraverseChildren == false`, or the GO-CLI-17 wiring. That holds **at the root only**: a missing or mistyped subcommand under a nested group exits 0 unless the group is sealed (GO-CLI-21). | cobra's `Execute` never exits and never assigns 64 (`spf13/cobra@adbc8813901b:command.go:1070-1073`). Unknown-subcommand errors come from `legacyArgs` (`command.go:774-776`), and required-flag errors come from `ValidateRequiredFlags` after the pre-run hooks. Neither has a hook, so both are untyped. A subcommand added after `markStarted` keeps an unwrapped `RunE`, so its business error classifies 64. | Integration: `--bogus-flag`, an unknown subcommand, a missing positional and a missing required flag each exit 64 with one stderr line. A failing `RunE` exits something other than 64 (this also catches a misordered `markStarted`). Reading heuristic: the `markStarted(root)` call is textually after every `AddCommand`. | yes [C]: textbook 1/1/1/1 with 17/3/9/9 stderr lines; two-hook 64/**1**/64/**1**; skeleton 64/64/64/64 with 1 line each; `fail` → 1 in both wired fixtures. [V] `misorder fail` → 64 (wrong) vs `ORDER=ok` → 1. [R] `hardened` (TraverseChildren + aliases + completion + version): typed pre-run 78, untyped 64, `fail` 1, `help`/`--version`/`__complete` 0. [G] the root-only limit: `app group typo` → 0 on both the plain and the hardened wiring | MUST | — | EXIT-03 |
| GO-CLI-07 | Call `signal.Notify(make(chan os.Signal, 1), syscall.SIGPIPE)` at the top of `run`. A broken pipe becomes exit 0 **only** in `classify`, through a per-OS `isBrokenPipe`: `errors.Is(err, syscall.EPIPE)` under `!windows`, and `ERROR_BROKEN_PIPE` or `syscall.Errno(232)` under `windows`. | Go's default is death by SIGPIPE (141), not the pinned 0 ([os/signal §SIGPIPE](https://pkg.go.dev/os/signal)). `Ignore`/`Notify` without the central check gives 2 or 1. `EPIPE` never matches on Windows. | `./cli list 100000 \| head -1; echo "${PIPESTATUS[0]}"` → `0` with empty stderr. `grep -rn --include='*.go' -e 'syscall.EPIPE' .` hits only the per-OS helper. Build with `GOOS=windows go vet ./...`. | yes: default 141 / naive-Notify 1 / Ignore 2 / central 0 [E]. textbook 141 vs skeleton 0 with 0 stderr bytes [C]. The Windows branch compiles (`GOOS=windows go vet` exit 0 [C]) but was **not** watched on a Windows host | MUST | — | CLI-05 |
| GO-CLI-08 | Derive the status for SIGINT/SIGTERM from a typed cause: a `signal.Notify` channel goroutine calls `cancel(&SignalError{Sig})` on a `context.WithCancelCause` context passed to `ExecuteContext`. On Unix, `main` re-raises the signal (`signal.Reset(sig)`, `syscall.Kill(os.Getpid(), sig)`, a bounded wait) so the parent sees a signal death. Never hardcode 130, and never string-match `NotifyContext`'s cause. | The Go 1.26 `NotifyContext` cause is an unexported `signalError string` with no signal accessor (go1.27.1 `src/os/signal/signal.go:352-361`). `exit(130)` cannot fake `WIFSIGNALED`, so a calling shell script does not abort ([cracauer](https://www.cons.org/cracauer/sigint.html)). | `kill -INT`/`-TERM` on a blocked command: bash `$?` = 130/143. A `wait()`-based parent (Python `returncode`) sees −2/−15. Reading heuristic: no literal 130/143 in the exit path. | yes [C]: without the delivery wait, the process `os.Exit`ed first and Python saw 130/143. With re-raise it saw −2/−15, and bash saw 130/143 both ways. The typed channel gave 130/143 [E] | SHOULD | 1.20 (`WithCancelCause`) | EXIT-11 |
| GO-CLI-09 | Prompt only when `term.IsTerminal(int(os.Stdin.Fd()))` is true and no `--yes`/`--no-input` was passed. Otherwise return a `*UsageError`, don't `os.Exit(64)` inline. Read secrets from `--password-file`, stdin, or `term.ReadPassword` behind the same gate, and never from a flag value or a plain env var. | An ungated prompt on an open, silent stdin pipe hangs CI forever. Flag values leak into `ps`; env vars leak into `/proc` and CI logs. | `timeout 2 ./cli delete < <(sleep 100); echo $?` → 64 immediately, never 124. Reading heuristic for secrets: `grep -rn --include='*.go' -e '"password"' -e '"token"' -e '"secret"' .` on flag definitions and `os.Getenv`. | prompt: yes, 124 vs 64 vs 0 with `--yes` [S]. Secrets: no, a reading heuristic by design, because a flag *name* cannot show intent | MUST | — | CLI-09/11 |
| GO-CLI-10 | A mutating subcommand is safe to re-run after a crash. Stage the change and make the commit atomic and idempotent: temp file + `Sync` + `Rename` (the mechanism belongs to GO-IO), and treat a registry "already exists" as success. | Append-in-place plus retry duplicates records after an ordinary Ctrl-C or OOM kill. | A crash-then-retry integration test asserts the output is byte-identical to one clean run. | yes: append gave 2 lines vs rename 1 [E] | SHOULD | — | durable-state shape |
| GO-CLI-17 | Declare global flags as root `PersistentFlags` and leave `TraverseChildren` unset: `app --flag sub` already parses without it. If a root sets `TraverseChildren` or any non-nil `Args`, it must be runnable (`RunE` returning `cmd.Help()` for zero args), and its `Args` must return a `*UsageError` for any leftover token (`unknown command %q for %q`). | `Find` calls `legacyArgs` only when `Args == nil` (`spf13/cobra@adbc8813901b:command.go:774-778`). `Traverse` never calls it and returns a nil error on the first unmatched token (`command.go:823-825`). On a non-runnable root, `execute` returns `flag.ErrHelp` before `ValidateArgs` (`command.go:955-957`), so the typo prints usage to stdout and exits 0 *even with* a rejecting `Args`. `cobra.NoArgs` is safe only by coincidence of wording. This rule closes the **root** only: `hardened-group`, which carries this wiring, still exits 0 on `app group typo` [G]. Nested groups need GO-CLI-21. | Integration: `./cli <typo>; echo $?` → 64 with one stderr line and empty stdout (GO-CLI-06's case, run against the real root). Reading heuristic: `grep -rn --include='*.go' -e 'TraverseChildren' -e 'Args:' .` on the root literal, then confirm the root has a `RunE` and a rejecting validator. | yes: [R] custom `Args` `gett` → 0 (root ran), `traverse subz` → 0, `traverse_off` → 1 (unwired), `hardened gett` → 64. [V] non-runnable `travnr subz` → 0 with 12 usage lines on stdout; `travnr_fix` (rejecting `Args`, still non-runnable) → **0**; `travnr_runnable` → 64, 1 stderr line; `persist --name x --verbose sub` parses without `TraverseChildren` | MUST | — | EXIT-03 |
| GO-CLI-18 | When the error can be an `errors.Join` (a report-all batch, GO-CONC-14), choose its code through `classify`'s case order: the first case whose `errors.AsType` matches anywhere in the tree wins. Never pick the code by walking `Unwrap() []error` and returning on the first typed element. Order the cases by the precedence you want for co-occurring classes, and state it in a comment. | A report-all batch appends in goroutine completion order, not input order (the order was `c, a, b` for inputs `a, b, c` [R]). A slice-walk therefore hands out a code by scheduler accident, and scripts see a flaky exit status. `errors.AsType` searches the whole tree ([pkg.go.dev/errors](https://pkg.go.dev/errors)), so the case chain is deterministic. GO-ERR-18's slice-walk is for *counting or reporting* every match, not for picking one code. | Unit test: classify `errors.Join(a, b)` and `errors.Join(b, a)` with two distinct typed classes and assert equal codes. | yes [V]: slice-walk `[nf,pe]`=79 vs `[pe,nf]`=77, `MODE=slicewalk` exit 1; chain 77/77, `MODE=chain` exit 0. [R] `verify_joined` (slice-walk) gave 79 on 5/5 runs, stable only by accident | MUST | 1.26 (`errors.AsType`); 1.20 (`errors.Join`) | EXIT-07 |
| GO-CLI-20 | In `run`, call `root.SetOut(out)` alongside `root.SetErr(stderr)`, where `out` is the same buffered writer the commands receive. Call it after the last `AddCommand` and **before** `root.InitDefaultCompletionCmd()` and `ExecuteContext`. Never use cobra's deprecation machinery (`Deprecated:` on a `Command`, `Mark*Deprecated` on a flag). Print the deprecation warning to stderr from the command's own code. | cobra renders help, usage and `--version` through `c.OutOrStdout()`, which falls back to the real `os.Stdout` when no ancestor called `SetOut` (`spf13/cobra@adbc8813901b:command.go:392-420`). An in-process test of `run(args, &buf, &buf)` then sees 0 bytes and exit 0, which blinds GO-CLI-05/06/21's per-code tests. The completion command captures `c.OutOrStdout()` when it is created (`completions.go:798`), so a later `SetOut` misses it. `OutOrStderr()` also resolves to `outWriter` once `SetOut` is set, so cobra's deprecation notices move from stderr to stdout and break GO-CLI-03 ([spf13/cobra#1708](https://github.com/spf13/cobra/issues/1708), open; cli/cli declines `SetOut` for this reason, `pkg/cmd/root/root.go:99-100`). | In-process test: `run([]string{"<group>", "--help"}, &out, &errb)` and `run([]string{"completion", "bash"}, &out, &errb)` each exit 0 with `out.Len() > 0`. Deprecation: `grep -rn --include='*.go' -E 'Deprecated: *"\|Mark(Shorthand\|PersistentFlag)?Deprecated\(' .`, where empty = pass (a `// Deprecated:` doc comment does not match). Locator only: `grep -rl --include='*.go' -F '.SetErr(' . \| xargs -r grep -L -F '.SetOut('` lists files that wire stderr but not stdout, and each hit gets a read because `SetOut` may live in another file. | yes: [G] harness captured 0 vs 175 bytes for `app group`. [W] `TestHelpReachesInjectedStdout` failed on `violation` (0 bytes) and passed on `fix`. `TestCompletionReachesInjectedStdout` failed with `SetOut` after `InitDefaultCompletionCmd` (0 bytes) and passed with it before. The deprecation measurement: without `SetOut` the notices reach neither captured buffer, and with `SetOut` both land in captured stdout. The deprecation grep hit `deprecation/dep_test.go:14,17` (exit 0) and was empty on `fix` and on a doc-comment probe (exit 1). The locator grep hit `violation/app.go`, `harness/main.go` and the shipped `go-cli-consolidation/cmd/skeleton/main.go`, and was empty on `fix` and `harness-fixed`. **The dive's `grep -rl 'func run(' \| xargs -r grep -L '.SetOut('` stayed green on a planted violation (0 hits on `violation`, whose entrypoint is `Run`), so it was replaced** | MUST | — | CLI-01/02 |
| GO-CLI-21 | Every non-root command that has subcommands must be runnable. Its `RunE` returns a `*UsageError` for whatever reaches it: `%q requires a subcommand` for zero args, `unknown command %q for %q` for a leftover token, both classified 64 with one stderr line and a `see <path> --help` hint. Apply this with one `sealGroups(root)` walk that sets that `RunE` on each `c.HasParent() && c.HasSubCommands() && !c.Runnable()`. Run it after the last `AddCommand` and after `root.InitDefaultCompletionCmd()`, so cobra's own `completion` group is sealed too. Never "fix" a group with `cmd.Help()` as its `RunE` (exit 0), with `Args: cobra.NoArgs` (the `Runnable()` gate fires first), or with a no-op `Run` behind a count-only `Args`. The root is exempt: a bare root prints help and exits 0. | `legacyArgs` checks membership only when `!cmd.HasParent()` (`spf13/cobra@adbc8813901b:args.go:24-39`: "subcommands will always accept arbitrary arguments"). `execute` then returns `flag.ErrHelp` for `!c.Runnable()` (`command.go:955-957`), and `ExecuteC` turns that into a help print with a nil error (`command.go:1149-1153`). A script cannot tell `app group typo` from `app group --help`. The help flag is checked before the `Runnable()` gate (`command.go:924-936`), so sealing leaves `--help` and `help <group>` untouched. The `RunE`'s error is typed, so it classifies 64 whether or not `markStarted` wrapped it. | Unit test: walk `root.Commands()` recursively and fail on any `c.HasParent() && c.HasSubCommands() && !c.Runnable()`. Integration (per group): bare → 64 and `<typo>` → 64, each with one stderr line and empty stdout; `--help` and `help <group>` → 0 with usage on stdout; a real child → 0; `completion <typo>` → 64. Reading heuristic for the no-op-`Run` variant: `grep -rn --include='*.go' -e 'cobra.ExactArgs(' -e 'cobra.RangeArgs(' -e 'cobra.MinimumNArgs(' .` on commands that also call `.AddCommand(`. | yes: [G] `skeleton-group` and `hardened-group` gave 0/11/0 for bare, `--help`, `help group` and typo; the `-fixed` twins gave 64/0/1 for bare and typo, 0/12/0 for help, and `leaf` 0 on both. [W] re-ran that matrix with identical results, plus `completion bashh` → 0 on all four binaries. The fixture's `TestGroupsSealed` failed on `violation` (`"app group" has subcommands but no RunE`) and passed on `fix`. `TestGroupInvocations` failed on `violation` (`[group]`, `[group typo]` and `[completion bashh]` exit 0, want 64) and passed on `fix`. No-op-`Run` variant: **not watched** | MUST | — | EXIT-03 |

### GO-CLI — caught by grep and a named reading heuristic

| ID | Rule | Rationale | Verification | Watched | Sev | Floor | Mirrors |
|---|---|---|---|---|---|---|---|
| GO-CLI-11 | Render the error chain once, in `run`, to stderr. Pass it through a named `sanitize` that replaces C0/C1 controls (except `\n`, `\t`) and `unicode.Bidi_Control` runes. `%q` is not the sanitizer, and cli/cli's `ContentOut` sanitizer shape covers wire content written to stdout. | CWE-150: registry- or Git-supplied names carry ESC/OSC/U+202E ([GHSA-fwjx-9p69-h25h](https://github.com/advisories/GHSA-fwjx-9p69-h25h)). Cobra's own `Error:` print plus `main`'s print renders the error twice. | Structural test: an error containing `\x1b` and U+202E reaches stderr with zero raw bytes of either. Reading heuristic: every stderr error write routes through `sanitize`. | yes: `%s` leaked 1 ESC + 1 U+202E vs 0/0 [S]. The skeleton `fail` printed both as U+FFFD. The textbook printed the error twice, `Error:` + usage + `error:` [C] | MUST | — | CLI-03 |
| GO-CLI-12 | Never forward `(*exec.ExitError).ExitCode()` unchecked. If `ws, ok := ee.Sys().(syscall.WaitStatus); ok && ws.Signaled()`, forward `128+int(ws.Signal())`. A signal-killed child never maps to success. No build tag is needed, because Windows' `WaitStatus.Signaled()` compiles and returns false. | `ExitCode()` is −1 on signal death ([pkg.go.dev/os#ProcessState.ExitCode](https://pkg.go.dev/os#ProcessState.ExitCode)), and `os.Exit(-1)` becomes 255, a plausible wrong number. | `grep -rn --include='*.go' -F '.ExitCode()' .`, then read each hit on an `*exec.ExitError`. Test: a child that kills itself with SIGTERM makes the parent exit 143. | yes: bare 255 vs checked 143 [E]. `planted/waitstatus` → 143, and `go vet` passes for linux/windows/darwin [C] | MUST | 1.26 if `errors.AsType` | EXIT-05 |
| GO-CLI-13 | Decide colour per stream in one module: `--color auto\|always\|never`, then `os.Getenv("NO_COLOR") != ""`, then `TERM=dumb`, then `term.IsTerminal(fd) \|\| isatty.IsCygwinTerminal(fd)`. Never use `os.LookupEnv("NO_COLOR")`. Never let a library decide in place of that function: not `fatih/color`'s package-global `NoColor`, not the package-level `termenv.EnvNoColor()`/`ColorProfile()` (both bound to stdout at init), and not `colorprofile.Detect`/`Env` (lipgloss v2), unless the `NO_COLOR` check above has already short-circuited ahead of it. | [no-color.org](https://no-color.org/): "present and not an empty string". A presence check disables colour for `NO_COLOR=""`, and a shared decision is wrong when only one stream is redirected. `colorprofile@v0.4.3:env.go` `envNoColor` uses `strconv.ParseBool`, so `NO_COLOR=yes`, `=0` or `=anything` leave colour on. | `grep -rn --include='*.go' -F 'LookupEnv("NO_COLOR")' .`, and `grep -rn --include='*.go' -e 'colorprofile\.\(Env\|Detect\)(' -e 'termenv\.\(EnvNoColor\|ColorProfile\|EnvColorProfile\)()' .`. Empty output from both = pass; a colorprofile hit passes only if a `NO_COLOR` short-circuit precedes it. Reading heuristic: the colour function takes an fd. | yes: the first grep hit `colour/violation/main.go:16` and was empty on `colour/fix` [C]. The pty run showed violation `false/false` vs fix `true/true` under `NO_COLOR=""` [S]. [V] the first grep **stayed green** (exit 1) on a colorprofile violator, so the second grep was added: it hit `planted/colour_violation/main.go:12,13` (exit 0) and was empty on `colour_fix` (exit 1). [R] six-value table: colorprofile disabled colour for `1`/`true` only; `termenv.NewOutput(w).EnvNoColor()` for every non-empty value | MUST | — | CLI-07 |
| GO-CLI-14 | Take config, cache and data directories from `os.UserConfigDir()`/`os.UserCacheDir()`, never from a `HOME`/`USERPROFILE` join. Prefix every tool env var (`OCX_`, `GRIM_`). | The hand-rolled join ignores `XDG_CONFIG_HOME` and is wrong on Darwin and Windows. It agrees with the stdlib only on a developer's unset-XDG shell. | `grep -rn --include='*.go' -e 'Getenv("HOME")' -e 'Getenv("USERPROFILE")' .`, with hits outside the platform-conventions module counted as findings. | yes: the grep hit `configpaths/violation/main.go:13` and was empty on `fix` [C]. The runtime check showed `~/.config/fw` vs the XDG path [S] | MUST | 1.13 | CLI-13 |
| GO-CLI-15 | Apply precedence flags > env > project > user > system as an explicit highest-first walk over named layers. Do not add `spf13/viper` unless remote providers or hot reload are real requirements; `knadh/koanf` is the fallback for multi-format or multi-provider config. | viper links 5.19 MB and 47 `go.sum` entries for one `SetDefault` (koanf: 2.07 MB / 12). It does not deep-merge, and cobra-cli's scaffold wires it in by default. | A two-layer test (the higher layer wins, and removing it exposes the next). `grep -rn --include=go.mod -F 'spf13/viper' .`, where a hit needs a stated reason. | precedence: yes [S]. viper: measurement only, not red/green [S] | SHOULD | — | CLI-15 |
| GO-CLI-16 | Build multi-command CLIs on cobra + pflag, with global flags as root `PersistentFlags` (without `TraverseChildren`, GO-CLI-17) and completions from cobra's generator. Build single-command tools on stdlib `flag` with `ContinueOnError`. Do not adopt urfave/cli v3. | urfave v3.13.0 returns `Exit(errMsg, 3)` for an unknown command (`help.go:319-322`). Its own exit-code example ends in `log.Fatal`, which discards `ExitCoder`. Owner Q3 default. | `./cli nosuchcmd; echo $?` → 64. | yes: urfave 3, cobra 64, stdlib 64 [S] | SHOULD | — | CLI-10/14 |
| GO-CLI-19 | Do not add a colour dependency to make the colour decision; `golang.org/x/term`, already required by GO-CLI-09, covers it. Add a styling library only for styled output. If it is termenv, construct `termenv.NewOutput(w)` once per stream. A lipgloss v2 / colorprofile user still gates on GO-CLI-13's function. | The hand-rolled function is spec-correct and smallest. termenv adds +671,744 B (+44.3%) and colorprofile adds +1,138,791 B (+75.1%) to a stripped linux/amd64 binary [R] §9. The most-trained-on library (lipgloss v2) carries the `ParseBool` defect. | `grep -rn --include=go.mod -e 'muesli/termenv' -e 'charmbracelet/colorprofile' -e 'charm.land/lipgloss' -e 'fatih/color' .`, where a hit needs a stated styled-output reason. | measurement only, not red/green: [R] size table (1,515,680 / 2,187,424 / 2,654,471 B) | SHOULD | — | CLI-07 |

**Cross-family note (not a GO-CLI rule):** the report-all half of the reference-skeleton dive, where `errgroup.WithContext` delivered 1 of 3 errors and `WaitGroup` + mutex + `errors.Join` delivered 3 of 3 ([R] §7), is GO-CONC-14's watched run. go-concurrency.md folds it; GO-CLI-18 owns only the code selection.

**Transferred unchanged, no Go-specific rule:** CLI-04 (the pinned JSON envelope; slugs come
from the GO-CLI-01 switch), CLI-08, CLI-12 and CLI-16. The Rust wording applies, so the
Go file points at it rather than restating it (config-inventory §4 classifies all four as neutral).

**Dropped as a separate rule:** exit dive candidate 8 (a Windows child cannot receive SIGTERM:
`Process.Signal` returns `EWINDOWS`, go1.27.1 `src/os/exec_windows.go:55-77`). It belongs to
GO-IO ([subprocess-contract](go-io/subprocess-contract.md) §10, job objects), not to the CLI
contract.

### Verification runs (consolidation)

Fixture module `…/fixtures/go-cli-consolidation/` (cobra v1.10.1, `go 1.27`). It has three binaries on one
four-subcommand tree: `textbook` (the `if err := root.Execute(); err != nil { os.Exit(1) }` shape),
`twohook` (the exit dive's `SetFlagErrorFunc` + `wrapArgs`), and `skeleton` (every rule above, 250
lines in 6 files). The directory also holds the planted twins under `planted/`. All builds and lints ran through
`/home/mherwig/.cache/research-lang/go-tools/run.sh`.

```text
$ run.sh go build -o bin/ ./cmd/...        # exit 0
# columns: [args]=exit/stderr-lines; pipe = PIPESTATUS[0] of `list 100000 | head -1`; full = exit of `list 10 >/dev/full`
textbook  [--bogus]=1/17L [bogussub]=1/3L [get]=1/9L [get x]=1/9L [fail]=1/8L pipe=141 full=0
twohook   [--bogus]=64/1L [bogussub]=1/1L [get]=64/1L [get x]=1/1L [fail]=1/1L     (no list command)
skeleton  [--bogus]=64/1L [bogussub]=64/1L [get]=64/1L [get x]=64/1L [fail]=1/1L pipe=0 full=74
# get = missing positional (ExactArgs(1)); get x = missing required --ref; skeleton full: "error[io_error]: write /dev/stdout: no space left on device"

$ run.sh golangci-lint run ./cmd/textbook/     # exit 1
cmd/textbook/main.go:24:17: Error return value of `w.Flush` is not checked (errcheck)
cmd/textbook/main.go:17:57: use of `fmt.Println` forbidden because "stdout is the result stream; ..." (forbidigo)
$ run.sh golangci-lint run ./cmd/skeleton/     # exit 0, "0 issues."   (staticcheck ./cmd/skeleton/ also exit 0)
$ run.sh golangci-lint run ./planted/exhaustive_missing/   # exit 1
planted/exhaustive_missing/exitcode.go:24:2: missing cases in switch of type main.ExitCode: main.ExitPolicyBlocked (exhaustive)
$ run.sh golangci-lint run --enable-only=gocritic ./planted/early_exit_violation/   # exit 1  (copy of [S] violation_early_exit)
planted/early_exit_violation/main.go:23:3: exitAfterDefer: os.Exit will exit, and `defer w.Flush()` will not run (gocritic)
$ run.sh golangci-lint run --enable-only=gocritic ./planted/early_exit_fix/          # exit 0, "0 issues."
$ run.sh golangci-lint run --enable-only=revive ./planted/checkerr/                  # exit 0 — deep-exit misses cobra.CheckErr
$ grep -rn --include='*.go' -F 'cobra.CheckErr(' planted                              # exit 0, 1 hit -> the grep is the check

# signals (skeleton `wait` blocks on ctx):
$ bash: ./skeleton wait & kill -INT  -> exit=130 ; kill -TERM -> exit=143
$ python3 Popen(...).send_signal: SIGINT returncode=-2, SIGTERM returncode=-15    (re-raise build)
$ same, before the bounded wait was added (os.Exit ran before delivery): returncode=130 / 143  (normal exit)

# cross-OS: GOOS=windows|darwin run.sh go vet ./cmd/skeleton/ ./planted/waitstatus/   -> exit 0 each
$ bin/waitstatus bin/selfterm.sh   # child: kill -TERM $$              -> parent exit=143
```

### Verification runs (revision)

Fixture module `…/fixtures/go-cli-revision/` (module `clirev`, `go 1.27`, cobra v1.10.1,
termenv v0.16.0, colorprofile v0.4.3). All builds ran through `run.sh`; the binaries ran under
bash. Format: `exit / stdout lines / stderr lines`.

```text
$ run.sh go build -o bin/ ./cmd/... ./planted/...   # exit 0
$ run.sh go vet ./...                              # exit 0
$ run.sh gofmt -l .                                # empty

# GO-CLI-17 — non-runnable root + TraverseChildren (cobra command.go:955-957 flag.ErrHelp gate)
bin/travnr subz            0 / 12 ("Usage:") / 0     <- typo silently prints help
bin/travnr_fix subz        0 / 12 / 0                <- rejecting Args alone does NOT help a non-runnable root
bin/travnr_runnable subz   64 / 0 / 1  error: unknown command "subz" for "app"
bin/travnr_runnable sub    0 / 1 / 0   ; bin/travnr_runnable (no args) 0 / 13 usage lines / 0
bin/persist --verbose sub          0  sub ran verbose=true name=""      (no TraverseChildren)
bin/persist --name x sub           0  sub ran verbose=false name="x"
bin/persist --name=x --verbose sub 0  sub ran verbose=true name="x"

# GO-CLI-06 — markStarted ordering
bin/misorder fail          64 / 0 / 1   (markStarted before AddCommand: business error misread as usage)
ORDER=ok bin/misorder fail  1 / 0 / 1

# GO-CLI-18 — joined-error code selection, both slice orders
MODE=slicewalk bin/joinchain   exit 1   slicewalk: [nf,pe]=79 [pe,nf]=77
MODE=chain     bin/joinchain   exit 0   chain:     [nf,pe]=77 [pe,nf]=77

# GO-CLI-13 — the second grep
$ grep -rn --include='*.go' -F 'LookupEnv("NO_COLOR")' planted/colour_violation        # exit 1 (old grep misses it)
$ grep -rn --include='*.go' -e 'colorprofile\.\(Env\|Detect\)(' -e 'termenv\.\(EnvNoColor\|ColorProfile\|EnvColorProfile\)()' planted/colour_violation   # exit 0
planted/colour_violation/main.go:12:	p := colorprofile.Detect(os.Stderr, os.Environ())
planted/colour_violation/main.go:13:	fmt.Fprintln(os.Stderr, p, termenv.EnvNoColor())
$ (same grep) planted/colour_fix                                                         # exit 1, empty

# re-run of [R] binaries (fixtures/reference-skeleton/bin), same results as recorded:
hardened gett 64/0/1 · hardened fail 1/0/1 · traverse subz 0/1/0 · traverse_off subz 1/0/11
customvalidator gett 0/1/0 · noargs gett 1/0/17 · colour_probe NO_COLOR=yes|0 -> colorprofile TrueColor, termenv true
```

### Verification runs (revision 2)

Fixture module `…/fixtures/go-cli-group-revision/` (module `gocligroup`, `go 1.27`, cobra v1.10.1).
It has three packages. `violation` has the shipped skeleton's shape: `SetErr` only, and a `group` with
no `RunE`. `fix` adds `SetOut(out)` before `InitDefaultCompletionCmd()` and `sealGroups`. `deprecation`
holds the `SetOut` side-effect measurement. The group-help binaries were re-run read-only from
`…/fixtures/group-help/bin`, and grimoire from its own release build.

```text
$ run.sh go vet ./...   # exit 0      $ run.sh gofmt -l .   # empty

# GO-CLI-21 / GO-CLI-20 — planted twins (the same *_test.go in both packages)
$ run.sh go test -count=1 ./violation/          # exit 1
--- FAIL: TestGroupsSealed          "app group" has subcommands but no RunE: bare/typo invocations exit 0
--- FAIL: TestHelpReachesInjectedStdout   group --help: code=0 captured stdout=0 bytes, want 0 and >0
--- FAIL: TestGroupInvocations      [group] exit 0, want 64 · [group typo] exit 0, want 64 · [completion bashh] exit 0, want 64
--- FAIL: TestCompletionReachesInjectedStdout   completion bash: code=0 captured stdout=0 bytes
$ run.sh go test -count=1 -v ./fix/            # exit 0, all four PASS
# ordering: fix with SetOut moved after InitDefaultCompletionCmd (into Run)
--- FAIL: TestCompletionReachesInjectedStdout   completion bash: code=0 captured stdout=0 bytes   (script leaked to the real fd 1)

# GO-CLI-20 — what SetOut does to cobra's deprecation notices (deprecation/dep_test.go, t.Log)
SetOut=false [old]            captured stdout=""  stderr=""     (notice goes to the real os.Stderr)
SetOut=false [leaf --legacy]  captured stdout=""  stderr=""
SetOut=true  [old]            captured stdout="Command \"old\" is deprecated, use new\n"
SetOut=true  [leaf --legacy]  captured stdout="Flag --legacy has been deprecated, use --modern\n"

# GO-CLI-20 greps
$ grep -rn --include='*.go' -E 'Deprecated: *"|Mark(Shorthand|PersistentFlag)?Deprecated\(' deprecation   # exit 0, 2 hits (:14, :17)
$ (same) fix ; (same) violation ; (same) on a `// Deprecated: use Build2.` probe                     # exit 1, empty
$ grep -rl --include='*.go' -F '.SetErr(' <dir> | xargs -r grep -L -F '.SetOut('
  violation -> violation/app.go · group-help harness -> harness/main.go · go-cli-consolidation/cmd/skeleton -> main.go
  fix -> empty · group-help harness-fixed -> empty
$ grep -rl --include='*.go' -F 'func run(' violation | xargs -r grep -L -F '.SetOut('   # empty: the dive's grep misses `func Run(`

# GO-CLI-21 — group-help binaries re-run (exit / stdout lines / stderr lines)
skeleton-group, hardened-group:            group, group --help, help group, group typo  -> 0/11/0 ; group leaf 0/1/0
skeleton-group-fixed, hardened-group-fixed: group, group typo -> 64/0/1 ; group --help, help group -> 0/12/0 ; group leaf 0/1/0
all four: completion 0/16/0 · completion bashh 0/16/0 · help bogus -> exit 0 ("Unknown help topic")

# contract precedent — grimoire@60249496edba target/release/grim (clap, Rust)
grim 0/42/0 · grim config 64/0/22 · grim config bogus 64/0/5 ("error: unrecognized subcommand 'bogus'")
grim config --help 0/59/0 · grim help config 0/59/0
```

## Applied to the exemplars and the future consumers

| Rule | Satisfies | Violates |
|---|---|---|
| GO-CLI-02 | `cli/cli@9b031151a825:cmd/gh/main.go:10-11` (a 2-line `main`) | 285 `os.Exit` + 359 `log.Fatal*` outside `main` corpus-wide ([code-shape](go-audit/exemplar-code-shape.md) §4). `aquasecurity/trivy@ae561f8cca36:cmd/trivy/main.go:19-28` classifies in `main` and then calls `log.Fatal` |
| GO-CLI-05/06 | `cli/cli@9b031151a825:internal/ghcmd/cmd.go:187-212` (ordered `AsType` chain) with `pkg/cmd/root/root.go:106-107` (both `Silence*`). `aquasecurity/trivy@ae561f8cca36:pkg/commands/app.go:338` (`SetFlagErrorFunc`). This corrects the exit dive, which found no user; cli/cli has 5 files | `oras-project/oras@a0cd4de5cfcd:cmd/oras/main.go:32-35`: every error, usage included, exits 1. `sigstore/cosign@907c3d899c0e:cmd/cosign/main.go:64-70` forwards its own codes, which are unrelated to sysexits |
| GO-CLI-07 | `cli/cli@9b031151a825:pkg/iostreams/epipe_other.go` + `epipe_windows.go` (the per-OS split, Errno 232), mapped to `exitOK` at `internal/ghcmd/cmd.go:200-202`, but for the pager only. `caddyserver/caddy@54937914234b:sigtrap_posix.go:34` `Ignore(SIGPIPE)` | none of oras, ko, cosign, restic, fzf, goreleaser or trivy registers SIGPIPE (grep over the 8 CLI clones), so a closed stdout pipe gets Go's default death by signal (141, [E]) |
| GO-CLI-08 | none measured | `restic/restic@5127c4abf921:cmd/restic/main.go:234-235` maps `context.Canceled` → hardcoded 130 (SIGTERM included). `oras@a0cd4de5cfcd:cmd/oras/main.go:27` catches `os.Interrupt` with `NotifyContext`, then exits 1. `NotifyContext` 17 vs `Notify` 71 ([runtime-posture](go-audit/exemplar-runtime-posture.md) §2) |
| GO-CLI-12 | `planted/waitstatus` only | `cli/cli@9b031151a825:internal/ghcmd/cmd.go:209-210` returns `exitCode(extError.ExitCode())` on `ExternalCommandExitError`, which embeds `*exec.ExitError` (`pkg/cmd/root/extension.go:18-19`). A signal-killed extension exits 255 |
| GO-CLI-11 | `cli/cli@9b031151a825:pkg/iostreams/iostreams.go:59-66,500-508,544` (`ContentOut` sanitizer on by default) | GHSA-fwjx-9p69-h25h (oh-my-posh ≤29.35.0), outside the corpus |
| GO-CLI-13 | `aquasecurity/trivy@ae561f8cca36:src/options.go:726` (`!= ""`). `junegunn/fzf@b1be3a8be1b8:src/util/util.go:79` (isatty + Cygwin) | `fatih/color@v1.19.0:color.go:22,49` (a trivy dependency) decides colour once, against stdout only. `charmbracelet/bubbletea@d5bfd5c2ff74:tea.go:1091` calls `colorprofile.Detect(p.output, p.environ)` with no `NO_COLOR` check anywhere in the file, so every default bubbletea program ignores `NO_COLOR=yes` |
| GO-CLI-17 | none: `TraverseChildren` appears corpus-wide only in cobra's own source (6 files) and a vendored cobra copy in `google/go-containerregistry` (3 files) | cli/cli sets neither `TraverseChildren` nor a root `Args` (`pkg/cmd/root/root.go`), so the gap is unexercised in the corpus |
| GO-CLI-18 | `cli/cli@9b031151a825:internal/ghcmd/cmd.go:187-212`: a case-ordered chain, deterministic by construction | none measured; the slice-walk shape exists only in the dive's `verify_joined` fixture |
| GO-CLI-20 | `cli/cli@9b031151a825:pkg/cmd/root/root.go:99-100,112-116`: it declines `SetOut` because of cobra#1708 and instead routes help through its own `SetHelpFunc`/`SetUsageFunc` to `IOStreams.Out`/`ErrOut` (`pkg/cmd/root/help.go:92-114`). That is the same intent reached by a longer route | the shipped `go-cli-consolidation/cmd/skeleton/main.go:55-58` (`SetErr` without `SetOut`) |
| GO-CLI-21 | none in the corpus. The Rust sibling `grimoire@60249496edba` exhibits the contract (Verification runs, revision 2). `cli/cli` partly: its `rootHelpFunc` reports `unknown command` for `!Runnable() && len(args) > 0` and sets a package-global `hasFailed` → exit 1 (`pkg/cmd/root/help.go:108-112`, `internal/ghcmd/cmd.go:238-239`). A bare `gh auth` still exits 0, and the typo gets 1, not 64 | `restic/restic@5127c4abf921:cmd/restic/cmd_key.go:9-26` (`restic key`: `AddCommand` with no `RunE` and no help override, so a typo exits 0). `cli/cli@9b031151a825:pkg/cmd/auth/auth.go:17-32` has the same shape, rescued only by the help-func side channel above |
| GO-CLI-14/15/16 | cli/cli uses neither viper nor koanf | cobra's user guide scaffolds `viper.BindPFlag` ([S] Sources) |

**New commitments.** No exemplar ships the 64–86 table (the exit dive's Exemplar evidence), so the whole ExitCode layer is new for fleet Go CLIs.

- **Go CLIs:** all 21 rules. The shape is the fixture `skeleton` (non-runnable root, `Args` nil, no `TraverseChildren`) **plus the two fixes it lacks**: `root.SetOut(out)` before `InitDefaultCompletionCmd()`, and `sealGroups(root)` (GO-CLI-20/21, taken from `go-cli-group-revision/fix`). `hardened` in [R] shows the extra wiring GO-CLI-17 demands if a root ever needs `TraverseChildren`. The exit dive's open question about a shared support package is settled: `ExitCode`, `UsageError`, `SignalError`, `classify`, `markStarted`, `sealGroups`, `isBrokenPipe`, `sanitize` and `reraise` ship as one copyable reference in the go-quality support directory (`cli-contract.md` + a `cli-skeleton/` example). They are not a published module, because EXIT-08 keeps one taxonomy per workspace.
- **Go SDK (library code):** GO-CLI-01 (it mirrors ocx's full 0–86 table as the `Code` of one `*ExitError`, per GO-ERR) and GO-CLI-12 (decoding a signal-killed `ocx`). The SDK must never exit, print, or register signals: GO-CLI-02/03/07/08 invert into "a library does none of this" (GO-ERR `deep-exit`).
- **Mirrored release artifacts:** no GO-CLI rule applies. Those binaries are consumed, not authored.

## AI-agent failure modes

Ranked by how often each one bites; the first four appear in every cobra `main` an agent writes.

1. **The textbook `if err := root.Execute(); err != nil { os.Exit(1) }`.** It gives one exit code for every error class, prints the error twice, and dumps usage on business errors. The audit itself believed cobra exits 1 by itself (config-inventory §4 EXIT-03, and [S] rule 12); it never does (`command.go:1070-1073`). *Check:* the GO-CLI-06 four-case integration test.
2. **`defer w.Flush()` with the error dropped**, or placed ahead of an `os.Exit`. *Check:* `errcheck` + gocritic `exitAfterDefer`. Both dives claimed no linter covers this; that is refuted ([C]).
3. **Assuming Go handles a closed pipe like Rust.** It dies with 141, and on Windows `syscall.EPIPE` never matches. *Check:* the GO-CLI-07 `| head -1` test.
4. **`fmt.Println` of progress in a JSON command.** *Check:* forbidigo.
5. **Trusting `ExitError.ExitCode()`** on a signal-killed child, which gives 255 (cli/cli does this). *Check:* the GO-CLI-12 grep + SIGTERM-child test.
6. **Assuming `NotifyContext`'s 1.26 cause exposes the signal**, or hardcoding 130 on `context.Canceled` (restic does). *Check:* the GO-CLI-08 `wait()`-status test.
7. **`os.LookupEnv("NO_COLOR")`**, and using `fatih/color` globals across two streams. *Check:* the GO-CLI-13 grep.
8. **An ungated prompt**, which hangs CI. *Check:* the GO-CLI-09 `timeout` test.
9. **Copying urfave's exit-code example** (`log.Fatal`) or adding viper from cobra-cli's scaffold. *Check:* GO-CLI-15/16 greps.
10. **`cobra.CheckErr` in `main`**, a library exit that `deep-exit` misses. *Check:* the GO-CLI-02 grep.
11. **Setting `TraverseChildren: true` "so global flags can come first"**, or giving the root a custom `Args`. Unknown-subcommand detection silently vanishes, and persistent flags never needed it. *Check:* the GO-CLI-17 `<typo>` test.
12. **Classifying a joined error by walking its slice** and commenting "NotFound takes precedence", when the winner is whichever goroutine finished first. *Check:* the GO-CLI-18 both-orders test.
13. **Reaching for lipgloss v2 / colorprofile, or the package-level `termenv.EnvNoColor()`, for the `NO_COLOR` check.** *Check:* the second GO-CLI-13 grep.
14. **Calling `markStarted` before `AddCommand`** ("set up wrapping, then build the tree"). *Check:* GO-CLI-06's failing-`RunE` case.
15. **Building a command group the way cobra's docs show it**: `AddCommand` on a parent with no `RunE`. `app group typo` then exits 0 with help. The docs never mention the parent's own behaviour ([G] Sources: 0 mentions of "runnable" in the user guide). *Check:* GO-CLI-21's tree-walk test.
16. **Believing GO-CLI-17's root wiring protects nested groups**, or "fixing" a group with `Args: cobra.NoArgs` or `RunE: func(...) error { return cmd.Help() }`. Both still exit 0. *Check:* GO-CLI-21's `group typo` case.
17. **Wiring `SetErr(stderr)` but not `SetOut(out)` in a testable `run`**, or calling `SetOut` after `InitDefaultCompletionCmd`. Production looks identical, and only the in-process test goes blind. *Check:* GO-CLI-20's in-process tests.
18. **Marking a command or flag deprecated with cobra's built-ins once `SetOut` is set**, which puts the notice on stdout. *Check:* GO-CLI-20's deprecation grep.

## Open questions

**Owner decisions, each with the default this program applies:**

- **Windows Ctrl-C status.** `reraise` is Unix-only; Windows exits `128+N` (130). The native convention is `0xC000013A` (STATUS_CONTROL_C_EXIT). *Default:* 130, for script parity with Unix.
- **Is GO-CLI-08 a MUST?** The Rust EXIT-11 is a SHOULD. *Default:* SHOULD, to keep the mirror symmetric, even though the `wait()`-status difference is now measured.

**Subareas that need another research round:**

- **cli/windows:** the Windows legs of GO-CLI-07 (`ERROR_NO_DATA` vs `ERROR_BROKEN_PIPE` on a console vs a pipe), GO-CLI-08 (Ctrl-Break, `os.Interrupt` delivery to a child in the same console) and GO-CLI-13 (MSYS2 detection). Each needs a watched run on a `windows-latest` runner. Only the compile was verified here.

## Sub-artifacts

- [go-cli/group-help.md](go-cli/group-help.md) — the non-runnable command group (`legacyArgs` is root-only, `!Runnable()` → `flag.ErrHelp`), the plain and hardened matrices, the `groupRunE` fix, the `SetOut` writer-wiring gap in the shipped skeleton, and openeverest#2816's count-only-`Args` sibling.
- [go-cli/exit-codes-and-signals.md](go-cli/exit-codes-and-signals.md) — the exit table, two-line `main`, cobra/urfave usage-error exits, the SIGPIPE 4-way fixture, child `WaitStatus`, the `NotifyContext` cause type, `exhaustive`, and idempotent re-run.
- [go-cli/reference-skeleton.md](go-cli/reference-skeleton.md) — cobra `Find` vs `Traverse`, a runnable root with `Args`, aliases/help/version/`__complete`, `PersistentPreRunE` typed vs untyped, the hardened skeleton matrix, GO-CONC-14 report-all (errgroup vs join), the termenv vs colorprofile `NO_COLOR` table, and colour-library binary size.
- [go-cli/streams-and-terminal.md](go-cli/streams-and-terminal.md) — stdout discipline, `bufio` speed and flush loss, CWE-150 sanitizing (and `%q`'s incidental escaping), `NO_COLOR` and per-stream colour, TTY-gated prompts, `UserConfigDir`, viper vs koanf size, and the cobra/urfave/`flag` measurement.

## Key sources

- [pkg.go.dev/os/signal](https://pkg.go.dev/os/signal) — the SIGPIPE section, `Notify`/`Ignore`/`NotifyContext`
- [go.dev/doc/go1.26](https://go.dev/doc/go1.26) — the `NotifyContext` cause and `errors.AsType`
- [pkg.go.dev/os#Exit](https://pkg.go.dev/os#Exit) — "deferred functions are not run"
- [pkg.go.dev/os#ProcessState.ExitCode](https://pkg.go.dev/os#ProcessState.ExitCode) — −1 on signal death
- [pkg.go.dev/errors#AsType](https://pkg.go.dev/errors#AsType) — the 1.26 generic matcher
- [spf13/cobra command.go](https://github.com/spf13/cobra/blob/main/command.go) — `Execute` never exits; `legacyArgs`, `SetFlagErrorFunc`, `Silence*`
- [urfave/cli v3 exit-codes example](https://cli.urfave.org/v3/examples/exit-codes/) — `ExitCoder` and the `log.Fatal` pitfall
- [man.openbsd.org/sysexits](https://man.openbsd.org/sysexits) — the 64–78 table
- [cons.org/cracauer/sigint.html](https://www.cons.org/cracauer/sigint.html) — why a caught SIGINT must be re-raised, not faked with `exit(130)`
- [clig.dev](https://clig.dev/) — streams, prompts, config precedence
- [no-color.org](https://no-color.org/) — "present and not an empty string"
- [pkg.go.dev/golang.org/x/term](https://pkg.go.dev/golang.org/x/term) — `IsTerminal`, `ReadPassword`
- [pkg.go.dev/os#UserConfigDir](https://pkg.go.dev/os#UserConfigDir) — per-OS config and cache roots
- [GHSA-fwjx-9p69-h25h](https://github.com/advisories/GHSA-fwjx-9p69-h25h) and [CWE-150](https://cwe.mitre.org/data/definitions/150.html) — terminal escape injection in a Go CLI
- [spf13/cobra args.go](https://github.com/spf13/cobra/blob/main/args.go) — `legacyArgs`, and `NoArgs`'s coincidentally identical message
- [pkg.go.dev/errors#Join](https://pkg.go.dev/errors#Join) — `Unwrap() []error`, and the tree `AsType` searches
- [muesli/termenv output.go](https://github.com/muesli/termenv/blob/master/output.go) (v0.16.0) — per-writer `Output`, and the package-level `output` bound to stdout
- [spf13/cobra args.go @ adbc8813901b](https://github.com/spf13/cobra/blob/adbc8813901b/args.go) — `legacyArgs`: "subcommands will always accept arbitrary arguments"
- [spf13/cobra#1708](https://github.com/spf13/cobra/issues/1708) (open) — `SetOut` also redirects cobra's deprecation and usage-on-error output
- [openeverest/openeverest#2816](https://github.com/openeverest/openeverest/issues/2816) — the count-only `Args` + no-op `Run` sibling of the silent group
- [charmbracelet/colorprofile env.go](https://github.com/charmbracelet/colorprofile/blob/main/env.go) (v0.4.3) — `envNoColor` via `strconv.ParseBool`

## Revision log

- 2026-09-26 — folded [go-cli/reference-skeleton.md](go-cli/reference-skeleton.md) and this revision's [V] runs; no ID renumbered or retired.
- GO-CLI-06 — **overclaim fixed in place.** "Unknown subcommand → 64" now states its precondition (root `Args` nil, no `TraverseChildren`, or the GO-CLI-17 wiring). Watched: typos exit 0 otherwise [R][V].
- GO-CLI-06 — added the `markStarted`-after-last-`AddCommand` ordering (misorder turns a business error into 64 [V]), and recorded that an untyped `PersistentPreRunE` error gives 64 and a typed one 78 [R].
- GO-CLI-05 — the case order is now also the joined-error precedence policy, and stderr carries one line per joined member; points at GO-CLI-18.
- GO-CLI-13 — **verification replaced (it failed to go red):** the `LookupEnv` grep stayed green on a colorprofile violator [V]. Added a second grep, watched red/green, and banned colorprofile / package-level termenv as the gate.
- GO-CLI-16 — "global flags as `PersistentFlags`" now says "without `TraverseChildren`" (GO-CLI-17).
- GO-CLI-17 (new, MUST) — `TraverseChildren` or a non-nil root `Args` needs a runnable root plus a rejecting `Args`. The dive's fix (a rejecting `Args` alone) was watched failing on a non-runnable root [V], so the rule is stricter than the dive's candidates 1–2.
- GO-CLI-18 (new, MUST) — choose a joined error's code by case order, never by slice-walk. The dive's candidate 6 said "sort or select explicitly"; `errors.AsType`'s tree search already makes the existing chain deterministic [V].
- GO-CLI-19 (new, SHOULD) — no colour dependency for the decision; if termenv, use `NewOutput(w)` per stream. Measurement only [R] §9.
- Verdict 3/7 revised, verdict 10 and "Documented gaps" added. Open questions: removed the `PersistentPreRunE` owner question (settled, [R] §5), cli/reference-skeleton (answered) and cli/colour-library (answered); cli/windows remains.
- Dive candidate 4 (Silence* still required under `TraverseChildren`) needed no change: GO-CLI-06 already requires both. Candidate 5 (errgroup vs join) goes to GO-CONC-14 as a cross-family note, not a GO-CLI rule.
- 2026-09-26 (revision 2) — folded [go-cli/group-help.md](go-cli/group-help.md) and the [W] runs; no ID renumbered or retired.
- GO-CLI-06 — **overclaim fixed in place.** "An unknown subcommand → 64" now says *at the root only*, because a nested group's typo exits 0 [G][W]. The rule's meaning is unchanged, and the nested case moved to GO-CLI-21.
- GO-CLI-17 — scoped: it closes the root only (`hardened-group` carries it and still exits 0 on `group typo` [G]).
- GO-CLI-20 (new, MUST) — `SetOut(out)` before `InitDefaultCompletionCmd`, and no cobra deprecation machinery. **Stricter than the dive's candidate 4:** plain `SetOut` moves deprecation notices onto stdout (cobra#1708, watched [W]), and a late `SetOut` misses completion scripts (watched [W]). **Verification replaced:** the dive's `func run(` grep stayed green on a planted violation. The primary check is now an in-process test, and the `SetErr`-keyed grep is a locator.
- GO-CLI-21 (new, MUST) — seal every non-root group with a typed-usage `RunE` through one `sealGroups` walk, `completion` included. The dive placed this under GO-CLI-06. It got its own ID instead, mirroring GO-CLI-17's split: its mechanism and its tree-walk check are distinct. Dive candidates 2/3 are folded in, and candidate 5 is a reading heuristic, not watched.
- Verdict 3/7 extended. "Documented gaps": the ExecuteC-commands entry was corrected (`completion` is not inert), and four entries were added: `help <typo>` → 0, a group with positionals, the no-op-`Run` variant, and the shipped skeleton violating GO-CLI-20/21. The dive's "contested" bare-group contract is settled in the Verdict by the watched grimoire precedent, not left open.
- Exemplars: corrected the dive's `gh auth` claim. cli/cli's `rootHelpFunc` catches a nested typo (exit 1 through `hasFailed`), so only bare `gh auth` exits 0. restic `key` is the clean violator.
