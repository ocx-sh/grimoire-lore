---
title: "Go CLI contract — streams, buffering, colour, prompts, config paths, framework"
topic: "stdout discipline, buffering, colour, prompts, config paths and the framework fleet Go CLIs use"
agent: streams-and-terminal
model: sonnet
date_researched: 2026-09-26
sources_count: 16
fixtures: /home/mherwig/.cache/research-lang/go-tools/fixtures/streams-and-terminal/
scope: |
  Covers map rows M-F-07..12 and M-F-14 only: the stdout/stderr split and its
  JSON-mode corollary, buffered-output flush discipline, error-chain
  sanitization at the CWE-150 boundary, per-stream colour decisions, prompt/
  secret rules, config/cache path resolution and precedence, and the CLI
  framework choice (cobra vs urfave/cli v3 vs stdlib flag). Does NOT cover
  exit codes proper, SIGPIPE/signal handling, or completions/TUI depth
  (M-F-01..06, M-F-13, M-F-15..16 — other rows' briefs).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Stdout carries only the result](#1-stdout-carries-only-the-result)
   2. [Buffered output and flush discipline](#2-buffered-output-and-flush-discipline)
   3. [Sanitizing the error chain (CWE-150)](#3-sanitizing-the-error-chain-cwe-150)
   4. [Colour: per-stream, NO_COLOR-correct](#4-colour-per-stream-no_color-correct)
   5. [Prompts, secrets, non-interactive bypass](#5-prompts-secrets-non-interactive-bypass)
   6. [Config/cache paths and precedence](#6-configcache-paths-and-precedence)
   7. [Framework: cobra vs urfave/cli v3 vs stdlib flag](#7-framework-cobra-vs-urfavecli-v3-vs-stdlib-flag)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- stdout carries the result and nothing else; every log, progress, prompt and error line goes to stderr — the fleet's `CLI-01` transfers to Go unchanged ([config-inventory §4](../go-audit/config-inventory.md)).
- Under a `--format json`/machine-output mode, one stray `fmt.Println` on stdout (a progress line, a "done" banner) breaks every downstream `jq .` — verified: it turns exit 0 into a `jq` parse error, exit 5.
- `os.Stdout` has **no built-in line buffering** (unlike Rust's `io::Stdout`), so a multi-line command that skips `bufio.Writer` pays a syscall per line — measured 5.5–6.6x slower for 100k lines, both to a regular file and through a pipe.
- `defer w.Flush()` is a trap on any path that calls `os.Exit`: deferred functions never run on `os.Exit`, so an early-return error path silently drops every buffered line — measured: 5 buffered lines, 0 bytes reach the redirected file.
- `fmt`'s `%q` verb already escapes control and non-printable (Unicode `Cf`) runes via `strconv.Quote`'s printability check — it happens to neutralize both raw ESC and the bidi override U+202E. `%s`/`%v`/`Println` on the same untrusted string do **not** — this is the one CWE-150 gap that actually needs a dedicated sanitizer at the error boundary.
- `NO_COLOR` must be **present and non-empty** to disable colour; `NO_COLOR=""` must leave colour **on**. A common bug — checking presence with `os.LookupEnv` instead of non-emptiness with `os.Getenv(...) != ""` — gets this backwards; `github.com/fatih/color` v1.19.0 gets it right (`noColorIsSet()` checks `!= ""`) but decides colour **once, globally, against `os.Stdout` only** — a real per-stream gap even in the most common colour library.
- The colour/TTY decision must be taken independently per stream (stdout vs stderr): verified under a real pty that a stdout-only decision reused for stderr is wrong the moment one stream is redirected and the other is not.
- Prompting without a TTY gate is a production hang, not a cosmetic bug: a program that unconditionally reads from stdin blocks forever when stdin is an open pipe that never writes (the common shape of inherited-but-unclosed stdin in CI) — verified with a 2s timeout killing the violation (exit 124) while the TTY-gated fix exits 64 immediately.
- `golang.org/x/term.IsTerminal(int(fd))` is the per-fd check; `github.com/mattn/go-isatty`'s `IsCygwinTerminal` is the one thing `x/term` does not cover — Windows Cygwin/MSYS2 ptys report as non-console handles that `x/term.IsTerminal` misses.
- `os.UserConfigDir()`/`os.UserCacheDir()` (stdlib since Go 1.13) resolve `$XDG_CONFIG_HOME`/`$XDG_CACHE_HOME` on Unix, `%AppData%`/`%LocalAppData%` on Windows, and `~/Library/{Application Support,Caches}` on Darwin — stdlib alone covers what Rust's fleet needs the third-party `directories` crate for.
- A hand-rolled `filepath.Join(os.Getenv("HOME"), ".config", name)` silently ignores `XDG_CONFIG_HOME` — verified: differs from `os.UserConfigDir()`'s answer the moment `XDG_CONFIG_HOME` is set, matches only when it happens to be unset.
- Precedence is flags > env > project config > user config > system config; a resolver that walks layers highest-first and skips empty ones reproduces this correctly — verified over a 5-layer synthetic stack.
- `viper` is disproportionate for a CLI's actual need: a trivial one-`SetDefault` program links to **5.19 MB** and pulls **47** `go.sum` entries (crypt/consul/etcd providers riding along even unused); the same job in `koanf` (confmap provider) links to **2.07 MB** / 12 entries; a hand-rolled ~30-line precedence merge (as verified above) needs zero dependencies. Viper is proportionate only when the app truly needs its remote-provider/hot-reload machinery.
- `spf13/cobra`'s own official user guide still scaffolds `cobra-cli init` with `viper.BindPFlag` wiring by default — the framework's own documentation nudges toward the disproportionate choice.
- Framework measurement on a 5-subcommand fixture, Go 1.27.1, `-trimpath -ldflags="-s -w"`: **cobra v1.10.1** 2.43 MiB, ~1.4 ms/startup; **urfave/cli v3.13.0** 3.55 MiB, ~1.2 ms/startup; **stdlib `flag`** 1.52 MiB, ~1.0 ms/startup. Startup differences are noise-level (all sub-1.5ms); binary size is not (urfave is the largest of the three, not the lightest, contrary to a "thin CLI framework" assumption).
- `urfave/cli v3.13.0` hardcodes exit code **3** for an unrecognized subcommand (`help.go`'s `Exit(errMsg, 3)` inside its help-fallback path) — this is an `ExitCoder`-wrapped error that bypasses a caller's own exit-64 usage-error convention unless `Command.CommandNotFound` is overridden. cobra's unknown-command path, by contrast, is a plain error the caller's own dispatcher already controls.
- urfave/cli v3's own official exit-codes example (`docs/v3/examples/exit-codes.md`) calls `log.Fatal(err)` on the returned error — `log.Fatal` always exits 1, silently discarding the `cli.Exit(msg, 86)` code the example just built. Copying that example verbatim breaks custom exit codes.
- cobra generates completions natively (`GenBashCompletion`/`GenZshCompletion`/`GenFishCompletion`/`GenPowerShellCompletion`) from the same `*cobra.Command` tree used for parsing; urfave/cli v3 ships the same capability (`completion.go`, `fish.go`) gated behind `EnableShellCompletion`; stdlib `flag` has none. Neither third-party framework needs a separate generator crate the way Rust's `clap_complete` does.

## Findings

### 1. Stdout carries only the result

The fleet's `CLI-01`/`CLI-02` (["The result goes to stdout... under a machine-output flag, stdout is the payload and nothing else"], [cli-contract.md](../../rules/rust-quality/cli-contract.md)) transfer to Go with **no mechanism change** — `config-inventory.md §4` classifies both **Neutral** — but Go has no compiler or type system that enforces it; the only enforcement is discipline plus a test that parses the whole captured stdout.

[clig.dev](https://clig.dev/) states it as two separate rules: *"Send output to `stdout`... Anything that is machine readable should also go to `stdout`"* and *"Send messaging to `stderr`. Log messages, errors, and so on should all be sent to `stderr`."*

`cli/cli` structures this as a type, not a convention: `IOStreams` (`cli/cli@9b031151a825:pkg/iostreams/iostreams.go:52-99`) holds `In`, `Out`, `ErrOut` as distinct fields, plus a **fourth** stream, `ContentOut`, specifically for bytes the CLI did not author (HTTP response bodies, gist file contents) — see [§3](#3-sanitizing-the-error-chain-cwe-150). No package-level `os.Stdout`/`os.Stderr` call appears outside this struct's construction (`System()`, line 524-545) and its test double (`fakeTerm`, line 562+); every command writes through the struct fields it was handed. This is the shape a Go CLI should copy: one struct carrying the streams, injected into every command, never a bare `os.Stdout` reference in command logic.

**Wrong (violation, verified):**
```go
fmt.Println("Fetching manifest...") // progress line — lands on stdout
enc := json.NewEncoder(os.Stdout)
enc.Encode(result)
```
Piping this into `jq .` fails: `jq: parse error: Invalid numeric literal at line 1, column 9`, exit 5. See [Verification runs §4](#4-jsonmode).

**Right (fix, verified):**
```go
fmt.Fprintln(os.Stderr, "Fetching manifest...") // progress on stderr
enc := json.NewEncoder(os.Stdout)
enc.Encode(result)
```
`jq .` succeeds, exit 0, and the progress line still reaches the terminal (via stderr) when not piped.

### 2. Buffered output and flush discipline

`config-inventory.md §4` flags this as the one place Go needs the discipline **more**, not equally, compared to Rust: *"Go's `os.Stdout` has no built-in line buffering, unlike Rust's `io::Stdout` which is inherently line-buffered."* `bufio.NewWriter` defaults to a 4096-byte buffer ([pkg.go.dev/bufio#NewWriter](https://pkg.go.dev/bufio#NewWriter)); every `Write` that does not fill it stays in memory until `Flush`, `Available` overflow, or the writer is discarded.

Measured (100k lines, `fmt.Println`/`fmt.Fprintln` to a `bufio.Writer`, Go 1.27.1, `-trimpath`):

| Destination | Unbuffered (`fmt.Println`) | `bufio.Writer` + one `Flush` | Ratio |
|---|---|---|---|
| Regular file | ~29 ms | ~5.3 ms | **5.5x** |
| Pipe (`\| cat > /dev/null`) | ~44 ms | ~8 ms | **5.5x** |

See [Verification runs §1](#1-buffering-speed).

**The sharper bug is not speed, it's data loss.** `defer w.Flush()` is the idiomatic-looking pattern, and it is silently wrong on any path that reaches `os.Exit` — deferred functions never run on `os.Exit` ([pkg.go.dev/os#Exit](https://pkg.go.dev/os#Exit): *"Exit causes the current program to exit... The program terminates immediately; deferred functions are not run"*). Verified: a program that writes 5 lines through a `bufio.Writer`, `defer`s the flush, then hits an error path calling `os.Exit(2)` produces **0 bytes** of captured output — all 5 lines vanish. The fix is an explicit `w.Flush()` immediately before every `os.Exit` call site (not a `defer`), or restructuring so the only exit is `main`'s own `return`. See [Verification runs §2](#2-early-exit-flush-loss).

**Wrong (violation, verified — GO-CLI M-F-08b):**
```go
w := bufio.NewWriter(os.Stdout)
defer w.Flush() // never runs below
for i := 0; i < 5; i++ { fmt.Fprintln(w, "line", i) }
if failed {
    os.Exit(2) // all 5 buffered lines are lost
}
```

**Right (fix, verified):**
```go
w := bufio.NewWriter(os.Stdout)
for i := 0; i < 5; i++ { fmt.Fprintln(w, "line", i) }
if failed {
    w.Flush() // explicit — defer cannot reach this path
    os.Exit(2)
}
w.Flush()
```

### 3. Sanitizing the error chain (CWE-150)

`config-inventory.md §4` (CLI-03) frames the mechanism as neutral (*"same discipline at `main`'s single `if err != nil { ... }`"*), but the audit did not have a Go-specific vulnerability to point at; one now exists. [GHSA-fwjx-9p69-h25h](https://github.com/advisories/GHSA-fwjx-9p69-h25h) (CVE-2026-73506, `github.com/jandedobbeleer/oh-my-posh`, ≤29.35.0, fixed 29.35.1) is exactly this bug in a real Go CLI: the prompt renderer's `write(s rune)` in `src/terminal/writer.go` "emits raw control characters (ESC `0x1b`, BEL `0x07`, CSI, OSC) directly to output without neutralization," fed by attacker-controlled directory names and Git metadata (`.Commit.Subject`, `.Commit.Author.Name/.Email`, `.RawUpstreamURL` — Git imposes no restriction on any of these). Impact per the advisory: "clipboard hijacking (OSC 52 write), prompt/screen spoofing, window-title manipulation, and terminal denial of service." [CWE-150](https://cwe.mitre.org/data/definitions/150.html) generalizes it: *"Assume all input is malicious... use output encoding to strip or neutralize escape codes before terminal rendering."*

**A genuinely surprising result from the planted fixture:** `fmt.Errorf("... %q ...", untrusted)` is *already* a partial sanitizer. `%q` calls into `strconv.Quote`'s machinery, which uses `unicode.IsPrint` to decide what to escape as `\uXXXX`/`\xXX` — and `unicode.IsPrint` returns `false` for the Unicode `Cf` (format) category, which includes U+202E (RIGHT-TO-LEFT OVERRIDE). The first version of this fixture used `%q` as the "violation" and it came out already escaped — it is not a violation. `%s`, `%v`, and `Println`/string concatenation carry no such protection.

**Wrong (violation, verified):**
```go
name := "evil\x1b[31mFAKE-ERROR\x1b[0m‮txt.exe‬" // registry-supplied
err := fmt.Errorf("pull failed: repository %s not found", name)
fmt.Fprintln(os.Stderr, "error:", err)
```
Raw ESC (`\x1b`) and U+202E both reach the terminal unchanged. See [Verification runs §3](#3-sanitize).

**Right (fix, verified):**
```go
err := fmt.Errorf("pull failed: repository %s not found", sanitize(name))
```
where `sanitize` walks runes and replaces C0/C1 controls and the bidi override/isolate blocks (U+202A-U+202E, U+2066-U+2069) with a visible `\xNN`/`\uNNNN` escape. Zero raw control or bidi bytes reach the output.

**Also acceptable, narrower:** using `%q` specifically for the untrusted segment is a real, if incidental, mitigation for *this* category of attack (control chars, bidi overrides) — but it changes the string's visible quoting and escaping wholesale, which is a much bigger surface change than intended and does not generalize to a value interpolated with `%s` elsewhere in the same message. A named sanitizer function is the reviewable, reusable answer; relying on an incidental side effect of `%q` is not.

### 4. Colour: per-stream, NO_COLOR-correct

[no-color.org](https://no-color.org/): *"Command-line software which adds ANSI color to its output by default should check for a `NO_COLOR` environment variable that, when **present and not an empty string** (regardless of its value), prevents the addition of ANSI color."* This is a precise, two-part test — presence is not enough. [clig.dev](https://clig.dev/) adds `TERM=dumb` and "not an interactive terminal" as two more independent reasons to disable colour, and treats each stream (stdout, stderr) as its own decision.

`github.com/fatih/color` v1.19.0 (used by `aquasecurity/trivy@ae561f8cca36`, `go.mod:45`) gets the non-emptiness check right — `noColorIsSet() bool { return os.Getenv("NO_COLOR") != "" }` (module cache: `fatih/color@v1.19.0/color.go:39-40`) — and also checks `TERM == "dumb"` and TTY via `go-isatty`. But its exported `NoColor` variable is a **single package-level bool**, computed once against `os.Stdout` only (`color.go:22,49`): `NoColor = noColorIsSet() || os.Getenv("TERM") == "dumb" || !stdoutIsTerminal()`. A CLI that colours both stdout and stderr through this one variable gets the wrong answer for whichever stream is redirected when the other is not.

**Wrong (violation, verified):**
```go
func colorDecision() bool {
    if _, ok := os.LookupEnv("NO_COLOR"); ok { return false } // BUG: true even for NO_COLOR=""
    if os.Getenv("TERM") == "dumb" { return false }
    return term.IsTerminal(int(os.Stdout.Fd())) // BUG: decided once, reused for stderr
}
```
Under a real pty with `NO_COLOR=""` (present, empty): both streams report `color=false` — wrong; the spec requires colour to stay **on**. See [Verification runs §4](#4-colour).

**Right (fix, verified):**
```go
func noColorRequested() bool { return os.Getenv("NO_COLOR") != "" } // present AND non-empty
func colorFor(fd uintptr) bool {
    if noColorRequested() { return false }
    if os.Getenv("TERM") == "dumb" { return false }
    return term.IsTerminal(int(fd))
}
```
Decided independently per stream via `golang.org/x/term.IsTerminal(int(fd))` ([pkg.go.dev/golang.org/x/term](https://pkg.go.dev/golang.org/x/term): *"IsTerminal returns whether the given file descriptor is a terminal"*, v0.46.0). Under `NO_COLOR=""` both streams correctly report `color=true`; under a pipe on one stream and a pty on the other, each stream gets its own correct answer.

**Windows note:** `x/term.IsTerminal` does not detect Cygwin/MSYS2 pseudo-terminals, which present as pipes to the Win32 console APIs `x/term` uses. `github.com/mattn/go-isatty`'s `IsCygwinTerminal(fd)` is the dedicated check for exactly that case; `cli/cli` combines both (`iostreams.go:608,612`: `ghTerm.IsTerminal(f) || isCygwinTerminal(f.Fd())`), and `junegunn/fzf@b1be3a8be1b8:src/util/util.go:79` does the same: `isatty.IsTerminal(fd) || isatty.IsCygwinTerminal(fd)`.

### 5. Prompts, secrets, non-interactive bypass

[clig.dev](https://clig.dev/): *"Only use prompts or interactive elements if `stdin` is an interactive terminal (a TTY)... Never require a prompt. Always provide a way of passing input with flags or arguments. If `stdin` is not an interactive terminal, skip prompting and just require those flags/args."* and *"If you're prompting for a password, don't print it as the user types."*

The failure mode is not cosmetic — it is a hang. Verified: a program that unconditionally does `bufio.NewReader(os.Stdin).ReadString('\n')` with stdin an *open* pipe that is never written to (the shape of inherited-but-unclosed stdin — a common CI/subprocess situation, distinct from a *closed* stdin which would return EOF immediately) blocks until killed. `timeout 2 ...` returns exit 124 (timed out); the same invocation against a TTY-gated version returns immediately with **exit 64** (the fleet's usage-error code) when no `--yes` is given, or proceeds when `--yes` is passed. See [Verification runs §5](#5-prompt).

**Wrong (violation, verified):**
```go
fmt.Fprint(os.Stderr, "Delete all tags? [y/N] ")
answer, _ := bufio.NewReader(os.Stdin).ReadString('\n') // blocks forever on an open, silent pipe
```

**Right (fix, verified):**
```go
if yes { /* proceed */ ; return }
if !term.IsTerminal(int(os.Stdin.Fd())) {
    fmt.Fprintln(os.Stderr, "error: refusing to prompt: stdin is not a terminal; pass --yes")
    os.Exit(64)
}
// only now read the prompt
```

Secrets: `golang.org/x/term.ReadPassword(fd int) ([]byte, error)` — *"reads a line of input from a terminal without local echo... commonly used for inputting passwords"* ([pkg.go.dev/golang.org/x/term](https://pkg.go.dev/golang.org/x/term)) — is the Go analogue of the fleet's `CLI-11` ("never accept a secret through a flag value or a plain env var"). A secret must never be a plain flag value (`ps`/shell-history exposure) or a plain env var (`/proc`/CI-log exposure); the accepted shapes are `--password-file`, an interactive `ReadPassword` prompt gated by the same TTY check as any other prompt, or a credential store.

### 6. Config/cache paths and precedence

[pkg.go.dev/os#UserConfigDir](https://pkg.go.dev/os#UserConfigDir) / `#UserCacheDir` (stdlib since Go 1.13): Unix returns `$XDG_CONFIG_HOME`/`$XDG_CACHE_HOME` "if set and non-empty," else `$HOME/.config`/`$HOME/.cache`; Darwin returns `$HOME/Library/Application Support`/`$HOME/Library/Caches`; Windows returns `%AppData%`/`%LocalAppData%`; Plan 9 returns `$home/lib`/`$home/lib/cache`. Both return an error if the location cannot be determined (e.g. `$HOME` unset) or if the XDG variable holds a relative path. `config-inventory.md §4` calls this "a stronger position than Rust's third-party-crate dependency [`directories::ProjectDirs`]" — the stdlib alone covers what Rust needs a crate for.

**Wrong (violation, verified):**
```go
dir := filepath.Join(os.Getenv("HOME"), ".config", "fw") // ignores XDG_CONFIG_HOME
```
With `HOME=/home/testuser` and `XDG_CONFIG_HOME=/home/testuser/.xdgconfig`, this prints `/home/testuser/.config/fw` — wrong.

**Right (fix, verified):**
```go
base, err := os.UserConfigDir()
dir := filepath.Join(base, "fw")
```
Same environment prints `/home/testuser/.xdgconfig/fw` — correct; with `XDG_CONFIG_HOME` unset both versions agree, which is exactly why the bug is easy to miss in a developer's own shell (most developers do not set `XDG_CONFIG_HOME`). See [Verification runs §6](#6-configpaths).

Precedence: [clig.dev](https://clig.dev/) — *"Apply configuration parameters in order of precedence: Flags, The running shell's environment variables, Project-level configuration..., User-level configuration, System wide configuration."* This is the same order as the fleet's `CLI-15`. Verified over a synthetic 5-layer stack (flag/env/project/user/system) that a highest-first walk which skips empty layers reproduces the order correctly, including the case where the top two layers are unset and the third wins. See [Verification runs §6](#6-configpaths).

**Is `viper` proportionate?** Measured, same toolchain, `-trimpath -ldflags="-s -w"`:

| Library | Trivial-usage binary | `go.sum` entries |
|---|---|---|
| `spf13/viper` v1.21.0 (one `SetDefault`+`GetInt`) | 5.19 MB | 47 |
| `knadh/koanf` v2.3.0 + `confmap` provider (equivalent) | 2.07 MB | 12 |
| hand-rolled precedence merge (no deps) | 0 (part of the binary you already build) | 0 |

`knadh/koanf`'s own README names the specific complaints: viper "forcibly lowercases keys, breaking language specs," has "large build size bloat," "tightly couples parsing with file extensions," and "hardcoded config sources in core." `spf13/viper`'s own README concedes *"Viper does not deep merge configuration values. Complex values that are overridden will be entirely replaced"* and that concurrent read/write needs external synchronization. **Resolved for the fleet:** viper is disproportionate for a CLI that needs flags+env+one config file merged by simple precedence — that is a ~30-line function, verified above, with zero dependencies. `koanf` is the fallback if a real multi-format/multi-provider config layer is later needed (S3, Vault, Consul providers) without viper's weight; it is not needed today.

### 7. Framework: cobra vs urfave/cli v3 vs stdlib flag

Owner question 3 defaults to cobra + pflag ([go-frame.md §Orchestrator decisions Q3](../go-frame.md)); this dive is the measurement behind that default, not a re-litigation. `config-inventory.md §4` (CLI-10, CLI-14) already found cobra's `PersistentFlags()` and native `Gen*Completion` a direct, stronger-than-Rust match for the fleet's needs. Corpus counts from the map: cobra imported directly in 14/35 exemplars, pflag in 9/35; urfave "v3.13.0 current and context-first" ([shift.md §16](../go-topic-map/shifts.md)).

**Measured** — a five-subcommand fixture (`status`, `list`, `get`, `set`, `version`, global `--color`/`--quiet` flags), Go 1.27.1, `go build -trimpath -ldflags="-s -w"`:

| Framework | Version | Binary size | Startup (avg, `version` subcmd) | Native completions | Exit-64 wiring |
|---|---|---|---|---|---|
| `spf13/cobra` + `spf13/pflag` | v1.10.1 / v1.0.9 | 2,552,071 B (2.43 MiB) | ~1.4 ms | Yes — `GenBashCompletion` et al., same `*cobra.Command` tree | One `if err := root.Execute(); err != nil { os.Exit(64) }`; `SilenceUsage`/`SilenceErrors` needed to avoid cobra's own stderr banner and default `os.Exit(1)` |
| `urfave/cli/v3` | v3.13.0 | 3,727,520 B (3.55 MiB) | ~1.2 ms | Yes — `completion.go`/`fish.go`, gated by `EnableShellCompletion` | Must check `errors.As`-style for `cli.ExitCoder` on the returned error; **the library's own "unknown command" path hardcodes exit 3** (`Exit(errMsg, 3)` in `help.go`), which silently wins over a caller's own 64 unless `CommandNotFound` is set |
| stdlib `flag` | go1.27.1 | 1,593,504 B (1.52 MiB) | ~1.0 ms | None — no generator exists | Fully manual: `flag.ContinueOnError` + explicit `os.Exit(64)` on every parse-error and dispatch-miss path |

Startup differences are within measurement noise (all sub-1.5ms for a no-op subcommand) and are not a deciding factor at this scale. Binary size is a real, reproducible difference, and it runs **counter to a "lightweight third-party framework" assumption**: urfave/cli v3 is the largest of the three, not the smallest, because it links its own help/suggestion/markdown-and-man-page/shell-completion machinery even when unused, matching `config-inventory.md`'s note that urfave "has a stronger native answer" for docs/completions — that strength has a size cost.

The disqualifying finding for urfave/cli v3 as the fleet default is exit-code control, not size: its help-fallback path (`help.go:319-322`) returns `Exit(errMsg, 3)` for any unrecognized command, and this is an `ExitCoder`-wrapped error indistinguishable from an application's own `cli.Exit(msg, code)` calls — a caller that checks for `ExitCoder` (the library's own documented pattern) gets **3**, not the caller's chosen usage-error code, unless it sets `Command.CommandNotFound` to intercept that path itself. cobra's unknown-command path is a plain `error` the caller's own `if err != nil { os.Exit(64) }` already controls with no extra hook. Verified in [Verification runs §7](#7-frameworks).

**Also verified, not merely read:** urfave/cli v3's own official docs example for exit codes (`docs/v3/examples/exit-codes.md`) ends with `if err := cmd.Run(...); err != nil { log.Fatal(err) }` — `log.Fatal` always calls `os.Exit(1)`, discarding whatever code the preceding `cli.Exit("...", 86)` set. An agent copying that example verbatim ships a CLI whose custom exit codes never reach the shell.

**cobra's own scaffold (`cobra-cli init`) defaults to viper.** The [user guide](https://raw.githubusercontent.com/spf13/cobra/main/site/content/user_guide.md) example wires `viper.BindPFlag("author", rootCmd.PersistentFlags().Lookup("author"))` directly into the generated root command. Adopting cobra does not obligate adopting viper — see [§6](#6-configcache-paths-and-precedence) — but the framework's own template nudges toward the disproportionate pairing; a fleet template should override the scaffold rather than accept it.

## Normative guidance candidates

1. **stdout carries only the machine-consumable result; every other line goes to stderr, and a JSON/machine-output mode enforces this with a test, not a convention.**
   Rationale: any progress, log, or banner line on stdout breaks every downstream parser, including the CLI's own future `--format json` consumer.
   Verify: per JSON subcommand, an integration test that runs the command with a redirected stdout and passes the whole captured buffer through `encoding/json.Unmarshal` (or, for a human check, `<binary> ... | jq .` exits 0). Reading heuristic: `grep -rn -e 'fmt.Print(' -e 'fmt.Println(' -e 'os.Stdout' . --include='*.go'` outside the one output-formatting layer.
   RUN: **yes** — [fixtures/streams-and-terminal/jsonmode/](../../../../.cache/research-lang/go-tools/fixtures/streams-and-terminal/jsonmode/); violation → `jq` exit 5, fix → `jq` exit 0.

2. **Any command that can emit more than a handful of lines writes through a `bufio.Writer` and flushes explicitly on every exit path — never rely on `defer` where an `os.Exit` call sits on the same path.**
   Rationale: `os.Stdout` is unbuffered in Go; `defer`red flushes never run on `os.Exit`, so this is a data-loss bug, not just a performance one.
   Verify: reading heuristic — grep for `os.Exit(` in the same function or call chain as a `bufio.Writer`/`bufio.NewWriter` whose only `Flush` call is `defer`red; a hit is a finding. No existing lint covers this (confirmed: `deadcode`/`staticcheck`/`golangci-lint` v2.14.0 default set has no analyzer for "defer skipped by os.Exit").
   RUN: **yes** — [fixtures/streams-and-terminal/buffering/](../../../../.cache/research-lang/go-tools/fixtures/streams-and-terminal/buffering/); violation loses all 5 buffered lines (0 bytes captured) on the `os.Exit(2)` path, fix preserves all 5 (35 bytes). Speed: unbuffered 100k lines ~29ms (file) / ~44ms (pipe) vs buffered ~5.3ms / ~8ms — 5.5x.

3. **Every write of data the program did not author — a registry name, a Git commit subject, an HTTP response body, any wire-supplied string — is sanitized of C0/C1 control characters and Unicode bidi-override/isolate runes (U+202A-U+202E, U+2066-U+2069) before it reaches a stream connected to a terminal.**
   Rationale: CWE-150; a real, patched Go CLI vulnerability (GHSA-fwjx-9p69-h25h / CVE-2026-73506) is exactly this gap, exploited via directory names and Git metadata with no restriction on their byte content.
   Verify: a named `sanitize`/`sanitizeContent`-style function exists and every error-boundary write (or, in a CLI like `cli/cli`, every `ContentOut` write) routes through it — reading heuristic: `grep -rn -e 'fmt.Errorf(' -e 'fmt.Fprintln(os.Stderr' . --include='*.go'` sites that interpolate a value sourced from network/registry input, cross-checked against whether that value passed through the sanitizer first. `%q` is not a substitute: it happens to catch this category via `unicode.IsPrint`, but does not generalize to `%s`/`%v` call sites in the same codebase.
   RUN: **yes** — [fixtures/streams-and-terminal/sanitize/](../../../../.cache/research-lang/go-tools/fixtures/streams-and-terminal/sanitize/); violation (`%s`) leaks 1 raw ESC byte and 1 raw U+202E sequence; fix (explicit sanitizer) leaks zero of either.

4. **`NO_COLOR` disables colour only when it is present AND non-empty (`os.Getenv("NO_COLOR") != ""`), never on mere presence (`os.LookupEnv`).**
   Rationale: [no-color.org](https://no-color.org/)'s definition is exactly this two-part test; `os.LookupEnv` alone is the single most common way to get it backwards.
   Verify: `grep -rn -e 'LookupEnv("NO_COLOR"' . --include='*.go'` — any hit outside a comment/test is a finding (the correct spelling is `os.Getenv("NO_COLOR") != ""`, which this pattern cannot match). Directory operand `.` at minimum; empty output = pass.
   RUN: **yes** — [fixtures/streams-and-terminal/colour/](../../../../.cache/research-lang/go-tools/fixtures/streams-and-terminal/colour/); under `NO_COLOR=""` the violation reports colour off (wrong), the fix reports colour on (correct), verified under a real pty via `python3 pty.openpty`.

5. **The colour/TTY decision is taken independently per output stream (stdout, stderr), never computed once and reused.**
   Rationale: even `fatih/color` v1.19.0, the most common Go colour library, decides its package-level `NoColor` against `os.Stdout` only — the moment one stream is redirected and the other is not, a shared decision is wrong for one of them.
   Verify: reading heuristic — a single package-level colour-enabled bool/variable computed once (not a function taking an `fd`/stream parameter) is a finding whenever the CLI writes coloured output to both stdout and stderr.
   RUN: **yes** — same fixture as #4; a pty-vs-pipe comparison on the fix binary shows stdout/stderr independently correct (`true`/`true` under pty, `false`/`false` under a pipe on stdout with stderr also piped through `cat`), while the violation's shared decision cannot express "coloured on one stream, not the other" at all by construction.

6. **Never prompt unless `golang.org/x/term.IsTerminal(int(os.Stdin.Fd()))` is true, and always ship a non-interactive bypass flag (`--yes`/`-y`) that a script can pass instead.**
   Rationale: an ungated prompt against a pipe that never writes is an indefinite hang in CI, not a graceful failure — this is a production incident class, not a UX nit.
   Verify: reading heuristic — every `bufio.Reader.ReadString`/`fmt.Scanln`/`term.ReadPassword` call site has a preceding `term.IsTerminal` check or an explicit `--yes`-style short-circuit before it. `grep -rn -e 'ReadString(' -e 'Scanln(' . --include='*.go'` and manually confirm a guard precedes each hit.
   RUN: **yes** — [fixtures/streams-and-terminal/prompt/](../../../../.cache/research-lang/go-tools/fixtures/streams-and-terminal/prompt/); violation against an open-forever pipe times out (`timeout 2` → exit 124); fix exits 64 immediately without `--yes`, exits 0 with it.

7. **Secrets are never accepted via a flag value or a plain environment variable; read them with `golang.org/x/term.ReadPassword` (TTY-gated, same as rule 6) or `--password-file`.**
   Rationale: flag values are visible in `ps` and shell history; env vars leak via `/proc` and CI log dumps — identical reasoning to the fleet's `CLI-11`, mechanism is Go-native (`x/term.ReadPassword` vs Rust's own tooling).
   Verify: `grep -rn -e '"password"' -e '"token"' -e '"secret"' . --include='*.go'` then manually discard hits inside a clap/cobra-equivalent flag *definition* that is itself a `--*-file` or documented standard var; a hit that is a plain `StringVar`/`StringP` flag or an `os.Getenv` read for a bare secret name is a finding.
   RUN: no — reading heuristic only; not re-verified with a fresh fixture in this dive (the fleet's Rust `CLI-11` mechanism already covers the rule; the Go-specific piece is only which stdlib/x call replaces `--password-file`'s reading, and that call (`x/term.ReadPassword`) is independently confirmed via its documented signature and the rule-6 TTY-gate fixture it shares).

8. **Config, cache and data-directory paths come from `os.UserConfigDir()`/`os.UserCacheDir()`, never a hand-rolled `$HOME`-join.**
   Rationale: the hand-rolled version silently ignores `XDG_CONFIG_HOME`/`XDG_CACHE_HOME` on Linux and gives the wrong directory on Darwin and Windows; the stdlib function is correct on all three and requires no dependency.
   Verify: `grep -rn -e 'os.Getenv("HOME")' -e 'os.Getenv("USERPROFILE")' -e 'filepath.Join(os.Getenv("HOME")' . --include='*.go'` — any hit building a config/cache path (as opposed to a genuinely HOME-relative concept like an SSH key default) is a finding; discard hits inside the platform-conventions module if one exists.
   RUN: **yes** — [fixtures/streams-and-terminal/configpaths/](../../../../.cache/research-lang/go-tools/fixtures/streams-and-terminal/configpaths/); with `XDG_CONFIG_HOME` set, violation and fix diverge (`~/.config/fw` vs the XDG path); with it unset they agree — exactly the trap that makes this bug easy to miss on a developer's own machine.

9. **Config precedence is flags > env > project config > user config > system config, implemented as an explicit highest-first walk over named layers that skips empty ones — not whatever order a config library's default loading happens to apply.**
   Rationale: matches [clig.dev](https://clig.dev/) and the fleet's `CLI-15`; a config library's own merge order is not guaranteed to match this without explicit configuration (viper's own README admits it does not deep-merge, only replaces).
   Verify: an integration test setting a value at two layers and asserting the higher-precedence one wins; a second test that removes the top layer and asserts the next one wins.
   RUN: **yes** — [fixtures/streams-and-terminal/configpaths/precedence/](../../../../.cache/research-lang/go-tools/fixtures/streams-and-terminal/configpaths/precedence/); flag wins when set, project-config wins once flag and env are both unset.

10. **`viper` is not the default config layer; a hand-rolled precedence merge (or `koanf` if genuinely multiple formats/providers are needed) is.**
    Rationale: measured — a trivial viper usage links 5.19 MB / 47 `go.sum` entries versus koanf's 2.07 MB / 12 for the equivalent, and viper's own README and koanf's README both document real limitations (no deep merge, forced key lowercasing, large dependency surface) beyond raw size.
    Verify: `grep -rn 'spf13/viper' . --include=go.mod` — a hit is a finding unless the CLI's documented requirements include remote providers (Consul/etcd/Vault) or hot-reload (`WatchConfig`), which are viper's actual differentiators.
    RUN: **yes**, as a measurement — binary-size/dependency-count comparison in [Verification runs §6](#6-configpaths); not a red/green fixture (there is no "violation" shape here, only a proportionality judgment), so this candidate is a SHOULD, not a MUST.

11. **The default CLI framework is `cobra` + `pflag`; `urfave/cli/v3` is not adopted, primarily because its help-fallback path hardcodes exit code 3 for an unrecognized command, which fights a fleet-wide exit-64 usage-error convention unless every command tree overrides `CommandNotFound`.**
    Rationale: measured — this is not a style preference; it is a concrete exit-code collision confirmed against v3.13.0 (current as of 2026-09-24), and it is the only one of the three frameworks whose *own library code* calls the exit-code machinery on a path the caller does not fully control.
    Verify: `<binary> <nonexistent-subcommand>; echo $?` — cobra and stdlib `flag` both give the CLI's own configured usage-error code (64, if wired per rule 12 below); urfave/cli v3 gives 3 unless `CommandNotFound` is set. Binary-size measurement (cobra 2.43 MiB vs urfave 3.55 MiB vs stdlib 1.52 MiB, all `-trimpath -ldflags="-s -w"`, Go 1.27.1) is corroborating, not decisive on its own.
    RUN: **yes** — [fixtures/streams-and-terminal/frameworks/](../../../../.cache/research-lang/go-tools/fixtures/streams-and-terminal/frameworks/); `fw_urfave unknownsubcmd` → exit 3; `fw_cobra unknownsubcmd` → exit 64; `fw_stdlib unknownsubcmd` → exit 64.

12. **A cobra-based CLI sets `SilenceUsage: true` and `SilenceErrors: true` on the root command and maps every `RunE` error to the fleet's exit table in one place in `main`, rather than letting cobra's own default error-printing and `os.Exit(1)` fire.**
    Rationale: cobra's own default on a parse or `RunE` error is to print the error plus a usage banner to stderr and call `os.Exit(1)` — a fixed, non-configurable code that fights the fleet's exit-64-for-usage-errors convention just as much as urfave's hardcoded 3 does, unless silenced and re-wired.
    Verify: `<binary> --bogus-flag; echo $?` on a `SilenceUsage`/`SilenceErrors`-configured root gives the CLI's chosen code; the same check on a cobra root missing those two fields gives cobra's default `os.Exit(1)` and a usage banner the CLI did not ask to print — a finding is either field being `false`/unset on the root command definition. `grep -rn -e 'SilenceUsage' -e 'SilenceErrors' . --include='*.go'` on the root `&cobra.Command{...}` literal; absence of both is the finding.
    RUN: **yes** — [fixtures/streams-and-terminal/frameworks/cobra/](../../../../.cache/research-lang/go-tools/fixtures/streams-and-terminal/frameworks/cobra/main.go); with both fields set, `--bogus-flag` gives exit 64 as wired in `main`, not cobra's default 1.

## Verification runs

All commands run via `/home/mherwig/.cache/research-lang/go-tools/run.sh` (Go 1.27.1, `GOTOOLCHAIN=local`) for builds, and directly for the built binaries. Fixture root: `/home/mherwig/.cache/research-lang/go-tools/fixtures/streams-and-terminal/`.

#### 1. buffering (speed)

```
go build -trimpath -o /tmp/println_100k ./buffering/violation_println
go build -trimpath -o /tmp/bufio_100k   ./buffering/fix_bufio
time (/tmp/println_100k > /tmp/out.txt)      # → ~0.028-0.031s, 3 runs, redirected to a regular file
time (/tmp/bufio_100k   > /tmp/out.txt)      # → ~0.005-0.006s, 3 runs
time (/tmp/println_100k | cat > /dev/null)   # → ~0.042-0.044s, 3 runs, through a pipe
time (/tmp/bufio_100k   | cat > /dev/null)   # → ~0.008s, 3 runs
```
Both write 100,000 identical lines (`wc -l` confirms 100000 for both). Ratio ~5.5x in both destinations. Exit code: 0 for both (not a red/green check — a speed measurement).

#### 2. early-exit flush loss

```
go build -trimpath -o /tmp/early_exit_violation ./buffering/violation_early_exit
go build -trimpath -o /tmp/early_exit_fix       ./buffering/fix_early_exit
/tmp/early_exit_violation fail > /tmp/out_v.txt; echo $?   # → 2; wc -c /tmp/out_v.txt → 0
/tmp/early_exit_fix       fail > /tmp/out_f.txt; echo $?   # → 2; wc -c /tmp/out_f.txt → 35 (5 lines)
```
Violation: exit 2, **0 bytes captured** (all 5 buffered lines lost). Fix: exit 2, **35 bytes captured**, all 5 lines present. Empty output on the violation run is the finding itself — the bug is exactly "no output where output was written."

#### 3. sanitize

```
go build -trimpath -o /tmp/sanitize_violation ./sanitize/violation
go build -trimpath -o /tmp/sanitize_fix       ./sanitize/fix
/tmp/sanitize_violation 2>/tmp/out_v.txt
LC_ALL=C grep -c $'\x1b' /tmp/out_v.txt          # → 1  (ESC present — violation confirmed)
grep -c $'\xe2\x80\xae' /tmp/out_v.txt           # → 1  (U+202E present — violation confirmed)
/tmp/sanitize_fix 2>/tmp/out_f.txt
LC_ALL=C grep -c $'\x1b' /tmp/out_f.txt          # → 0  (pass)
grep -c $'\xe2\x80\xae' /tmp/out_f.txt           # → 0  (pass)
```
Empty/zero grep count on the fix run means no raw control or bidi-override byte reached the captured stream — that is what "pass" means here. (Note: an earlier draft of this fixture used `%q` for the violation; `%q`'s own escaping neutralized the payload, so it was not a violation — see Findings §3. The final violation uses `%s`.)

#### 4. colour

```
go build -trimpath -o /tmp/colour_violation ./colour/violation
go build -trimpath -o /tmp/colour_fix       ./colour/fix
env NO_COLOR= TERM=xterm python3 /tmp/run_pty.py /tmp/colour_violation
  # → stdout-color=false / stderr-color=false   (WRONG: NO_COLOR="" must leave colour ON)
env NO_COLOR= TERM=xterm python3 /tmp/run_pty.py /tmp/colour_fix
  # → stdout-color=true / stderr-color=true     (correct)
env -u NO_COLOR TERM=xterm python3 /tmp/run_pty.py /tmp/colour_fix
  # → stdout-color=true / stderr-color=true     (pty, no NO_COLOR: correct baseline)
env -u NO_COLOR TERM=xterm /tmp/colour_fix | cat
  # → stdout-color=false / stderr-color=false   (pipe: correctly off on both, since both piped here)
```
`run_pty.py` is a ~25-line stdlib-`pty` helper (`os.fork` + `pty.openpty` + `dup2`) written for this dive; not a project dependency. `script` is not installed in this environment, hence the substitution — the mechanism tested (a real pty vs a pipe) is the same one `script -qc` would exercise.

#### 5. prompt

```
go build -trimpath -o /tmp/prompt_violation ./prompt/violation
go build -trimpath -o /tmp/prompt_fix       ./prompt/fix
timeout 2 bash -c 'exec /tmp/prompt_violation < <(sleep 100)'; echo $?   # → 124 (killed: hung)
timeout 2 bash -c 'exec /tmp/prompt_fix       < <(sleep 100)'; echo $?   # → 64  (immediate, no --yes)
timeout 2 bash -c 'exec /tmp/prompt_fix --yes < <(sleep 100)'; echo $?  # → 0   (immediate, --yes)
```
`< <(sleep 100)` gives the process an **open**, never-written-to pipe as stdin — distinct from a *closed* stdin (`< /dev/null`), which would return EOF immediately and mask this bug. The open-pipe shape is what a subprocess inherits from a parent that has not closed its own stdin, the real-world trigger.

#### 6. configpaths

```
go build -trimpath -o /tmp/cfg_violation ./configpaths/violation
go build -trimpath -o /tmp/cfg_fix       ./configpaths/fix
env HOME=/home/testuser XDG_CONFIG_HOME=/home/testuser/.xdgconfig /tmp/cfg_violation
  # → /home/testuser/.config/fw        (wrong: ignores XDG_CONFIG_HOME)
env HOME=/home/testuser XDG_CONFIG_HOME=/home/testuser/.xdgconfig /tmp/cfg_fix
  # → /home/testuser/.xdgconfig/fw     (correct)
env -u XDG_CONFIG_HOME HOME=/home/testuser /tmp/cfg_violation   # → /home/testuser/.config/fw
env -u XDG_CONFIG_HOME HOME=/home/testuser /tmp/cfg_fix         # → /home/testuser/.config/fw  (agree — the trap)

go build -trimpath -o /tmp/cfg_prec ./configpaths/precedence
/tmp/cfg_prec
  # → resolved=flag-value from=flag
  # → resolved=project-value from=project-config   (after flag+env cleared)

# viper vs koanf footprint (trivial usage, same flags):
go build -trimpath -ldflags="-s -w" -o /tmp/viper_probe ./configpaths/viperprobe   # 5,185,799 B; go.sum: 47 entries
go build -trimpath -ldflags="-s -w" -o /tmp/koanf_probe ./configpaths/koanfprobe   # 2,072,839 B; go.sum: 12 entries
```

#### 7. frameworks

```
go build -trimpath -ldflags="-s -w" -o /tmp/fw_cobra  ./frameworks/cobra    # cobra v1.10.1 / pflag v1.0.9 — 2,552,071 B
go build -trimpath -ldflags="-s -w" -o /tmp/fw_urfave ./frameworks/urfave  # urfave/cli v3.13.0            — 3,727,520 B
go build -trimpath -ldflags="-s -w" -o /tmp/fw_stdlib ./frameworks/stdlib # stdlib flag                    — 1,593,504 B

for b in fw_cobra fw_urfave fw_stdlib; do time (for i in $(seq 50); do /tmp/$b version >/dev/null 2>&1; done); done
  # cobra:  0.069s/50 ≈ 1.4ms   urfave: 0.058s/50 ≈ 1.2ms   stdlib: 0.052s/50 ≈ 1.0ms

/tmp/fw_cobra  --bogus-flag; echo $?   # → 64
/tmp/fw_urfave --bogus-flag; echo $?   # → 64
/tmp/fw_stdlib --bogus-flag; echo $?   # → 64

/tmp/fw_cobra  unknownsubcmd; echo $?   # → 64
/tmp/fw_urfave unknownsubcmd; echo $?   # → 3   ← library-hardcoded, not caller-chosen
/tmp/fw_stdlib unknownsubcmd; echo $?   # → 64

/tmp/fw_cobra completion 2>&1 | head -1   # → "# bash completion for fw ..." (native)
```
This is a measurement comparison, not a violation/fix pair — reported as such per the brief.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| #1 stdout-only result | `cli/cli@9b031151a825:pkg/iostreams/iostreams.go:52-99` — dedicated `IOStreams{In,Out,ErrOut,ContentOut}` struct, no bare `os.Stdout` outside its construction | — (no counter-example located in this dive's scope; the map's `gates`/`run` audits did not flag a stray-stdout-write incident) |
| #2 flush discipline | `oras-project/oras@a0cd4de5cfcd:cmd/oras/root/manifest/fetch_config.go` writes JSON/raw bytes directly via a single `content.FetchAll` + write, no intermediate buffered-writer flush hazard in this path | GO-IO's audits found no dedicated survey of `bufio.Writer`+`os.Exit` interaction; this dive's fixture is the first measurement of it in the program |
| #3 sanitize (CWE-150) | `cli/cli@9b031151a825:pkg/iostreams/iostreams.go:59-66,500-508` — `ContentOut` wraps `golang.org/x/text/transform.NewWriter(out, &asciisanitizer.Sanitizer{})`, defaulting `sanitizeContent: true` (`iostreams.go:544`); a dedicated CodeQL test exists at `.github/codeql/tests/unsanitized-response-to-terminal/` in the same repo | GHSA-fwjx-9p69-h25h (`jandedobbeleer/oh-my-posh`, not in this corpus but a real, patched Go CLI) is the negative exemplar |
| #4/#5 colour per stream | `junegunn/fzf@b1be3a8be1b8:src/util/util.go:79` — `isatty.IsTerminal(fd) \|\| isatty.IsCygwinTerminal(fd)`; `aquasecurity/trivy@ae561f8cca36:src/options.go:726` — `os.Getenv("NO_COLOR") != ""` (correct non-emptiness check) | `fatih/color@v1.19.0:color.go:22,49` (a dependency, not an exemplar repo, but load-bearing for trivy) computes `NoColor` once against `os.Stdout` only — the per-stream gap named in Findings §4 |
| #6 config paths | none of the five CLI-shaped exemplars checked in this dive (`cli/cli`, `fzf`, `oras`, `oras-go`, `trivy`) hand-roll a `$HOME`-join for config paths in the paths this dive read; no positive `os.UserConfigDir()` call site was found in the same set either — this row is genuinely uncovered in the exemplar corpus, matching the map's "uncovered" coverage tag for M-F-14 | — |
| #10 viper proportionality | `cli/cli@9b031151a825` uses neither viper nor koanf — its config lives in a bespoke `internal/config` package (out of this dive's scope to fully trace) | `spf13/cobra@adbc8813901b`'s own `site/content/user_guide.md` (fetched from `main`, not the pinned exemplar SHA — cobra's docs live outside the versioned module) scaffolds `viper.BindPFlag` by default |
| #11 framework exit codes | `spf13/cobra@adbc8813901b:command.go` (per `go-topic-map/domain.md §1`, already cited for M-F-03) shows cobra's default-exit-1-on-error behavior, consistent with rule 12's "must be silenced and rewired" | urfave/cli v3.13.0's `help.go:319-340` (dependency source, not an exemplar repo) is the source of the hardcoded exit 3 |

## AI-agent angle

1. **Copying `defer w.Flush()` from a tutorial without checking every path for `os.Exit`.** This compiles, looks idiomatic, and silently drops output exactly on the error path an agent is least likely to test manually. Smallest check: grep for `os.Exit(` reachable from a function that also declares `defer <writer>.Flush()`; any hit is a finding — no existing analyzer covers it (confirmed absent from golangci-lint v2.14.0's default and `standard` sets and from `go vet`'s analyzer list).
2. **Checking `NO_COLOR` with `os.LookupEnv` (presence) instead of `os.Getenv(...) != ""` (non-emptiness).** Both compile, both "work" in the overwhelmingly common case where a developer either sets `NO_COLOR=1` or doesn't set it at all — the bug only shows up for `NO_COLOR=""`, which is rare enough that an agent's own smoke test will not catch it. Smallest check: `grep -rn 'LookupEnv("NO_COLOR"' . --include='*.go'`.
3. **Treating `%q` as "the sanitized verb" and using it everywhere, or conversely assuming no `fmt` verb sanitizes anything.** Both are wrong in ways this dive's own first fixture draft fell into: `%q` incidentally strips exactly the CWE-150-relevant characters via `unicode.IsPrint`, but an agent relying on that fact without naming it is one `%s`/`Sprintf`/`Println` call site away from reintroducing the bug. Smallest check: a named `sanitize`-style function exists and is what error-boundary formatting actually calls — not "does `%q` appear somewhere."
4. **Assuming a third-party CLI framework's default error handling already gives the fleet's exit-64 convention.** cobra defaults to exit 1 with a printed usage banner; urfave/cli v3 hardcodes exit 3 for unknown commands and requires `log.Fatal`-avoidance to preserve custom `ExitCoder` codes (per its own official example, which gets this wrong). An agent that wires only the happy path (`RunE`/`Action` returning `nil`) and never runs `<binary> --bogus-flag; echo $?` never discovers either gap. Smallest check: exactly that one command, in an integration test, for every framework choice.
5. **Reaching for `spf13/viper` by pattern-matching "cobra CLI needs config" without checking what config the CLI actually needs.** viper is the most-searched, most-tutorial-featured Go config library and cobra's own scaffold wires it in by default; an agent optimizing for "looks like everyone else's cobra CLI" will add it even when the CLI needs nothing viper uniquely provides (remote providers, hot-reload). Smallest check: `grep -rn 'spf13/viper' . --include=go.mod`, then manually confirm the CLI's requirements actually include a viper-specific feature before accepting the hit as non-findings.
6. **Assuming `golang.org/x/term.IsTerminal` alone covers Windows.** It is a real stdlib-adjacent function with correct Unix/Windows console detection, but it does not detect Cygwin/MSYS2 pseudo-terminals — an agent targeting Windows without also importing `mattn/go-isatty`'s `IsCygwinTerminal` (or an equivalent) ships a CLI that mis-detects colour/TTY support inside Git Bash and similar environments. Smallest check: reading heuristic — a Windows-targeting CLI (has a `windows` build tag or CI leg) that imports `x/term` but not `go-isatty` (or an internal equivalent) is a finding worth a human look, not an automatic one — there is no analyzer for "detects the right subset of Windows terminals."

## Contested / evolving

- **Whether `%q`'s incidental sanitization is "good enough" for CWE-150 at error boundaries, or whether every boundary needs a named sanitizer regardless.** This dive found no normative Go source taking a position either way — `strconv.Quote`'s printability behavior is documented as a quoting feature, not a security control, and no style guide in the corpus's normative tier (`go.dev/wiki`, Google's Style Decisions) mentions it in a security context. Current lean, as of this dive (2026-09-26): a named sanitizer is the reviewable answer; relying on `%q` is an accident a future refactor to `%s` silently breaks.
- **Colour-library choice remains unsettled in the corpus.** `config-inventory.md §4` flagged this as an open research item in wave 1 ("no single canonical crate-equivalent yet identified"); this dive confirms `fatih/color` is the one actually used in the corpus (trivy) but finds it has the single-global, stdout-only decision gap in Findings §4/§5 — meaning even the incumbent needs a wrapper (per-stream `colorFor(fd)`, as verified) rather than direct adoption. No stronger alternative was surveyed in this dive's scope.
- **urfave/cli v3 is genuinely improving relative to v2** (context-first `Action(ctx, cmd)` signatures, generics-based flag types per `shift.md §16`) — the exit-3 hardcoding and the `log.Fatal`-breaks-`ExitCoder` doc bug are specific, fixable gaps in a still-actively-developed library (v3.13.0, 2026), not evidence the framework is abandoned or low-quality. A future v3.x could close either gap; this dive's exit-code finding is dated to v3.13.0 and should be re-checked on the next major or minor bump before being treated as permanent.
- **Whether a fleet Go CLI should adopt `koanf` at all, versus staying dependency-free with the hand-rolled precedence merge.** This dive's own resolution (#10) is provisional — no current fleet Go CLI exists to have hit this decision for real, and the measured proportionality argument (2.07 MB / 12 entries) is against viper specifically, not an affirmative case for koanf over zero dependencies. Revisit once a real multi-provider config need appears.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [clig.dev](https://clig.dev/) | Command Line Interface Guidelines (community-maintained) | fetched 2026-09-26 | Normative source for the stdout/stderr split, buffering-for-paging, colour, TTY-gated prompts, config precedence — the non-Rust-specific half of the fleet's `CLI-*` rules traces here |
| [no-color.org](https://no-color.org/) | The NO_COLOR convention's own spec site | fetched 2026-09-26 | The exact, load-bearing "present and non-empty" wording every colour-decision implementation must match |
| [pkg.go.dev/golang.org/x/term](https://pkg.go.dev/golang.org/x/term) | Official Go extended-stdlib package docs, v0.46.0 | fetched 2026-09-26 | `IsTerminal`, `ReadPassword`, `GetSize` signatures and doc comments — the primary per-fd TTY/secret-input API |
| [pkg.go.dev/os#UserConfigDir](https://pkg.go.dev/os#UserConfigDir) | Go stdlib `os` package reference | fetched 2026-09-26 (Go 1.27.1 era) | Per-OS `UserConfigDir`/`UserCacheDir` resolution rules, including the XDG environment-variable fallback and error conditions |
| [github.com/advisories/GHSA-fwjx-9p69-h25h](https://github.com/advisories/GHSA-fwjx-9p69-h25h) | GitHub Security Advisory, `jandedobbeleer/oh-my-posh` (CVE-2026-73506) | disclosed 2026, fetched 2026-09-26 | A real, patched Go CLI terminal-escape-injection vulnerability — the concrete instance behind CWE-150 for this rule family |
| [cwe.mitre.org/data/definitions/150.html](https://cwe.mitre.org/data/definitions/150.html) | CWE-150, MITRE | current | The general vulnerability class the sanitize rule closes; names the "assume all input is malicious" mitigation stance |
| [raw.githubusercontent.com/spf13/cobra/main/site/content/user_guide.md](https://raw.githubusercontent.com/spf13/cobra/main/site/content/user_guide.md) | cobra's own user guide, fetched from `main` | fetched 2026-09-26 | `PersistentFlags`, `RunE`, native completion generation, and the (contested) default `viper.BindPFlag` scaffold |
| [cli.urfave.org/v3/examples/exit-codes/](https://cli.urfave.org/v3/examples/exit-codes/) (raw: `docs/v3/examples/exit-codes.md`) | urfave/cli's own v3 docs | fetched 2026-09-26 (v3.13.0 era) | The official exit-code example — and the `log.Fatal`-discards-`ExitCoder` bug living inside it |
| [raw.githubusercontent.com/mattn/go-isatty/master/README.md](https://raw.githubusercontent.com/mattn/go-isatty/master/README.md) | go-isatty README | fetched 2026-09-26 | `IsTerminal`/`IsCygwinTerminal` signatures — the Windows Cygwin/MSYS2 gap `x/term` alone does not close |
| [raw.githubusercontent.com/spf13/viper/master/README.md](https://raw.githubusercontent.com/spf13/viper/master/README.md) | viper README | fetched 2026-09-26 | Precedence order as viper implements it, supported formats, and viper's own admitted limitations (no deep merge, thread-safety caveat) |
| [raw.githubusercontent.com/knadh/koanf/master/README.md](https://raw.githubusercontent.com/knadh/koanf/master/README.md) | koanf README | fetched 2026-09-26 | koanf's own comparison table against viper — key-casing, build-size, coupling, extensibility complaints |
| `cli/cli@9b031151a825:pkg/iostreams/iostreams.go` | `gh` CLI's own source, exemplar corpus | pinned SHA, cloned 2026-09-26 | The single best-shaped Go exemplar of a dedicated streams struct plus a sanitized fourth stream for untrusted content |
| `junegunn/fzf@b1be3a8be1b8:src/util/util.go` | `fzf`'s own source, exemplar corpus | pinned SHA | Correct `NO_COLOR` non-emptiness check plus the isatty+Cygwin combination pattern |
| `aquasecurity/trivy@ae561f8cca36:src/options.go`, `go.mod` | `trivy`'s own source, exemplar corpus | pinned SHA (fatih/color v1.19.0) | Correct `NO_COLOR` check in a real large CLI; the dependency it pulls in (`fatih/color`) is the source of the per-stream gap |
| `oras-project/oras@a0cd4de5cfcd:cmd/oras/root/manifest/fetch_config.go` | `oras`'s own source, exemplar corpus | pinned SHA | The `--output -`-for-stdout convention and a JSON/raw-bytes-to-stdout code path with no interleaved log lines |
| Go module source, `fatih/color@v1.19.0`, `urfave/cli/v3@v3.13.0` (module cache) | Third-party library source, fetched via `go get`/module proxy | resolved 2026-09-26 against `proxy.golang.org` | Ground truth for the `NoColor` global-and-stdout-only computation and the `help.go` hardcoded-exit-3 path — read directly, not from documentation |

`config-inventory.md §4`, `go-topic-map.md` (rows M-F-07..12, M-F-14, and Conflicts Resolved #16-17), and `go-frame.md`'s Orchestrator decisions (Q3) are program-internal artifacts, cited throughout but not counted toward the 12-source minimum above since they are this program's own prior output, not external primary sources.
