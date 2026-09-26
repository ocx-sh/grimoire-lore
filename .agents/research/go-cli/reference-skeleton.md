---
title: "The cobra reference skeleton, joined-error classification, and the colour library — hardening pass"
topic: "GO-CLI: cobra TraverseChildren/aliases/completion/Args interaction, GO-CONC-14 report-all fan-out, GO-CLI-13 colour libraries"
agent: cli/reference-skeleton
model: sonnet
date_researched: 2026-09-26
sources_count: 15
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/reference-skeleton/
scope: >
  Answers the three open questions go-cli.md left for wave 3 (cli/reference-skeleton,
  cli/colour-library) plus GO-CONC-14's "not watched yet" report-all fan-out. Does NOT
  cover Windows (still open, needs a windows-latest runner) or MSYS2 colour detection.
  Does not modify go-cli.md, go-concurrency.md or go-errors.md; a later opus consolidation
  pass folds these findings into GO-CLI-01..16 (IDs stay stable) and adds a GO-CONC-14
  watched-run note.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [cobra routing: Find vs Traverse, and where legacyArgs actually runs](#1-cobra-routing-find-vs-traverse-and-where-legacyargs-actually-runs)
   2. [A runnable root with `Args` set: NoArgs survives, a naive custom validator does not](#2-a-runnable-root-with-args-set-noargs-survives-a-naive-custom-validator-does-not)
   3. [`TraverseChildren` bypasses unknown-subcommand detection structurally](#3-traversechildren-bypasses-unknown-subcommand-detection-structurally)
   4. [Aliases, `help`, `--version`, `__complete`/`__completeNoDesc`: all orthogonal to the above](#4-aliases-help---version-__complete__completenodesc-all-orthogonal-to-the-above)
   5. [PersistentPreRunE: typed vs untyped, and why `markStarted` still gives the right fallback](#5-persistentprerune-typed-vs-untyped-and-why-markstarted-still-gives-the-right-fallback)
   6. [The hardened skeleton: full test matrix](#6-the-hardened-skeleton-full-test-matrix)
   7. [GO-CONC-14 report-all: errgroup drops 2 of 3, WaitGroup+mutex+Join keeps all 3 but picks by scheduler order](#7-go-conc-14-report-all-errgroup-drops-2-of-3-waitgroupmutexjoin-keeps-all-3-but-picks-by-scheduler-order)
   8. [Colour: termenv is spec-correct and per-writer; colorprofile (lipgloss v2) is not spec-correct on NO_COLOR](#8-colour-termenv-is-spec-correct-and-per-writer-colorprofile-lipgloss-v2-is-not-spec-correct-on-no_color)
   9. [Binary-size delta of a colour dependency vs the hand-rolled function](#9-binary-size-delta-of-a-colour-dependency-vs-the-hand-rolled-function)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- A runnable root with `Args: cobra.NoArgs` keeps cobra's unknown-subcommand detection: `Find()` only skips `legacyArgs` when `Args` is set, but `NoArgs`'s own error text ("unknown command %q for %q") is the same shape, so nothing regresses.
- A runnable root with any **custom** `Args` validator that does not itself re-check the token against `cmd.Commands()` **silently swallows a mistyped subcommand as a positional argument** — `Find()` returns `nil` error whenever `commandFound.Args != nil`, so cobra never gets a chance to say "unknown command".
- `root.TraverseChildren = true` is worse and unconditional: `Command.Traverse` returns `(c, args, nil)` the moment `findNext` fails to match a token, **regardless of whether `Args` is nil** — the mistyped token is silently handed to whichever command was last matched. `legacyArgs` is a `Find()`-only mechanism; `Traverse()` never calls it.
- The fix for both cases is the same: a root that sets `Args` (for any reason, including `TraverseChildren`) must have that validator explicitly reject a first token that is not a known subcommand name or alias, or accept that a typo is a silent no-op.
- `help`, `--version`, `__complete`, and `__completeNoDesc` are unaffected by `TraverseChildren`, a custom `Args`, or `markStarted`'s RunE-wrapping: cobra's `execute()` returns before `ValidateArgs` runs for all four (help-flag check, version-flag check are both before the `Runnable()`/`ValidateArgs` gate; `__complete`/`__completeNoDesc` are separate subcommands cobra adds and dispatches to directly). Both hidden completion requests exit 0 and print completions in every fixture tried.
- `markStarted` (wrapping every `RunE` in the tree to flip a `*bool`) survives `TraverseChildren`, aliases, and a custom root `Args` unchanged, because it only touches `RunE`, never `Args`/`Find`/`Traverse` — but it must run **after** every user subcommand is registered and **before** `Execute`, since cobra adds `completion`/`help`/`__complete` internally inside `ExecuteC` (too late for `markStarted` to see them). This is harmless: none of those three ever return a business error whose `started` classification matters.
- PersistentPreRunE returning a typed `*ConfigError` classifies 78 before the `!started` fallback runs; returning a plain `errors.New(...)` falls through to the same 64 bucket as a cobra-internal usage rejection, because `RunE` never started either way — this is correct and matches GO-CLI-06's existing text, now watched under `TraverseChildren` too.
- **Final skeleton wiring** (watched, exit codes and stderr-line counts): `SilenceErrors: true` and `SilenceUsage: true` on the root are still required even with `TraverseChildren` and a custom `Args` — without them cobra prints its own `Error:`/usage pair on stdout+stderr *in addition to* the skeleton's own one-line render, exactly the double-print GO-CLI-06 already warns about.
- GO-CONC-14's report-all shape is now watched: `errgroup.WithContext` over 3 inputs that all fail delivers **exactly one** error to `Wait()` — the other two are gone, never reach stderr, confirmed over repeated runs.
- The WaitGroup + mutex-guarded `[]error` + `errors.Join` shape delivers **all three** error messages to stderr (one line each, via `Join`'s own `\n`-joined `Error()`), but the order they arrive in is the goroutines' *completion* order, not the input order — stable across 5 repeated runs and across `GOMAXPROCS=1` vs `8` on this fixture, but nothing in the language spec guarantees that stability.
- `classify()` walking `Unwrap() []error` and returning on the first typed match therefore picks **the first-encountered typed error in scheduler order**, not "the most severe" and not a blanket fall-through to 1 — in the watched run a `NotFoundError` (79) wins over a co-occurring `PermissionError` (77) only because it happened to append to the slice first, which a rule author must not read as "NotFoundError outranks PermissionError."
- `termenv.NewOutput(w).EnvNoColor()` is per-writer (the `Output` closes over one `io.Writer`) and spec-correct: any non-empty `NO_COLOR`, including the surprising `NO_COLOR=0`, disables colour. The package-level `termenv.EnvNoColor()` function is **not** per-writer — it reads a single global `Output` bound to `os.Stdout` at package-init time, the same footgun GO-CLI-13 already bans for `fatih/color`.
- `charmbracelet/colorprofile` (the library `charmbracelet/lipgloss` v2, the current major, documents using directly) computes `NO_COLOR` with `strconv.ParseBool`, **not** a non-empty check: `NO_COLOR=1` and `NO_COLOR=true` disable colour, but `NO_COLOR=yes`, `NO_COLOR=0`, and `NO_COLOR=anything` do **not** — a verified, versioned regression against the no-color.org spec that GO-CLI-13 already cites. `lipgloss` v1 (module path `github.com/charmbracelet/lipgloss`, still the version most exemplars would pin) used `termenv` directly and does not have this bug.
- A colour-library row does enter GO-CLI-13, but only for `termenv.NewOutput(w)` used explicitly per stream — never the package-level `termenv.*` functions, and never `colorprofile.Env`/`colorprofile.Detect` for the `NO_COLOR` check specifically (its TTY/profile detection is otherwise fine and per-writer).
- Importing `github.com/muesli/termenv` costs **+671,744 bytes** (+44.3%) over the hand-rolled `os.Getenv("NO_COLOR") != "" ... term.IsTerminal(fd)` function on a stripped `linux/amd64` build; importing `github.com/charmbracelet/colorprofile` costs **+1,138,791 bytes** (+75.1%). Neither is free, and the hand-rolled function is both smaller and spec-correct.

## Findings

### 1. cobra routing: Find vs Traverse, and where legacyArgs actually runs

`Command.ExecuteC` picks one of two routers before anything else runs (`spf13/cobra@adbc8813901b:command.go:1120-1123`):

```go
if c.TraverseChildren {
    cmd, flags, err = c.Traverse(args)
} else {
    cmd, flags, err = c.Find(args)
}
```

`Find` walks down the tree with its own `innerfind` closure and, only at the very end, decides whether to invoke `legacyArgs` (`command.go:774-778`):

```go
commandFound, a := innerfind(c, args)
if commandFound.Args == nil {
    return commandFound, a, legacyArgs(commandFound, stripFlags(a, commandFound))
}
return commandFound, a, nil
```

`legacyArgs` (`args.go:26-38`) is what produces the familiar `unknown command %q for %q` message — but only when the command it lands on has **no subcommands at all**, taking arbitrary args, or **is the root with subcommands and got an unrecognized first token**. It is a `Find()`-internal helper, never called from `Traverse`, `ValidateArgs`, or `execute`.

`Traverse` (`command.go:816-849`) has no equivalent call. Its loop only recognizes flags and known subcommand names; the moment a token matches nothing (`cmd := c.findNext(arg); if cmd == nil`), it returns immediately with a **nil error**, handing the unmatched token straight through as a positional argument to whatever command it was already at (`command.go:823-825`).

### 2. A runnable root with `Args` set: NoArgs survives, a naive custom validator does not

Watched with `fixtures/reference-skeleton/cmd/{noargs,customvalidator}`:

| Root config | Input | Result |
|---|---|---|
| `Args: cobra.NoArgs`, runnable, has `get`/`list` | `app gett` | `Error: unknown command "gett" for "app"`, exit 1 (would be 64 through GO-CLI-05's `classify`) |
| same | `app get` | routes correctly, exit 0 |
| custom `Args` (rejects only flag-like tokens) | `app gett` | **`root ran, args: [gett]`, exit 0** — silently accepted |
| same | `app get` | routes correctly, exit 0 |

`cobra.NoArgs`'s own body (`args.go:41-46`) is `if len(args) > 0 { return fmt.Errorf("unknown command %q for %q", args[0], cmd.CommandPath()) }` — it happens to reproduce `legacyArgs`'s exact wording (minus the "Did you mean" suggestion, which only `legacyArgs` computes via `findSuggestions`). So `NoArgs` is safe by coincidence, not by cobra enforcing anything: the moment an agent writes *any other* validator — `cobra.MinimumNArgs(1)`, `cobra.RangeArgs`, or a bespoke one — that validator's own logic is now the **only** thing standing between a typo and silent acceptance.

### 3. `TraverseChildren` bypasses unknown-subcommand detection structurally

Watched with `cmd/traverse` (root `Args` **nil**, `TraverseChildren: true`) against `cmd/traverse_off` (identical tree, `TraverseChildren` at its default `false`):

```
$ ./traverse_off subz   → "Error: unknown command \"subz\" for \"app\"\n\nDid you mean this?\n\tsub\n..." exit=1
$ ./traverse subz       → "root ran, verbose: false args: [subz]"                                          exit=0
```

This is the sharper version of finding 2: it does not require the author to set `Args` at all. Setting `TraverseChildren` — which the map's exit dive and GO-CLI-16 both recommend considering for the "flags-before-subcommand" UX — removes unknown-subcommand detection **on its own**, because the router itself (`Traverse`, not `Find`) is the thing that no longer calls `legacyArgs`. A root that needs both `TraverseChildren` and typo safety must supply an explicit `Args` validator that walks `cmd.Commands()` itself (§6's `rootArgs`).

### 4. Aliases, `help`, `--version`, `__complete`/`__completeNoDesc`: all orthogonal to the above

None of these four paths reach `ValidateArgs` at all, so nothing in §§1-3 touches them:

- **Aliases** are resolved inside `findNext` itself (`command.go:800-806`, `commandNameMatches(cmd.Name(), next) || cmd.HasAlias(next)`) — `cmd.CalledAs()` correctly reports `"ls"` vs `"list"` (watched, `cmd/aliases`).
- **`--help`/`help`**: `execute()` checks the help flag and returns `flag.ErrHelp` **before** the `Runnable()`/`ValidateArgs` block (`command.go:919-928`); `ExecuteC` special-cases `errors.Is(err, flag.ErrHelp)` to call `HelpFunc` and return `nil` (`command.go:1149-1153`) — no usage error, no exit code, ever, from this path.
- **`--version`**: same shape, one block earlier (`command.go:930-940`).
- **`__complete` / `__completeNoDesc`**: these are registered as ordinary subcommands by `initCompleteCmd` inside `ExecuteC`, before routing runs (`completions.go:748` area, `ShellCompRequestCmd`/`ShellCompNoDescRequestCmd` constants at `completions.go:31,34`); they carry their own `RunE` that never returns a usage error for a well-formed request.

Watched (`cmd/completion`, `cmd/hardened`): `app __complete get ''` and `app __completeNoDesc get ''` both exit 0 and print the `ValidArgsFunction` results plus the trailing `:4` directive line and `Completion ended with directive: ShellCompDirectiveNoFileComp` diagnostic — identical shape with and without `TraverseChildren`/a custom root `Args` set.

### 5. PersistentPreRunE: typed vs untyped, and why `markStarted` still gives the right fallback

`execute()` runs every `PersistentPreRunE` in the parent chain **before** `RunE` (`command.go:970-990`), so `markStarted`'s wrapped `RunE` — and therefore `*started` — never flips to `true` if a `PersistentPreRunE` returns an error, typed or not. Watched (`cmd/prerun`, and `cmd/hardened` with `TraverseChildren` added):

| `PersistentPreRunE` returns | `classify` sees | exit |
|---|---|---|
| `&ConfigError{...}` | typed match, matched before the `!started` fallback | 78 |
| `errors.New("boom")` | no typed match, `started == false` | 64 |
| `nil` | `RunE` runs normally | 0 |

This is exactly GO-CLI-06's existing rule text ("Typed errors from `PersistentPreRunE`... are matched before that fallback"); the only new information is that it holds unchanged under `TraverseChildren` and a custom root `Args`.

### 6. The hardened skeleton: full test matrix

`fixtures/reference-skeleton/cmd/hardened` combines every axis above: `TraverseChildren: true`, `SilenceErrors`/`SilenceUsage: true`, a root `Args` (`rootArgs`) that explicitly rejects an unrecognized first token, `Version` set, `PersistentPreRunE` switchable by env var, an aliased `list` subcommand with a `ValidArgsFunction`, a `fail` subcommand for the business-error path, and `markStarted` applied after `AddCommand` but before `Execute`.

```go
func rootArgs(cmd *cobra.Command, args []string) error {
	if len(args) == 0 {
		return nil
	}
	return &UsageError{Err: fmt.Errorf("unknown command %q for %q", args[0], cmd.CommandPath())}
}
```

Because `Traverse`/`Find` only ever falls through to `Args` when routing has **already failed** to match `args[0]` to a real subcommand or alias, this validator can reject unconditionally whenever it is reached with a non-empty slice — it is never invoked for a correctly-routed subcommand. (A root that also wants to accept genuine positional arguments for its own `RunE` needs a validator that distinguishes "no subcommand matched, and this doesn't look like one of mine" from "these are my own positional args" — the fleet skeleton's roots are never designed to take both subcommands and positional args, so this is out of scope here.)

Full matrix, `run.sh go build` then invoked directly (`sed -n` of the fixture is the source of truth):

| Invocation | stdout lines | stderr lines | exit |
|---|---|---|---|
| `gett` (mistyped) | 0 | 1 (`error: unknown command "gett" for "app"`) | 64 |
| `list` / `ls` | 1 (`called as: list`/`ls`) | 0 | 0 |
| `fail` | 0 | 1 (`error: business error`) | 1 |
| `--version` | 1 (`app version 9.9.9`) | 0 | 0 |
| `help` | 15 (usage text) | 0 | 0 |
| `__complete list ''` / `__completeNoDesc list ''` | 4 | 0 | 0 |
| `PRERUN_MODE=typed list` | 0 | 1 (`error: config error: missing token`) | 78 |
| `PRERUN_MODE=untyped list` | 0 | 1 (`error: boom`) | 64 |
| (no args, runnable root) | 1 (`root ran, args: []`) | 0 | 0 |

This is the answer to "the final skeleton wiring and its test matrix": `TraverseChildren`, aliases, completion, help/version, and typed `PersistentPreRunE` all compose cleanly **once** the root's `Args` (whenever one exists, for any reason) explicitly re-implements the unknown-subcommand check that both `Find` (when `Args != nil`) and `Traverse` (always) skip.

### 7. GO-CONC-14 report-all: errgroup drops 2 of 3, WaitGroup+mutex+Join keeps all 3 but picks by scheduler order

GO-CONC-14 names three group primitives and picks `errgroup.WithContext` for "the first failure should cancel the rest" and the mutex+`errors.Join` shape for "the command must report every failure" — but flagged the report-all case as "not watched" ([go-concurrency.md](../go-concurrency.md) GO-CONC-14). Watched here with a 3-input `verify`-style command where **all three fail**:

```go
// cmd/verify_errgroup: 3 goroutines, all return *NotFoundError
g, _ := errgroup.WithContext(context.Background())
for _, in := range inputs { in := in; g.Go(func() error { return &NotFoundError{Name: in} }) }
err := g.Wait()
```
→ `error: c: not found`, exit 65 — **stable across 3 runs**; `a`'s and `b`'s errors never reach stderr at all. This is `errgroup.Wait`'s documented behaviour ([pkg.go.dev/golang.org/x/sync/errgroup](https://pkg.go.dev/golang.org/x/sync/errgroup): "the first non-nil error... will be returned"), now watched rather than only argued.

```go
// cmd/verify_joined: 3 goroutines, mutex-guarded []error, errors.Join
var wg sync.WaitGroup
var mu sync.Mutex
var errs []error
for _, in := range inputs {
    go func() { defer wg.Done(); mu.Lock(); errs = append(errs, makeErr(in)); mu.Unlock() }()
}
wg.Wait()
err := errors.Join(errs...)
```
→ all three messages reach stderr every time (`errors.Join`'s `Error()` joins them with `\n`), but the append order was `c, a, b` on every one of 5 repeated runs, and stayed `c, a, b` under both `GOMAXPROCS=1` and `GOMAXPROCS=8` on this host. That stability is a property of this particular scheduler and workload, not a language guarantee — nothing in the [Go memory model](https://go.dev/ref/mem) promises an order for unsynchronized goroutine starts, so a rule that assumes a specific completion order is unverifiable in general even though it reproduces locally.

A `classify` written as "walk `Unwrap() []error`, return on the first typed match" (the shape GO-ERR-18 already recommends for reading a joined error) therefore answers the brief's three-way question concretely: it is **the first-encountered typed match in whatever order the errors landed in the slice**, not "the most severe" (a `*PermissionError` at 77 lost to a `*NotFoundError` at 79 purely because it was appended second) and not a blanket fall-through to 1 (both are typed, so 1 is never reached). A fleet author who wants a deterministic pick — "the most severe of these three classes wins" — must sort or select over the full `Unwrap() []error` slice explicitly; "first match in `errors.As` order" and "most severe" are different algorithms that happen to coincide only when at most one typed error is present.

### 8. Colour: termenv is spec-correct and per-writer; colorprofile (lipgloss v2) is not spec-correct on NO_COLOR

`termenv.Output` closes over exactly one `io.Writer` (`muesli/termenv@v0.16.0:output.go:24-31`, the `w io.Writer` field), and both `isTTY()` and `EnvNoColor()` are methods on `*Output`, so `termenv.NewOutput(os.Stdout)` and `termenv.NewOutput(os.Stderr)` are two independent decisions — genuinely per-writer. `EnvNoColor` is:

```go
// muesli/termenv@v0.16.0:output.go:68-70
func (o *Output) EnvNoColor() bool {
	return o.environ.Getenv("NO_COLOR") != "" || (o.environ.Getenv("CLICOLOR") == "0" && !o.cliColorForced())
}
```

— a non-empty check, matching [no-color.org](https://no-color.org/)'s "when present (regardless of its value)". Watched: `NO_COLOR=1`, `=true`, `=yes`, `=0`, and `=anything` **all** disable colour; only `NO_COLOR=""` (unset or empty) does not. `NO_COLOR=0` disabling colour is the actually-surprising case here — the spec says "regardless of value," so this is termenv being correct, not buggy, but it reads like a bug to anyone who expects `0` to mean "off."

The package-level `termenv.EnvNoColor()` (no receiver) instead delegates to a single package-level `var output = NewOutput(os.Stdout)` (`output.go:15`) computed once. Calling this convenience function anywhere in a codebase reproduces exactly the `fatih/color`-style single-profile-for-stdout footgun GO-CLI-13 already forbids — the fix is the same: always construct with `NewOutput(w)` for the specific stream in hand, never call the package-level function.

`charmbracelet/colorprofile` (fetched at `v0.4.3`, the version `go get ...@latest` resolved on 2026-09-26) is what `charmbracelet/lipgloss`'s current major (`v2.0.6`, module path `charm.land/lipgloss/v2` as of its `go.mod`) documents as its own no-color mechanism (`lipgloss@v2.0.6:color.go:240,257`, doc-comment examples calling `colorprofile.Detect(os.Stderr, os.Environ())`). Its `NO_COLOR` check is:

```go
// charmbracelet/colorprofile@v0.4.3:env.go
func envNoColor(env environ) bool {
	noColor, _ := strconv.ParseBool(env.get("NO_COLOR"))
	return noColor
}
```

Watched, `TERM=xterm-256color` held constant:

| `NO_COLOR` | `colorprofile.Env` result | colour disabled? | `termenv.EnvNoColor` |
|---|---|---|---|
| (unset/empty) | `TrueColor` | no | `false` |
| `1` | `Ascii` | **yes** | `true` |
| `true` | `Ascii` | **yes** | `true` |
| `yes` | `TrueColor` | **no** | `true` |
| `0` | `TrueColor` | **no** | `true` |
| `anything` | `TrueColor` | **no** | `true` |

`strconv.ParseBool` accepts only `1, t, T, TRUE, true, True, 0, f, F, FALSE, false, False`; every other non-empty string returns an error that `envNoColor` silently discards, defaulting to `false` (colour stays on). This is the opposite of `NO_COLOR=0`'s effect under termenv, and it means the overwhelmingly common real-world convention — `NO_COLOR=1` — happens to work, but `NO_COLOR` set to anything else (including tools that literally set `NO_COLOR=$(date)` as a "just make it non-empty" habit, or `NO_COLOR=yes`) silently does nothing. `lipgloss` v1 (module path `github.com/charmbracelet/lipgloss`, `go.mod` for tag `v1.1.0`) depends on `muesli/termenv v0.16.0` directly and does not carry this bug — it is specific to the v2 rewrite's switch to `colorprofile`.

### 9. Binary-size delta of a colour dependency vs the hand-rolled function

Three `linux/amd64` binaries, `go build -trimpath -ldflags="-s -w"`, Go 1.27.1, no other code:

| Binary | Size (bytes) | Delta vs hand-rolled |
|---|---|---|
| hand-rolled (`os.Getenv("NO_COLOR")`, `os.Getenv("TERM")`, `golang.org/x/term.IsTerminal`) | 1,515,680 | — |
| `termenv.NewOutput(os.Stdout)` | 2,187,424 | +671,744 (+44.3%) |
| `colorprofile.Detect(os.Stdout, os.Environ())` | 2,654,471 | +1,138,791 (+75.1%) |

`golang.org/x/term` is already the hand-rolled function's own dependency (it is what GO-CLI-13's existing rule text calls for), so this is genuinely "add a colour library" cost, not an artifact of a different TTY-detection mechanism.

## Normative guidance candidates

1. **A root that sets any non-nil `Args` — for any reason — and has subcommands MUST have that validator explicitly reject an unrecognized first token, unless the root deliberately accepts unclassified extra arguments.**
   - Rationale: `Find()` calls `legacyArgs` only when `Args == nil` (`command.go:775-778`); any other validator, including `cobra.NoArgs` only by coincidence of wording, is now the sole guard.
   - Verify: reading heuristic — a root `Args` function must, on a non-empty and non-flag first token, check it against `cmd.Commands()` names/aliases (or reuse cobra's own message shape) before accepting. No linter statically proves this; `contextcheck`/`revive` do not model cobra's `Find` semantics.
   - Watched: **yes**, fixture path `cmd/customvalidator` (violation, exit 0 on `gett`) vs `cmd/noargs` (accidental compliance) vs `cmd/hardened`'s `rootArgs` (deliberate compliance, exit 64 on `gett`).

2. **`root.TraverseChildren = true` MUST be paired with an explicit root `Args` validator that re-implements unknown-subcommand rejection; never assume `TraverseChildren` preserves cobra's default typo detection.**
   - Rationale: `Traverse()` (`command.go:823-825`) returns a nil error the instant a token fails to match a subcommand, with no `legacyArgs` equivalent at all — this holds even when `Args` is nil, which is strictly worse than finding 1.
   - Verify: integration test, `./cli <typo>; echo $?` must not be 0 and must not silently run the root's business logic. Reading heuristic: `grep -rn --include='*.go' -F 'TraverseChildren' .` in a directory tree, then confirm each hit's root sets `Args`.
   - Watched: **yes**, `cmd/traverse` (`subz` → exit 0, silent) vs `cmd/traverse_off` (`subz` → exit 1, "unknown command").

3. **`markStarted` must wrap `RunE` after every user subcommand is registered (`AddCommand`) and immediately before `Execute`/`ExecuteContext` — never before `AddCommand`, and there is no need to re-wrap after `Execute` starts.**
   - Rationale: cobra adds `completion`, `help`, and `__complete`/`__completeNoDesc` internally inside `ExecuteC`, after any pre-`Execute` walk would see them; but none of those three commands' own `RunE` paths ever need the `started` classification (help/version short-circuit before `ValidateArgs`; `__complete` always exits 0 on a well-formed request), so their being unwrapped is inert, not a defect.
   - Verify: reading heuristic — `markStarted(root)` call site is textually after every `root.AddCommand(...)` and before `root.Execute()`/`ExecuteContext()`. No lint catches ordering here.
   - Watched: **yes**, `cmd/hardened` (`markStarted` applied post-`AddCommand`, pre-`Execute`; `__complete`/`help`/`--version` all still exit 0 correctly per §6's matrix).

4. **`SilenceErrors: true` and `SilenceUsage: true` on the root are required even when `TraverseChildren` and a custom `Args` are in play; do not assume either setting becomes redundant.**
   - Rationale: without them, cobra's own `ExecuteC` prints `Error: ...` (stderr) and the usage block (stdout) on top of the skeleton's single classified render — the same double-print GO-CLI-06 already names, now confirmed unaffected by `TraverseChildren`.
   - Verify: `grep -rn --include='*.go' -e 'SilenceErrors' -e 'SilenceUsage' .` on every root-command literal in a `cmd/` tree, then read that both are set `true`; a stderr-line-count integration test (exactly 1 line per error case) is the runnable check.
   - Watched: **yes**, `cmd/hardened` without vs with the two fields set (see §6's clean one-line-per-error matrix vs the doubled output shown before the fields were added, in this file's development log).

5. **A batch/report-all fan-out that must surface every failure MUST use a `sync.WaitGroup` + mutex-guarded `[]error` + `errors.Join`, never `errgroup.WithContext`/`errgroup.Group.Wait` — and its classifier must not assume the join order encodes severity.**
   - Rationale: `errgroup.Wait()` keeps only the first non-nil error by design; watched here, 2 of 3 planted `*NotFoundError`s never reach stderr under `errgroup.WithContext` over 3 always-failing inputs.
   - Verify: a table test with N inputs, all failing with distinguishable messages, asserting stderr contains all N messages. Reading heuristic: `grep -rn --include='*.go' -F 'errgroup.WithContext' .`, then check whether the call site's docstring or a comment says "report every failure" — if so, it is a defect.
   - Watched: **yes**, `cmd/verify_errgroup` (1 of 3 messages, stable over 3 runs) vs `cmd/verify_joined` (3 of 3 messages, stable over 5 runs and 2 `GOMAXPROCS` settings).

6. **A `classify()` that walks a joined error's `Unwrap() []error` for the "first typed match" MUST NOT be read as picking "the most severe" class; if severity ordering matters, the classifier must select explicitly over the whole slice, not return on first match.**
   - Rationale: watched order of arrival (`c, a, b`) is scheduler-determined, not the input order (`a, b, c`) and not a severity order; "first typed match" therefore silently coincides with "arbitrary pick among the typed errors present" whenever more than one typed class occurs in the same batch.
   - Verify: a test that plants two *different* typed errors in the same joined batch (not just one type twice) and asserts which code came out, documented as "whichever error's goroutine happened to finish first" rather than asserting a specific class wins — a test asserting a specific winner is itself a defect if the two errors race.
   - Watched: **yes**, `cmd/verify_joined`, `*NotFoundError` (79) beat a co-occurring `*PermissionError` (77) in every one of 5 runs, but by construction (append-order dependent), not by rule.

7. **A colour library enters the rule set only as `termenv.NewOutput(w)`, constructed once per stream (never the package-level `termenv.*` functions); `charmbracelet/colorprofile`/`lipgloss` v2 must not be relied on for `NO_COLOR` compliance.**
   - Rationale: `colorprofile.envNoColor` uses `strconv.ParseBool`, so `NO_COLOR=yes`, `NO_COLOR=0`, and any other non-boolean non-empty value fail to disable colour — a verified violation of the no-color.org text GO-CLI-13 already cites; `termenv`'s per-`Output` `EnvNoColor` does not have this defect.
   - Verify: `grep -rn --include='*.go' -e 'colorprofile\.\(Env\|Detect\)' .` — a hit is a finding unless paired with an explicit, separate `os.Getenv("NO_COLOR") != ""` short-circuit ahead of it. `grep -rn --include='*.go' -F 'termenv.EnvNoColor()' .` (the bare package-level call, no receiver) is also a finding — should be `termenv.NewOutput(w).EnvNoColor()`.
   - Watched: **yes**, `cmd/colour_probe`, the six-value `NO_COLOR` table in §8.

8. **Prefer the hand-rolled `NO_COLOR`/`term.IsTerminal` check over adding `termenv` or `colorprofile` purely for colour decisions, if `golang.org/x/term` is already a dependency (as GO-CLI-09/13 already require it for TTY prompts).**
   - Rationale: the hand-rolled function is both smaller (no additional import beyond `x/term`, which the CLI skeleton already needs) and, per candidate 7, more spec-correct than `colorprofile`.
   - Verify: `go build -trimpath -ldflags="-s -w"` size comparison; not a lint, a measured trade-off to record in the rule's rationale.
   - Watched: **yes**, §9's three-binary size table.

## Verification runs

All commands run through `/home/mherwig/.cache/research-lang/go-tools/run.sh` (Go 1.27.1, `cobra v1.10.1`, `golang.org/x/sync v0.10.0`, `github.com/muesli/termenv v0.16.0`, `github.com/charmbracelet/colorprofile v0.4.3`, `golang.org/x/term v0.46.0`), fixture module `refskel` at `/home/mherwig/.cache/research-lang/go-tools/fixtures/reference-skeleton/`.

```text
$ run.sh go build -o bin/ ./cmd/...              # exit 0, all 15 binaries
$ run.sh go vet ./...                             # exit 0
$ run.sh gofmt -l .                               # empty after `gofmt -w` on 2 files; empty = pass

# --- finding 2: NoArgs survives, custom validator does not ---
$ ./bin/noargs gett                # "Error: unknown command \"gett\" for \"app\"" ...   exit=1
$ ./bin/noargs get                 # (silent)                                            exit=0
$ ./bin/customvalidator gett       # "root ran, args: [gett]"                            exit=0   <- VIOLATION shape
$ ./bin/customvalidator get        # (silent)                                            exit=0

# --- finding 3: TraverseChildren bypasses legacyArgs unconditionally ---
$ ./bin/traverse_off subz          # "Error: unknown command \"subz\" for \"app\" ..."    exit=1   (TraverseChildren=false, Args=nil)
$ ./bin/traverse subz              # "root ran, verbose: false args: [subz]"              exit=0   <- VIOLATION shape (TraverseChildren=true, Args=nil)

# --- finding 4: aliases, help, --version, __complete/__completeNoDesc ---
$ ./bin/aliases list               # "called as: list"                                   exit=0
$ ./bin/aliases ls                 # "called as: ls"                                     exit=0
$ ./bin/aliases l                  # "called as: l"                                      exit=0
$ ./bin/helpversion --version      # "app version 1.2.3"                                 exit=0
$ ./bin/helpversion help           # (usage text)                                        exit=0
$ ./bin/completion __complete get ''            # "widget\ngadget\n:4\nCompletion ended with directive: ShellCompDirectiveNoFileComp"   exit=0
$ ./bin/completion __completeNoDesc get ''      # same shape                                                                             exit=0

# --- finding 5: PersistentPreRunE typed vs untyped ---
$ PRERUN_MODE=typed   ./bin/prerun     # "error: config error: missing api token"          exit=78
$ PRERUN_MODE=untyped ./bin/prerun     # "error: boom"                                     exit=64
$ PRERUN_MODE=ok      ./bin/prerun     # "ran"                                             exit=0

# --- finding 6: the hardened skeleton (TraverseChildren + explicit rootArgs + Silence*) ---
$ ./bin/hardened gett                       # 0 stdout, 1 stderr line: "error: unknown command \"gett\" for \"app\""   exit=64
$ ./bin/hardened list                       # "called as: list"                                                       exit=0
$ ./bin/hardened ls                         # "called as: ls"                                                         exit=0
$ ./bin/hardened fail                       # 1 stderr line: "error: business error"                                  exit=1
$ ./bin/hardened --version                  # "app version 9.9.9"                                                     exit=0
$ ./bin/hardened help                       # 15-line usage text                                                      exit=0
$ ./bin/hardened __complete list ''         # "a\nb\n:4\nCompletion ended with directive: ShellCompDirectiveNoFileComp"  exit=0
$ ./bin/hardened __completeNoDesc list ''   # same                                                                     exit=0
$ PRERUN_MODE=typed   ./bin/hardened list   # "error: config error: missing token"                                    exit=78
$ PRERUN_MODE=untyped ./bin/hardened list   # "error: boom"                                                           exit=64
$ ./bin/hardened                            # "root ran, args: []"                                                    exit=0

# --- finding 7: GO-CONC-14 report-all ---
$ for i in 1 2 3; do ./bin/verify_errgroup; echo exit=$?; done
error: c: not found      exit=65   (repeated identically 3/3 — a's and b's errors never appear)
$ for i in 1 2 3 4 5; do ./bin/verify_joined; echo exit=$?; done
error: c: failed
a: not found
b: permission denied     exit=79   (repeated identically 5/5)
$ GOMAXPROCS=1 ./bin/verify_joined   # same "c, a, b" order, exit=79
$ GOMAXPROCS=8 ./bin/verify_joined   # same "c, a, b" order, exit=79   (5/5 each)

# --- finding 8/9: colour ---
$ for v in '' 1 true yes 0 anything; do NO_COLOR="$v" TERM=xterm-256color ./bin/colour_probe; done
NO_COLOR="" ...        colorprofile.Env=TrueColor(disabled=false)  termenv.EnvNoColor(stdout)=false
NO_COLOR="1" ...        colorprofile.Env=Ascii(disabled=true)      termenv.EnvNoColor(stdout)=true
NO_COLOR="true" ...     colorprofile.Env=Ascii(disabled=true)      termenv.EnvNoColor(stdout)=true
NO_COLOR="yes" ...      colorprofile.Env=TrueColor(disabled=false) termenv.EnvNoColor(stdout)=true   <- colorprofile MISS
NO_COLOR="0" ...        colorprofile.Env=TrueColor(disabled=false) termenv.EnvNoColor(stdout)=true   <- colorprofile MISS
NO_COLOR="anything" ... colorprofile.Env=TrueColor(disabled=false) termenv.EnvNoColor(stdout)=true   <- colorprofile MISS

$ run.sh go build -trimpath -ldflags="-s -w" -o bin/colour_handrolled ./cmd/colour_handrolled/
$ run.sh go build -trimpath -ldflags="-s -w" -o bin/colour_termenv    ./cmd/colour_termenv/
$ run.sh go build -trimpath -ldflags="-s -w" -o bin/colour_lipgloss   ./cmd/colour_lipgloss/
$ wc -c bin/colour_handrolled bin/colour_termenv bin/colour_lipgloss
1515680 bin/colour_handrolled
2187424 bin/colour_termenv    (+671744, +44.3%)
2654471 bin/colour_lipgloss   (+1138791, +75.1%)
```

Nothing in this file's runnable claims failed to go red on its stated violation shape; the one "not proven, reading only" item is candidate 6's severity-ordering caution, which is a caution against a false assumption rather than a positive rule with its own fixture — the fixture that exists (`verify_joined`) demonstrates the risk, not a fix, because a genuine severity-ranking classifier is a design choice for a later consolidation to pin, not something this dive should invent unasked.

## Exemplar evidence

- **GO-CLI-06's cobra usage-error chain** (`cli/cli@9b031151a825:internal/ghcmd/cmd.go:187-212`, `pkg/cmd/root/root.go:106-107`) sets `SilenceErrors`/`SilenceUsage` but has **no** `TraverseChildren` and **no** custom root `Args` — the corpus has no exemplar of the interaction this file tests, confirming go-cli.md's own note ("No exemplar ships the 64-86 table... the whole ExitCode layer is new for fleet Go CLIs").
- `grep -rln --include='*.go' -F 'TraverseChildren' /home/mherwig/.cache/research-lang/exemplars/go` over the whole corpus (re-measured for this dive) returns hits **only inside cobra's own source** — `spf13/cobra`'s repository files and one vendored copy of cobra under `google/go-containerregistry/vendor/`. No exemplar's own command tree sets `TraverseChildren` on a `*cobra.Command` literal it defines. The gap in §3 is therefore unexercised by any real fleet-analogue codebase in the corpus, not merely rare — which is exactly why go-cli.md's exit dive never surfaced it and this dive had to plant it.
- `aquasecurity/trivy@ae561f8cca36:src/options.go:726` and `junegunn/fzf@b1be3a8be1b8:src/util/util.go:79` (already cited in [go-cli.md](../go-cli.md) GO-CLI-13) both do a bare non-empty `NO_COLOR` check, matching `termenv`'s behaviour and never touching `colorprofile`'s `ParseBool` path — the corpus's own practice already leans toward the spec-correct shape this file confirms, independent of any charm library.
- **The `NO_COLOR` regression is not hypothetical: it is live in the corpus.** `charmbracelet/bubbletea@d5bfd5c2ff74:tea.go:1091-1093` calls `colorprofile.Detect(p.output, p.environ)` as its own default colour-profile detection with no separate `NO_COLOR` override anywhere else in the file (`grep -n 'NO_COLOR' tea.go` is empty), so any bubbletea program that leaves `p.environ` at its default `os.Environ()` (`tea.go:630-631`) inherits exactly the `strconv.ParseBool` gap measured in §8: `NO_COLOR=yes` or `NO_COLOR=0` will not disable colour in that program. `cli/cli@9b031151a825:pkg/cmd/status/status.go:17,678-740` also imports `lipgloss`, but cli/cli's own `go.mod` pins lipgloss v1 (`termenv`-backed, not the v2/`colorprofile` shape), and its own colour gate is a separate `IOStreams.ColorEnabled()` (`pkg/iostreams/iostreams.go:101`) built on `go-isatty`, not a bare `NO_COLOR` string check — `grep -rln --include='*.go' -F 'NO_COLOR' cli__cli` outside test/help-text files is empty, so tracing exactly how `ColorEnabled` composes with `NO_COLOR` is outside this dive's scope; what is confirmed is that cli/cli is on lipgloss v1, not v2, so it is not a live instance of the v2/`colorprofile` bug either way.

## AI-agent angle

1. **Adding `TraverseChildren: true` "to let `--verbose` come before the subcommand" without re-testing the typo path.** An agent copies this flag from cobra's own docs example (which shows only the happy path) and never notices `Find`'s `legacyArgs` guard silently disappeared. *Check:* candidate 2's grep + integration test.
2. **Writing a custom `Args` validator that only checks the shape the author cares about** (arg count, no leading `-`, a regex) and assuming cobra still rejects an unrecognized subcommand underneath it, because that is `NoArgs`'s behaviour and the author tested with `NoArgs` first. *Check:* candidate 1's reading heuristic — every root `Args` function must be read against `cmd.Commands()`.
3. **Copying `errgroup.WithContext` for a "run all checks and report every failure" command**, because errgroup is the pattern most training data associates with concurrent fan-out, without noticing `Wait()` keeps only one error. *Check:* candidate 5's stderr-completeness test.
4. **Treating `errors.As`/`errors.AsType`'s "first match" semantics over a joined error as if it encoded priority**, and writing a comment like "// NotFoundError takes precedence over PermissionError" next to code whose actual behaviour is scheduler-dependent. *Check:* candidate 6 — plant two distinct typed errors in one batch and read the classifier's own ordering logic, not just its test output.
5. **Reaching for `charmbracelet/lipgloss` (agents' most training-data-frequent Go colour/TUI library) for a one-line `NO_COLOR` check**, inheriting `colorprofile`'s `ParseBool` gap without knowing it exists, because lipgloss's own README shows colour output working in a terminal and never demonstrates the `NO_COLOR=yes` case. *Check:* candidate 7's grep plus the six-value table in §8.
6. **Calling the package-level `termenv.EnvNoColor()`/`termenv.ColorProfile()`** (shorter to type, appears first in godoc, and is what most blog-post examples show) instead of constructing `NewOutput(w)` per stream, reproducing the exact `fatih/color`-global footgun GO-CLI-13 already names for a different library. *Check:* candidate 7's second grep.
7. **Assuming `markStarted` must run before `AddCommand`** (natural "set up wrapping, then build the tree" instinct) and discovering subcommands added afterward never get wrapped — the correct order is the reverse. *Check:* candidate 3's reading heuristic.

## Contested / evolving

- **Whether `TraverseChildren`'s typo-detection gap is a cobra defect or documented behaviour.** Neither `Traverse`'s doc comment (`command.go:815`, "Traverse the command tree to find the command, and parse args for each parent") nor the cobra user guide mentions the interaction with unknown subcommands; it reads as an omission rather than an intentional trade-off, but no cobra issue or changelog entry (searched via the GitHub issue tracker as of 2026-09-26) currently tracks it. This file's rule (candidate 2) treats it as a fleet-side responsibility regardless of upstream intent, which is the only stance that does not depend on cobra changing.
- **`charmbracelet/colorprofile`'s `NO_COLOR` handling is recent enough (module still pre-1.0 at `v0.4.3`) that it may change.** If a future `colorprofile` release switches `envNoColor` to a non-empty check, candidate 7's blanket "never rely on it" would need softening to a version floor; as of 2026-09-26 no such change is visible in the fetched `main` branch source.
- **Whether the fleet should adopt `lipgloss`/`colorprofile` at all for anything beyond styled TUI output** is unresolved and out of this dive's scope — §8-9 only settle the narrow `NO_COLOR`-compliance and binary-size questions for a CLI that is deciding *whether to add a colour dependency*, not whether to build a TUI.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [github.com/spf13/cobra/blob/main/command.go](https://github.com/spf13/cobra/blob/main/command.go) | cobra's `Command.Find`, `Traverse`, `execute`, `ExecuteC` | pinned at `adbc8813901b` (cobra v1.10.1), read 2026-09-26 | primary source for every routing/lifecycle claim in §§1-6; line numbers cited throughout are from this exact commit |
| [github.com/spf13/cobra/blob/main/args.go](https://github.com/spf13/cobra/blob/main/args.go) | `legacyArgs`, `NoArgs`, and the other `PositionalArgs` builtins | same commit | shows `legacyArgs`'s exact message text and why `NoArgs` happens to reproduce it |
| [github.com/spf13/cobra/blob/main/completions.go](https://github.com/spf13/cobra/blob/main/completions.go) | `ShellCompRequestCmd`/`ShellCompNoDescRequestCmd` constants, `initCompleteCmd` | same commit | confirms `__complete`/`__completeNoDesc` are ordinary subcommands added inside `ExecuteC`, after any pre-`Execute` tree walk |
| [pkg.go.dev/github.com/spf13/cobra#Command.TraverseChildren](https://pkg.go.dev/github.com/spf13/cobra) | godoc for the `Command` struct | current, read 2026-09-26 | the only documentation `TraverseChildren` has; silent on the unknown-subcommand interaction, which is itself a finding |
| [pkg.go.dev/golang.org/x/sync/errgroup](https://pkg.go.dev/golang.org/x/sync/errgroup) | errgroup package docs | current (`x/sync v0.10.0`), read 2026-09-26 | states `Wait()` returns "the first non-nil error (if any) from them" — the normative basis for finding 7's errgroup half |
| [go.dev/ref/mem](https://go.dev/ref/mem) | The Go Memory Model | current, read 2026-09-26 | no guarantee on unsynchronized goroutine start/finish order — the basis for candidate 6's "do not assume the join order is stable" caution |
| [pkg.go.dev/errors#Join](https://pkg.go.dev/errors#Join) | `errors.Join` and its `Error()`/`Unwrap() []error` contract | current (go1.27.1), read 2026-09-26 | confirms `Join`'s `Error()` newline-joins every wrapped error's message, which is why `verify_joined` prints all three lines |
| [github.com/muesli/termenv/blob/master/output.go](https://github.com/muesli/termenv/blob/master/output.go) | `Output` struct, `NewOutput`, package-level `output` var | fetched at `v0.16.0` (current tag), 2026-09-26 | primary source for termenv's per-writer construction and the package-level-singleton footgun |
| [github.com/muesli/termenv/blob/master/termenv.go](https://github.com/muesli/termenv/blob/master/termenv.go) | `(*Output).EnvNoColor`, `EnvColorProfile` | same fetch | primary source for termenv's exact `NO_COLOR` non-empty check |
| [github.com/charmbracelet/colorprofile/blob/main/env.go](https://github.com/charmbracelet/colorprofile/blob/main/env.go) | `Detect`, `Env`, `envNoColor` (`strconv.ParseBool`) | fetched at `main`/`v0.4.3`, 2026-09-26 | primary source for the `NO_COLOR` regression in finding 8 — this is the exact function whose behaviour the six-value table in §8 measures |
| [github.com/charmbracelet/colorprofile/blob/main/writer.go](https://github.com/charmbracelet/colorprofile/blob/main/writer.go) | `NewWriter`, `Writer.Write` | same fetch | confirms `colorprofile` also decides per-writer (`Detect(w, environ)`), so the library's TTY/profile detection is not itself the problem — only its `NO_COLOR` parsing is |
| [github.com/charmbracelet/lipgloss/blob/master/color.go](https://github.com/charmbracelet/lipgloss/blob/master/color.go) and [github.com/charmbracelet/lipgloss go.mod (master vs v1.1.0 tag)](https://raw.githubusercontent.com/charmbracelet/lipgloss/master/go.mod) | lipgloss v2's own documented `colorprofile.Detect` usage, and the v1→v2 dependency switch from `termenv` to `colorprofile` | v2.0.6 (master) vs v1.1.0 tag, fetched 2026-09-26 | establishes that the `colorprofile` bug is inherited by the *current major* of lipgloss, not a hypothetical dependency choice |
| [no-color.org](https://no-color.org/) | the NO_COLOR informal spec | referenced by both libraries' docs, read 2026-09-26 | "present (regardless of its value)" is the exact text both `termenv` (correctly) and `colorprofile` (incorrectly, for non-boolean values) claim to implement |
| [go.dev/doc/go1.26](https://go.dev/doc/go1.26) | Go 1.26 release notes | referenced from [go-cli.md](../go-cli.md), re-read for `errors.AsType`/`NotifyContext` context used in §5's classify shape | already cited upstream; re-read here only to confirm no 1.27 change affects this dive's `errors.As`/`AsType` usage |

