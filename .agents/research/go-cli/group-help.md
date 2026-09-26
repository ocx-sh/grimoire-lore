---
title: "The silent non-runnable command group — root-causing the wave-3 gap in GO-CLI"
topic: "GO-CLI revision: why a cobra command group with no RunE swallows a bare invocation and a mistyped child as --help/exit 0, and the fix"
agent: group-help-dive
model: sonnet
date_researched: 2026-09-26
sources_count: 15
fixtures:
  - /home/mherwig/.cache/research-lang/go-tools/fixtures/group-help/
scope: >
  Covers: a cobra v1.10.1 command that holds subcommands but has no RunE/Run of
  its own (a "command group"), invoked bare, with --help, via `help <group>`,
  with a mistyped child, and with a real child, at any tree depth including
  under root's own TraverseChildren/custom Args. Does not cover: the root-level
  TraverseChildren/Args interaction already owned by GO-CLI-17, urfave/cli v3's
  equivalent, or Windows-specific behavior (untested here, same as the rest of
  GO-CLI).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Reproduction matrix on both fixture shapes](#1-reproduction-matrix-on-both-fixture-shapes)
   2. [Root cause A — Runnable() and legacyArgs, read at the exact pinned commit](#2-root-cause-a--runnable-and-legacyargs-read-at-the-exact-pinned-commit)
   3. [Root cause B — the shipped skeleton's own writer-wiring gap](#3-root-cause-b--the-shipped-skeletons-own-writer-wiring-gap)
   4. [Why --help and help <group> are unaffected](#4-why---help-and-help-group-are-unaffected)
   5. [The fix, watched red/green on both fixture shapes](#5-the-fix-watched-redgreen-on-both-fixture-shapes)
   6. [A related, mechanically distinct pitfall: ExactArgs + empty Run](#6-a-related-mechanically-distinct-pitfall-exactargs--empty-run)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- A cobra v1.10.1 command that holds subcommands but has **no `RunE`/`Run` of its own** is `!Runnable()`, and `execute()` treats that exactly like `--help`: it returns `flag.ErrHelp`, `ExecuteC` calls `HelpFunc`, and the process exits 0 — for a **bare invocation**, for `--help`, for `help <group>`, and, critically, for **a mistyped child** (`spf13/cobra@adbc8813901b:command.go:955-957`).
- The reason a typo doesn't get caught first: `Find()`'s unknown-subcommand check (`legacyArgs`) fires **only at the root** (`!cmd.HasParent()`, `spf13/cobra@adbc8813901b:args.go:35`) — a non-root command with subcommands "will always accept arbitrary arguments" per its own doc comment (`args.go:26-27`). This holds **regardless of `TraverseChildren` or a custom root `Args`** — GO-CLI-17's fix does not reach this, because the bug reproduces identically with vanilla `Find()` routing and a nil root `Args`.
- Watched on two fixture shapes (plain skeleton and hardened/`TraverseChildren`): `app group`, `app group --help`, `app help group`, and `app group typo` are **all four bit-for-bit identical** — 11 lines of usage on stdout, 0 on stderr, exit 0. A script gating on exit code cannot tell a typo from a help request.
- **The fix**: give the group its own `RunE` that unconditionally returns a typed `*UsageError` (this never fires for a correctly-routed child, only for bare/mistyped invocations, because `Find()`'s `innerfind` only stops at the group when it fails to match the next token). Watched red→green: exit flips 0→64 for bare and typo, `--help`/`help <group>` stay untouched at exit 0, and a real child (`app group leaf`) still routes and runs normally.
- `--help`/`help <group>` are unaffected by the fix because `execute()` checks the help flag **before** the `Runnable()` gate (`command.go:926-936` vs `955-957`) — help short-circuits regardless of whether the command is runnable.
- **A second, compounding, and separately fixable defect** exists in the *already-shipped* skeleton: `go-cli-consolidation/cmd/skeleton/main.go` extracts a testable `run(args []string, stdout, stderr io.Writer) ExitCode`, but never calls `root.SetOut(...)` — only `root.SetErr(stderr)`. Any cobra-generated output (help, usage, `--version`) resolves through `c.OutOrStdout()`, which falls back to the **real `os.Stdout`** whenever `SetOut` was never called on that command or an ancestor (`command.go:392-420`). An in-process integration test that calls `run(args, &buf, &buf)` and asserts on `buf` — the exact pattern GO-CLI-02's testable-`run` design exists to enable — sees **0 captured bytes and exit 0**, indistinguishable from doing nothing, even though a real subprocess's real fd 1 receives the usage text. This is the literal "prints nothing" a test-harness-based repro would report. Watched red/green with a minimal harness; confirmed the shipped skeleton itself is a hit for this gap by running the same grep against it (read-only).
- `reference-skeleton/cmd/hardened/main.go` never wires `SetOut`/`SetErr` at all (it writes classified errors directly to `os.Stdout`/`os.Stderr`), so it isn't a GO-CLI-02-pattern violation in the same sense — it simply never claims the injected-writer testability GO-CLI-02 asks for.
- **Contract decided**: `--help` and `help <cmd>` print usage to stdout and exit 0 (unaffected, already correct). A bare group invocation and a mistyped child print **one line to stderr and exit 64**, matching a missing/unknown subcommand at the root (GO-CLI-06) and EXIT-03's "every other parse-time problem is 64." This is a deliberate choice among two real alternatives — see [Contested](#contested--evolving).
- Real-world corroboration for the whole bug family: [openeverest/openeverest#2816](https://github.com/openeverest/openeverest/issues/2816) hit a **mechanically distinct but closely related** variant — `Args: cobra.ExactArgs(1)` paired with an *empty* (non-nil) `Run` func, which makes the command `Runnable()==true` (so it skips the `flag.ErrHelp` path entirely) but the arg-count-only validator lets any single mistyped token through to the no-op `Run`, silently exiting 0. Their fix (`RunE` that checks `len(args) > 0` and errors, else `cmd.Help()`) independently converges on the same shape recommended below.
- **GO-CLI-06 gets the new clause**, not GO-CLI-17: this bug is independent of `TraverseChildren` and of any root `Args` validator (both fixture shapes reproduce it identically), and GO-CLI-06 is already the rule about "every `RunE` in the tree" and the `!started` fallback — the natural home for "a non-leaf command also needs one."
- **A new rule, GO-CLI-20, is needed** for the writer-wiring gap (root cause B): any `run(args []string, stdout, stderr io.Writer) ExitCode`-shaped entrypoint that constructs a cobra root must call `root.SetOut(stdout)` in addition to `root.SetErr(stderr)`, or cobra's own help/usage/version output is untestable through the injected writer and invisible to any in-process assertion.
- Two exemplars confirm the *setup* pattern is common in real cobra CLIs: `cli/cli@9b031151a825:pkg/cmd/auth/auth.go:16-21` (`gh auth`) and `restic/restic@5127c4abf921:cmd/restic/cmd_key.go:9-24` (`restic key`) both build a command with `AddCommand` and no `RunE`/`Run` at all — the fleet's own best-practice exemplar for GO-CLI-02/05/06/07/11 carries this exact gap on `gh auth` (bare).
- No golangci-lint/staticcheck analyzer understands cobra's `Command` struct semantics, so this has **no clean single grep**; verification is an integration test (given, watched) plus a locator grep that finds candidate files for manual confirmation, not a self-contained pass/fail grep.

## Findings

### 1. Reproduction matrix on both fixture shapes

Fixture module `grouphelp` (`go 1.27`, `github.com/spf13/cobra v1.10.1`, confirmed via `go list -m github.com/spf13/cobra` → `v1.10.1` and `go version` → `go1.27.1 linux/amd64`), under `/home/mherwig/.cache/research-lang/go-tools/fixtures/group-help/`.

Two shapes, both faithfully mirroring an already-shipped GO-CLI fixture's wiring (read, not modified — see [Verification runs](#verification-runs) for the exact source lines), with a `group` command added that holds two leaves (`leaf`, `other-leaf`) and has no `RunE`:

- **`skeleton-group`** mirrors `go-cli-consolidation/cmd/skeleton/main.go`'s pattern: root has `SilenceUsage`/`SilenceErrors` true, no `TraverseChildren`, no custom root `Args`, `markStarted` + a `classify(err, started)` chain.
- **`hardened-group`** mirrors `reference-skeleton/cmd/hardened/main.go`'s pattern: `TraverseChildren: true`, a runnable root with a `rootArgs` validator that explicitly rejects an unmatched first token (the GO-CLI-17 fix), `markStarted`.

Both give **the identical result** for all five invocations (`exit` / `stdout` lines / `stderr` lines):

| Invocation | `skeleton-group` | `hardened-group` |
|---|---|---|
| `app group` (bare) | 0 / 11 / 0 | 0 / 11 / 0 |
| `app group --help` | 0 / 11 / 0 | 0 / 11 / 0 |
| `app help group` | 0 / 11 / 0 | 0 / 11 / 0 |
| `app group typo` | 0 / 11 / 0 | 0 / 11 / 0 |
| `app group leaf` | 0 / 1 / 0 (`leaf ran`) | 0 / 1 / 0 (`leaf ran`) |

The first four rows are **byte-for-byte the same 11-line usage block** (`Usage:`, `Available Commands:`, `Flags:`, the `--help`-for-subcommand hint). GO-CLI-17's root-level fix (`rootArgs`, watched elsewhere as closing the *root's own* typo gap) makes **zero difference** here, because the routing never reaches the root's `Args` at all for these invocations — `Find()`'s `innerfind` already stopped at `group` before `rootArgs` is ever consulted (§2).

### 2. Root cause A — `Runnable()` and `legacyArgs`, read at the exact pinned commit

`Find(args)` runs once, from the root, and walks as far down the tree as consecutive tokens match a child's name or alias (`spf13/cobra@adbc8813901b:command.go:757-779`, `innerfind`). For `app group typo`: `innerfind` matches `group` under `app`, recurses with `["typo"]`; at `group`, `group.findNext("typo")` finds nothing among `leaf`/`other-leaf` (`command.go:798-817`), so `innerfind` returns `(group, ["typo"])` **unchanged** — `cmd == nil` short-circuits before any error is raised (`command.go:768-771`). Back in `Find`, since `commandFound.Args == nil` (the default, and unaffected by anything the root does), it calls:

```go
// spf13/cobra@adbc8813901b:command.go:774-778
commandFound, a := innerfind(c, args)
if commandFound.Args == nil {
    return commandFound, a, legacyArgs(commandFound, stripFlags(a, commandFound))
}
```

`legacyArgs` (`spf13/cobra@adbc8813901b:args.go:24-39`) is the ENTIRE unknown-subcommand check cobra ships, and its own doc comment states the scope precisely:

```go
// legacyArgs validation has the following behaviour:
// - root commands with no subcommands can take arbitrary arguments
// - root commands with subcommands will do subcommand validity checking
// - subcommands will always accept arbitrary arguments
func legacyArgs(cmd *Command, args []string) error {
	if !cmd.HasSubCommands() {
		return nil
	}
	if !cmd.HasParent() && len(args) > 0 {   // <- ROOT ONLY
		return fmt.Errorf("unknown command %q for %q%s", ...)
	}
	return nil
}
```

`group.HasParent()` is `true` (it was added via `root.AddCommand(group)`), so the `!cmd.HasParent()` branch never runs, and `legacyArgs` returns `nil` **no matter what `args` contains**. So `Find` hands back `(group, ["typo"], nil)` — no error, "typo" is just an unconsumed positional token.

`ExecuteC` then calls `cmd.execute(a)` with `cmd = group`, `a = ["typo"]`. Inside `execute()`:

```go
// spf13/cobra@adbc8813901b:command.go:919-957 (abridged)
err = c.ParseFlags(a)                 // "typo" isn't a flag; parses fine
...
if helpVal { return flag.ErrHelp }    // false here — no --help flag was passed
...
if !c.Runnable() {                    // group has neither Run nor RunE
    return flag.ErrHelp               // <-- THE GATE: identical branch as --help
}
```

`ExecuteC` catches `flag.ErrHelp` and turns it into a help print + `nil` error (`command.go:1149-1153`), so `run()`'s caller sees `err == nil`, `classify` never even runs, and the process exits 0. **This is the exact same branch a bare `app group` and an explicit `app group --help` take** — the only difference for `--help` is that `helpVal` becomes true a few lines earlier (§4), and for the typo case it's `!c.Runnable()` a few lines later; both return the identical sentinel and print the identical help.

`app help group` takes a third, orthogonal path: cobra's built-in `help` command finds the target (`group`, via the same `Find`) and calls `.Help()` on it directly — `Help()` always calls `HelpFunc()` unconditionally, with no `Runnable()` check at all (`command.go:517-521`). So all three non-error paths converge on the same `HelpFunc()` call and the same output.

### 3. Root cause B — the shipped skeleton's own writer-wiring gap

Independent of §2, the **already-published** `go-cli-consolidation/cmd/skeleton/main.go` (read, not modified) has this shape:

```go
// /home/mherwig/.cache/research-lang/go-tools/fixtures/go-cli-consolidation/cmd/skeleton/main.go (excerpt)
out := bufio.NewWriter(stdout)
root := newRoot(out)      // `out` is only ever passed to each RunE's own fmt.Fprintln — never to root.SetOut
...
root.SetErr(stderr)       // stderr IS wired
err := root.ExecuteContext(ctx)
```

`root.SetOut(...)` is **never called**. `HelpFunc`'s default implementation writes through `c.OutOrStdout()`:

```go
// spf13/cobra@adbc8813901b:command.go:392-420 (abridged)
func (c *Command) OutOrStdout() io.Writer { return c.getOut(os.Stdout) }
func (c *Command) getOut(def io.Writer) io.Writer {
	if c.outWriter != nil { return c.outWriter }
	if c.HasParent() { return c.parent.getOut(def) }
	return def   // <- falls all the way back to the REAL os.Stdout
}
```

Since neither `group` nor `root` ever had `SetOut` called, `getOut` walks the whole ancestor chain, finds no `outWriter` anywhere, and returns `def = os.Stdout` — the real file descriptor, **not** the `stdout io.Writer` parameter that was passed into `run(args, stdout, stderr io.Writer)`. In production (`main` passes `os.Stdout` as that parameter) this is invisible, because "the real fd" and "the parameter" happen to be the same object. It stops being invisible the moment anyone tests `run` the way its own signature invites — by passing a `*bytes.Buffer` instead of `os.Stdout`, exactly the pattern GO-CLI-02 extracts `run` to enable.

Built a minimal harness reproducing this exactly (`cmd/skeleton-group/harness/main.go`): calls a `run(args, stdout, stderr io.Writer) int` with `root.SetErr(stderr)` but no `SetOut`, invoked with two `bytes.Buffer`s. Result for `app group` (bare):

```
$ ./bin/harness group
Usage:                                    # <- printed to the REAL terminal (fd 1), because HelpFunc bypassed the buffer
  app group [command]
...
HARNESS exit=0 captured_stdout_bytes=0 captured_stderr_bytes=0   # <- what an integration test asserting on the buffer would see
HARNESS captured_stdout=""
```

The real terminal receives the usage block (11 lines, same content as §1) — `run`'s caller (here, `main`, printing diagnostics) sees **0 bytes and exit 0** in the very buffers it was designed to assert against. This is the literal "prints nothing and exits 0" a test-harness-style repro of the wave-3 finding would report, and it is a second, independently fixable defect from §2's routing bug.

### 4. Why `--help` and `help <group>` are unaffected

`execute()`'s help-flag check runs strictly before the `Runnable()` gate:

```go
// spf13/cobra@adbc8813901b:command.go:924-936, then :955-957
// If help is called, regardless of other flags, return we want help.
// Also say we need help if the command isn't runnable.
helpVal, err := c.Flags().GetBool(helpFlagName)
...
if helpVal {
    return flag.ErrHelp
}
...
if !c.Runnable() {
    return flag.ErrHelp
}
```

Both branches return the same sentinel, so giving `group` a `RunE` (§5's fix) removes the *second* branch's trigger but leaves the *first* branch — and therefore `--help` — completely untouched. `help <group>` never touches `execute()`'s `Runnable()` logic at all (§2) and is likewise unaffected. Watched: after the fix, `app group --help` and `app help group` are still exit 0 with the 12-line usage block (one extra line versus the unfixed case, because `RunE` being non-nil changes nothing about the flag declarations, but the help template lists `[command]` as usable now that the parent has its own runnable behavior worth documenting — see [Verification runs](#verification-runs)).

### 5. The fix, watched red/green on both fixture shapes

```go
// The fix: group.RunE never fires for a correctly-routed child (leaf/other-leaf) —
// Find()'s innerfind only stops at group when routing has already failed one level
// down, exactly the same invariant reference-skeleton.md §6's rootArgs relies on.
func groupRunE(cmd *cobra.Command, args []string) error {
	msg := fmt.Sprintf("%q requires a subcommand", cmd.CommandPath())
	if len(args) > 0 {
		msg = fmt.Sprintf("unknown command %q for %q", args[0], cmd.CommandPath())
	}
	return &UsageError{Err: fmt.Errorf("%s; see %q --help", msg, cmd.CommandPath())}
}
group := &cobra.Command{Use: "group", RunE: groupRunE}
```

Applied to both `skeleton-group-fixed` and `hardened-group-fixed`. Result, identical on both shapes (see [Verification runs](#verification-runs) for the exact transcript):

| Invocation | before (violation) | after (fix) |
|---|---|---|
| `app group` (bare) | 0 / 11 / 0 | **64** / 0 / **1** (`error: "app group" requires a subcommand; see "app group" --help`) |
| `app group --help` | 0 / 11 / 0 | 0 / 12 / 0 (unaffected, §4) |
| `app help group` | 0 / 11 / 0 | 0 / 12 / 0 (unaffected, §4) |
| `app group typo` | 0 / 11 / 0 | **64** / 0 / **1** (`error: unknown command "typo" for "app group"; see "app group" --help`) |
| `app group leaf` | 0 / 1 / 0 | 0 / 1 / 0 (unaffected — real child still routes) |

One stderr line, matching GO-CLI-05's "stderr has exactly one error line" invariant already in force for the root's own equivalent case.

### 6. A related, mechanically distinct pitfall: `ExactArgs` + empty `Run`

[openeverest/openeverest#2816](https://github.com/openeverest/openeverest/issues/2816) hit a **sibling** bug, not the same one: a parent command declared `Args: cobra.ExactArgs(1)` **and** a non-nil but empty `Run: func(_ *cobra.Command, _ []string) {}`. Because `Run` is non-nil, `Runnable()` is `true`, so `execute()` never reaches the `flag.ErrHelp` gate at all — instead, `ExactArgs(1)` only checks the **count** of positional args (exactly 1), not their **identity**, so a single mistyped token (`everestctl namespaces llist`) satisfies the validator, the no-op `Run` executes, and the process exits 0 having done nothing. Their fix independently converges on the same shape as §5: replace the empty `Run` with a `RunE` that inspects `args` and returns an error for anything unrecognized, falling back to `cmd.Help()` only for the genuinely-empty case. The shared root cause across both bugs: cobra's *only* built-in unknown-subcommand check (`legacyArgs`) is root-only (§2), so **any** non-root command with children must supply its own validation — whether that command is non-runnable (this dive's case) or runnable with a count-only validator (openeverest's case) is a different symptom of the identical gap.

## Normative guidance candidates

1. **A cobra command that owns subcommands (`.AddCommand(...)` called on it at least once) MUST also declare its own `RunE` that returns a typed usage error — never leave it with neither `Run` nor `RunE`.**
   - Rationale: `!c.Runnable()` returns `flag.ErrHelp` (`command.go:955-957`), the identical branch `--help` takes, and cobra's only unknown-subcommand check (`legacyArgs`) never fires below the root (`args.go:35`), so a bare invocation and a mistyped child are indistinguishable from `--help` to any script checking the exit code.
   - Verify: integration test invoking the built binary with `group`, `group <typo>`, and `group <real-child>`, asserting exit 64/64/0 and exactly one stderr line for the first two. Reading heuristic (locator only, not self-contained): `grep -rl --include='*.go' -F '.AddCommand(' . | xargs -r echo` lists candidate files; for each, open it and confirm the receiver's own `&cobra.Command{...}` literal has a `RunE:`/`Run:` field. No single grep isolates the violation because the literal and the `AddCommand` call are not adjacent tokens — this needs a `go/ast`-based checker to be fully mechanical, out of scope here.
   - Watched: **yes**, `fixtures/group-help/{skeleton,hardened}-group` (violation) vs `{skeleton,hardened}-group-fixed` (fix) — full 5-invocation matrix, §1 and §5.
   - This is **GO-CLI-06's new clause**, not GO-CLI-17: reproduces identically with no `TraverseChildren` and no custom root `Args` (`skeleton-group`), so it is independent of the root-level mechanism GO-CLI-17 already covers.

2. **The `RunE` a non-runnable-in-spirit command gets MUST distinguish "no further token" from "an unrecognized token" in its message, but MUST classify both to the same usage exit code (64).**
   - Rationale: both are "the invocation is incomplete/wrong," and the fleet's classifier (GO-CLI-05) already gives the `!started` fallback and typed `*UsageError`s the same treatment — a group should not invent a third exit code.
   - Verify: the same integration test as candidate 1, asserting `app group` and `app group typo` both exit 64 (not just "non-zero").
   - Watched: **yes**, §5 table — both rows show 64.

3. **`--help`, `help <cmd>`, and any real child invocation MUST be unaffected by candidate 1's fix — verify this explicitly, don't just assert the new failure case.**
   - Rationale: `execute()`'s help-flag check (`command.go:926-936`) runs before the `Runnable()` gate (`:955-957`), and `Help()` (`:517-521`) never checks `Runnable()` at all — but an agent "fixing" a group by giving it a `RunE` that unconditionally errors (ignoring the help-flag short-circuit cobra already provides) would not break this either, since cobra intercepts `--help` upstream of any user code. The real risk is an agent instead trying to "fix" this by setting `Args: cobra.NoArgs` or similar on the group, which does nothing for the bare case and nothing for §2's root cause.
   - Verify: the same integration test, asserting `--help`/`help <cmd>` stay at exit 0 with the usage block, and a real child still exits 0 with its own output.
   - Watched: **yes**, §5 table, rows 2/3/5.

4. **(New rule, GO-CLI-20.) A `run(args []string, stdout, stderr io.Writer) ExitCode`-shaped entrypoint that constructs a cobra root MUST call `root.SetOut(stdout)` in addition to `root.SetErr(stderr)`.**
   - Rationale: cobra's own help/usage/version rendering resolves through `c.OutOrStdout()`/`c.OutOrStderr()` (`command.go:392-420`), which fall back to the real `os.Stdout`/`os.Stderr` whenever `SetOut`/`SetErr` was never called on the command or any ancestor — independent of whatever a `RunE` body itself writes to. Without this, an in-process test asserting on the injected buffer sees 0 bytes and exit 0 for any cobra-generated output, defeating the exact testability GO-CLI-02 extracts `run` to provide.
   - Verify: `grep -rl --include='*.go' -F 'func run(' . | xargs -r grep -L -F '.SetOut('` — a file defining a `run(...)` entrypoint that never calls `.SetOut(` anywhere in it is the violation; empty output = pass.
   - Watched: **yes**. Violation: `cmd/skeleton-group/harness` → hit, and the SAME grep against the read-only, already-shipped `go-cli-consolidation/cmd/skeleton/main.go` → **also a hit** (this rule would fail the current published fixture). Fix: `cmd/skeleton-group/harness-fixed` → empty (pass), captured buffer went from 0→175 bytes for the identical `app group` invocation.

5. **Never rely on `Args: cobra.ExactArgs(n)` (or any count-only positional validator) to detect a mistyped subcommand under a command that has children.**
   - Rationale: a count-only validator checks *how many* tokens are left, not *whether* they name a real child — `legacyArgs`'s membership check never runs below the root (§2), so nothing else checks membership either. [openeverest/openeverest#2816](https://github.com/openeverest/openeverest/issues/2816) is exactly this, one level removed from candidate 1 (`Run` was non-nil there, so it's the count-only-validator failure mode rather than the `!Runnable()` one).
   - Verify: reading heuristic only — `grep -rn --include='*.go' -e 'cobra.ExactArgs(' -e 'cobra.RangeArgs(' -e 'cobra.MinimumNArgs(' .` on any command that also calls `.AddCommand(`, then confirm the `RunE` checks the token against `cmd.Commands()` before treating it as positional input.
   - Watched: **no** — reading heuristic only; not reproduced in this dive's own fixtures (candidate 1's fixtures use no positional `Args` on `group` at all), corroborated only by the external issue, not a fixture red/green here.

## Verification runs

Fixture module `grouphelp` (`go 1.27`, cobra v1.10.1), under `/home/mherwig/.cache/research-lang/go-tools/fixtures/group-help/`. All builds via `run.sh`.

```text
$ run.sh go mod tidy && run.sh go build -o bin/ ./cmd/...     # exit 0

# --- candidate 1/2/3: skeleton-group (violation) vs skeleton-group-fixed ---
[skeleton-group      group]        exit=0  stdout=11L stderr=0L
[skeleton-group      group --help] exit=0  stdout=11L stderr=0L
[skeleton-group      help group]   exit=0  stdout=11L stderr=0L
[skeleton-group      group typo]   exit=0  stdout=11L stderr=0L
[skeleton-group      group leaf]   exit=0  stdout=1L  stderr=0L  "leaf ran"

[skeleton-group-fixed group]        exit=64 stdout=0L stderr=1L  error: "app group" requires a subcommand; see "app group" --help
[skeleton-group-fixed group --help] exit=0  stdout=12L stderr=0L
[skeleton-group-fixed help group]   exit=0  stdout=12L stderr=0L
[skeleton-group-fixed group typo]   exit=64 stdout=0L stderr=1L  error: unknown command "typo" for "app group"; see "app group" --help
[skeleton-group-fixed group leaf]   exit=0  stdout=1L  stderr=0L  "leaf ran"

# --- same matrix, hardened shape (TraverseChildren + rootArgs) — identical outcome ---
[hardened-group        group]        exit=0  stdout=11L stderr=0L
[hardened-group        group typo]   exit=0  stdout=11L stderr=0L
[hardened-group-fixed  group]        exit=64 stdout=0L stderr=1L
[hardened-group-fixed  group typo]   exit=64 stdout=0L stderr=1L
[hardened-group-fixed  group --help] exit=0  stdout=12L stderr=0L
[hardened-group-fixed  group leaf]   exit=0  stdout=1L  stderr=0L

# --- candidate 4 (GO-CLI-20): the writer-wiring gap, in-process harness ---
$ ./bin/harness group                       # real terminal (fd 1) receives the 11-line usage block
HARNESS exit=0 captured_stdout_bytes=0 captured_stderr_bytes=0    # <- the buffer a test would assert on

$ ./bin/harness-fixed group                 # SetOut(out) added, nothing else changed
HARNESS exit=0 captured_stdout_bytes=175 captured_stderr_bytes=0
HARNESS captured_stdout="Usage:\n  app group [command]\n\n...\n"

$ grep -rl --include='*.go' -F 'func run(' cmd/skeleton-group/harness       | xargs -r grep -L -F '.SetOut('
cmd/skeleton-group/harness/main.go                    # exit 123 (xargs: match found) -> HIT
$ grep -rl --include='*.go' -F 'func run(' cmd/skeleton-group/harness-fixed | xargs -r grep -L -F '.SetOut('
                                                       # exit 0, no output -> PASS

# same grep, read-only, against the ALREADY-SHIPPED go-cli-consolidation fixture (not modified):
$ grep -rl --include='*.go' -F 'func run(' /home/mherwig/.cache/research-lang/go-tools/fixtures/go-cli-consolidation/cmd/skeleton | xargs -r grep -L -F '.SetOut('
/home/mherwig/.cache/research-lang/go-tools/fixtures/go-cli-consolidation/cmd/skeleton/main.go    # <- the shipped skeleton is a HIT
```

Candidate 5 was **not** watched against a fixture in this dive (reading heuristic only, corroborated by the external issue) — see the candidate's own row for why.

## Exemplar evidence

| Candidate | Satisfies | Violates |
|---|---|---|
| 1 (group needs `RunE`) | none measured — no exemplar's non-runnable group returns a typed usage error from its own `RunE`; `cli/cli`'s root itself does (GO-CLI-06's own citation), but that's the root, not a nested group | `cli/cli@9b031151a825:pkg/cmd/auth/auth.go:16-21`: `NewCmdAuth` builds `cmd := &cobra.Command{Use: "auth <command>", ...}` with `GroupID: "core"` and 8 `AddCommand(...)` calls, no `RunE`/`Run` anywhere in the function. `gh auth` (bare) reproduces §2's mechanism exactly: cli/cli's root `PersistentPreRunE` (`pkg/cmd/root/root.go:83`) does not give `auth` a `RunE`, and no custom `HelpFunc` override changes the `Runnable()` gate. |
| 1 | none measured | `restic/restic@5127c4abf921:cmd/restic/cmd_key.go:9-24`: `newKeyCommand` builds `cmd := &cobra.Command{Use: "key", ...}` and `cmd.AddCommand(newKeyAddCommand(...), newKeyListCommand(...), newKeyPasswdCommand(...), newKeyRemoveCommand(...))` with no `RunE`/`Run`. `restic key <typo>` reproduces §2 identically (restic uses plain cobra with no custom `Runnable()`/`Find` override anywhere in `cmd/restic`). |
| 4 (GO-CLI-20, `SetOut`) | none measured — no exemplar in the corpus both extracts a testable `run(args, stdout, stderr io.Writer)` function AND calls `SetOut` on it; `cli/cli`'s `IOStreams` shape (cited throughout go-cli.md for GO-CLI-03/07/11) wires its OWN abstraction, not cobra's `SetOut`/`SetErr` directly, so it sidesteps this specific gap by not using cobra's writer hooks for its main output path at all | the fleet's own shipped `go-cli-consolidation/cmd/skeleton/main.go` (this dive's grep, run read-only against it, is a hit) |
| 5 (`ExactArgs` count-only) | none measured in-corpus | [openeverest/openeverest#2816](https://github.com/openeverest/openeverest/issues/2816) (external, not in the exemplar corpus, cited as corroboration of the shared root cause) |

No exemplar was found where a nested command group's `RunE` explicitly rejects an unrecognized child — this pattern is new territory for the fleet, same as GO-CLI's other "documented gaps" (go-cli.md's "A root that takes both subcommands and its own positional arguments" section is the closest prior art, and it is the ROOT-level version of the same underlying gap this dive found one level down).

## AI-agent angle

1. **Building a command-group tree by copying cobra's own "Command groups" doc example**, which shows `cmd.AddCommand(subCmd)` with no discussion of what the parent itself needs, and never mentions that a bare/mistyped invocation of the parent silently succeeds. *Check:* candidate 1's integration test — run it on every command that has `.AddCommand(` called on it, not just the root.
2. **"Fixing" a silent group by setting `Args: cobra.NoArgs` or `cobra.ExactArgs(0)` on it**, which does nothing: the `!Runnable()` gate fires before `ValidateArgs` even runs for the bare case (`command.go:955-957` is checked before `:968`), and for the typo case `legacyArgs` never even reaches the group's own `Args` field in a way that rejects membership — a count-only validator, per candidate 5, still lets a single wrong token through if it satisfies the count. *Check:* candidate 1's test on `app group typo` specifically, not just `app group`.
3. **Assuming `TraverseChildren`/a custom root `Args` (GO-CLI-17's fix) also protects nested groups.** It doesn't — §1's matrix shows `hardened-group` (which has the GO-CLI-17 fix on its root) behaves identically to `skeleton-group` (which has neither). An agent that reads GO-CLI-17 and stops there will believe the typo path is closed fleet-wide; it is only closed **at the root**.
4. **Extracting a testable `run(args, stdout, stderr io.Writer) ExitCode` (GO-CLI-02's own pattern) and assuming that wiring `stdout`/`stderr` into `bufio.Writer`s used by each `RunE` is sufficient** — it wires the *business output*, not cobra's *own* output. The missing `root.SetOut(...)` call is easy to miss because nothing errors, nothing panics, and production behavior (where `stdout` IS `os.Stdout`) looks identical either way. *Check:* candidate 4's grep, or an in-process test of `--help`/a bare group that asserts on the captured buffer instead of running the binary as a subprocess.
5. **Copying `cmd.Help()` as the return value for a group's `RunE`** (as openeverest's own fix does for the truly-bare case) without noticing it returns `nil`, not an error — if an agent wants exit 64 for the bare case too (this dive's chosen contract, §5, [Contested](#contested--evolving)), `cmd.Help()` alone gives exit 0, and the two need to be combined deliberately, not treated as interchangeable "show help" calls.

## Contested / evolving

- **Should a bare group invocation (zero further tokens) be exit-0-with-help, or exit-64-with-a-usage-error?** Both are defensible and both exist in practice as of 2026-09-26:
  - *This dive's contract (§5, recommended):* exit 64, one stderr line, matching the fleet's existing precedent for a missing/unknown subcommand at the root (GO-CLI-06) and EXIT-03's "every other parse-time problem is 64" — the rationale being that a script gating on exit code should never see 0 from a group that produced no result.
  - *openeverest's fix ([#2816](https://github.com/openeverest/openeverest/issues/2816)):* bare invocation → `cmd.Help()` (exit 0, "discoverable"), only a *non-empty, unrecognized* token → an error. This treats bare-with-nothing-else as equivalent to `--help`, and only a genuine typo as wrong.
  - Neither cobra's own docs nor clig.dev take a position on this specific case (clig.dev discusses exit-code hygiene in general — "exit codes are how scripts determine whether a program succeeded or failed" — but not this parent-command-with-no-args case specifically). The fleet's own root-level precedent (a bare *root* invocation prints help and exits 0 in the shipped skeleton, because the root has no `RunE` either and that's treated as the discoverability path, not an error) is in tension with this dive's contract for *nested* groups — an implementer could reasonably argue for symmetry with the root instead. This dive recommends breaking that symmetry deliberately (nested groups require a subcommand; the root's "show me what's here" bare case is the one legitimate 0), but flags it as a real design choice, not a discovered fact.
- **`GroupID`-based grouping (cobra's `AddGroup`/`GroupID` field, used by `cli/cli`'s `auth` command, `pkg/cmd/auth/auth.go:19`) is a UI concept (which section of `--help` a command's *children* are listed under) and is entirely unrelated to this dive's finding** — it was checked and does not change `Runnable()`, `Find()`, or `legacyArgs` in any way. Worth stating explicitly because the name invites confusion with "command group" as used throughout this file (a command that groups subcommands, not cobra's help-listing `GroupID`).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [spf13/cobra command.go @ adbc8813901b](https://github.com/spf13/cobra/blob/adbc8813901b/command.go) | cobra's own source, pinned commit | current (v1.10.1, the fleet's pinned version, read 2026-09-26) | primary: `execute()`'s `Runnable()`/`flag.ErrHelp` gate (:919-957), `Find`/`innerfind` (:757-779), `OutOrStdout`/`getOut` (:392-420), `HelpFunc`/`Help()` (:482-521), `ExecuteC`'s `flag.ErrHelp` interception (:1149-1153) |
| [spf13/cobra args.go @ adbc8813901b](https://github.com/spf13/cobra/blob/adbc8813901b/args.go) | cobra's own source, pinned commit | current, read 2026-09-26 | primary: `legacyArgs`' exact root-only scope (:24-39), its own doc comment stating "subcommands will always accept arbitrary arguments" |
| [pkg.go.dev/flag#ErrHelp](https://pkg.go.dev/flag#ErrHelp) | Go stdlib `flag` package docs | Go 1.27.1, current | primary: confirms `flag.ErrHelp`'s stdlib meaning ("the error returned if the -help or -h flag is invoked"), which cobra repurposes for the `!Runnable()` case too |
| [cobra.dev — Working with Commands](https://cobra.dev/docs/how-to-guides/working-with-commands/) | cobra's own how-to docs | current, read 2026-09-26 | primary: cobra's own guidance on building a command tree; silent on what a non-runnable parent needs, which is itself the finding |
| [spf13/cobra site/content/user_guide.md @ adbc8813901b](https://github.com/spf13/cobra/blob/adbc8813901b/site/content/user_guide.md) | cobra's own user guide (moved under `site/content/` at this commit, the source behind cobra.dev) | current, fetched 2026-09-26 | primary: 887 lines, zero mentions of "runnable" or a non-runnable parent — cobra's own guide is silent on what a command-with-children-but-no-Run needs, corroborating that this is an undocumented gap, not a documented tradeoff |
| [openeverest/openeverest#2816](https://github.com/openeverest/openeverest/issues/2816) | real-world GitHub issue, before/after code | closed, read 2026-09-26 | independent corroboration of the sibling bug (§6): a different mechanism (`ExactArgs` + empty `Run`) converging on the same root cause and a similar fix shape |
| [clig.dev](https://clig.dev/) | Command Line Interface Guidelines | current, read 2026-09-26 | general exit-code philosophy ("exit codes are how scripts determine whether a program succeeded or failed") — cited for the contract decision in §5/[Contested](#contested--evolving); does not address this specific case |
| [man.openbsd.org/sysexits](https://man.openbsd.org/sysexits) | the sysexits(3) table | reference, unchanged | primary: the source of the 64 (`EX_USAGE`) this dive's contract reuses for both the bare and typo'd group cases |
| `rules/rust-quality/cli-contract.md` (fleet, EXIT-03/CLI-01/CLI-02) | the fleet's own Rust CLI contract | 2026-09-26 | the binding contract this dive's Go decision mirrors: "--help/--version → 0, every other error → 64" (EXIT-03), errors unconditionally to stderr (CLI-01) |
| `go-cli.md` (this program, GO-CLI-01..19) | the consolidation this dive revises | 2026-09-26 | GO-CLI-06 (markStarted/`!started` fallback, the rule this dive's clause extends) and GO-CLI-17 (root-level `TraverseChildren`/`Args`, the rule this dive's finding is independent of) |
| `go-cli/reference-skeleton.md` (this program) | the wave-3 dive this brief follows up on | 2026-09-26 | §§1-6 (the root-level `Find`/`Traverse`/`legacyArgs` findings this dive extends one level down); does not mention command groups |
| `/home/mherwig/.cache/research-lang/go-tools/fixtures/go-cli-consolidation/cmd/skeleton/main.go` | the shipped, copyable reference skeleton (read-only) | 2026-09-26 | the exact file GO-CLI-20 (§ Normative candidate 4) finds a hit in — read to confirm the writer-wiring gap is real in the artifact that ships, not hypothetical |
| `/home/mherwig/.cache/research-lang/go-tools/fixtures/reference-skeleton/cmd/hardened/main.go` | the hardened test-matrix fixture (read-only) | 2026-09-26 | read to confirm it never extracts a testable `run(...)`, so it is out of scope for GO-CLI-20 even though it also never calls `SetOut`/`SetErr` |
| `cli/cli@9b031151a825:pkg/cmd/auth/auth.go` | exemplar source | fetched 2026-09-26, repo HEAD at clone time | exemplar evidence for candidate 1 — a real, widely-used CLI with the exact non-runnable-group shape on `gh auth` |
| `restic/restic@5127c4abf921:cmd/restic/cmd_key.go` | exemplar source | fetched 2026-09-26, repo HEAD at clone time | second, independent exemplar for candidate 1 (`restic key`), from a different lineage (backup tool vs. GitHub CLI) |
