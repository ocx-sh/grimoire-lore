---
title: CLI UX and Output Streams
topic: Streams, output modes and CLI UX for Rust command-line tools
agent: rust-cli-contract-researcher
model: sonnet
date_researched: 2026-08
sources_count: 21
scope: >
  Covers stdout/stderr discipline, machine-readable output (JSON/JSONL), colour and TTY
  detection, progress/interactivity, clap 4 argument design, piping/buffering/SIGPIPE, and
  config/XDG precedence, all as applied to a Rust CLI distributed as a prebuilt binary
  (grim/ocx-style tools). Does not cover TUI frameworks (ratatui), GUI wrappers, or
  shell-completion authoring beyond clap's generator, and does not cover logging backends
  (tracing subscribers) beyond how verbosity flags map onto them.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [clig.dev — the baseline contract](#1-cligdev--the-baseline-contract)
   2. [GNU coding standards and POSIX utility syntax](#2-gnu-coding-standards-and-posix-utility-syntax)
   3. [stdout vs stderr discipline](#3-stdout-vs-stderr-discipline)
   4. [Machine-readable output: --json, JSON Lines, schema stability](#4-machine-readable-output---json-json-lines-schema-stability)
   5. [Verbosity, quiet, and exit-code-only modes](#5-verbosity-quiet-and-exit-code-only-modes)
   6. [Colour and TTY detection](#6-colour-and-tty-detection)
   7. [Progress bars and interactivity](#7-progress-bars-and-interactivity)
   8. [Argument design with clap 4](#8-argument-design-with-clap-4)
   9. [Piping, SIGPIPE, and buffering performance](#9-piping-sigpipe-and-buffering-performance)
   10. [Config precedence and XDG base directories](#10-config-precedence-and-xdg-base-directories)
   11. [Exit codes and `main()` signature](#11-exit-codes-and-main-signature)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Primary output goes to stdout; every diagnostic (logs, errors, progress, prompts) goes to stderr — stdout is for the next program in the pipe, stderr is for the human at the keyboard ([clig.dev](https://clig.dev/)).
- Return zero on success, non-zero on failure, and never call `std::process::exit` from deep in the call stack — return `ExitCode` from `main` so Rust runs destructors first ([std docs](https://doc.rust-lang.org/std/process/struct.ExitCode.html)).
- A machine-output flag (`--json`) must produce **only** JSON on stdout — no interleaved progress text, no trailing "done" line — because anything else breaks every consumer that pipes into `jq` ([clig.dev](https://clig.dev/)).
- Streaming/event-shaped output (search matches, install steps) should be JSON Lines (one JSON value per line, `\n`-terminated, UTF‑8, no BOM), which is what ripgrep's `--json` mode and the rust-cli book both model ([jsonlines.org](https://jsonlines.org/), [rust-cli book](https://rust-cli.github.io/book/in-depth/machine-communication.html)).
- Colour must be auto-detected from `is_terminal()` and disabled whenever `NO_COLOR` is set (any non-empty value), `CLICOLOR=0`, `TERM=dumb`, or output isn't a TTY, with `CLICOLOR_FORCE` (nonzero) overriding all of that, and NO_COLOR taking precedence over CLICOLOR_FORCE when both are set to conflicting effect ordering — implement this with `anstream`/`colorchoice`, don't hand-roll it ([no-color.org](https://no-color.org/), [gh manual](https://cli.github.com/manual/gh_help_environment)).
- `--color=auto|always|never` must exist as an explicit flag and win over every env var; clap's built-in `ColorChoice` enum already models this three-state choice ([clap docs](https://docs.rs/clap/latest/clap/enum.ColorChoice.html)).
- Progress bars/spinners must render only when stderr (not stdout) is a TTY; `indicatif::ProgressBar` auto-hides itself on a non-terminal, which is the correct default but the target stream still has to be checked explicitly for the "print progress to stdout" anti-pattern ([indicatif docs](https://docs.rs/indicatif/latest/indicatif/)).
- Never prompt unless stdin is a TTY; always provide a non-interactive escape hatch (`--yes`/`-y`, `--no-input`, or a `CI` env var check), because CI runners have no TTY and will hang forever on a blocking read ([clig.dev](https://clig.dev/)).
- clap 4's derive API (`#[derive(Parser)]`, `#[derive(Subcommand)]`, `#[command(flatten)]`) is the modern idiom; builder API is for cases needing runtime-computed arg sets — both are still current in the 4.x line as of 2026 ([clap derive docs](https://docs.rs/clap/latest/clap/_derive/index.html)).
- `#[arg(env = "...")]` gives CLI-flag-overrides-env-var-overrides-default precedence for free per-argument; layer this under a config file by reading the file first and letting clap's own defaults win last, matching the clig.dev precedence order (flags > env > project config > user config > system config) ([clig.dev](https://clig.dev/)).
- `std::io::Stdout` is unconditionally line-buffered even when piped to a file, which is a known, acknowledged Rust footgun (`FIXME` in libstd) — wrap it in an explicit `BufWriter`, lock it once with `.lock()`, and flush before the process exits for any command that emits more than a few lines ([rust-lang/rust#60673](https://github.com/rust-lang/rust/issues/60673)).
- Rust ignores SIGPIPE by default and converts EPIPE into an `ErrorKind::BrokenPipe` `Result`, so a naive `println!`-heavy CLI piped into `head` will panic instead of exiting quietly like a C tool would — handle `BrokenPipe` explicitly or wait for `-Zon-broken-pipe=kill` to stabilize ([unstable book](https://doc.rust-lang.org/nightly/unstable-book/compiler-flags/on-broken-pipe.html)).
- Config/cache/data paths must follow the XDG Base Directory spec on Linux and platform-native equivalents elsewhere (`~/Library/Application Support` on macOS, `%APPDATA%` on Windows); use the `directories` crate's `ProjectDirs` rather than hand-rolling path joins ([directories docs](https://docs.rs/directories/latest/directories/)).
- Man pages and shell completions should be generated from the same clap `Command` definition (`clap_mangen::Man`, `Command::generate` for completions) via a build script or `xtask`, never hand-maintained separately from the arg parser ([clap_mangen README](https://github.com/clap-rs/clap/blob/master/clap_mangen/README.md)).
- `-v`/`-vv`/`-vvv` verbosity and `-q` quiet are conventional, not bespoke; `clap-verbosity-flag` maps flag count directly onto `log`/`tracing` level filters and is the standard crate for this ([clap-verbosity-flag docs](https://docs.rs/clap-verbosity-flag/latest/clap_verbosity_flag/)).
- POSIX's utility syntax guidelines (short options are single alphanumeric chars behind one `-`, `--` ends option parsing, options precede operands) are what clap enforces by default — deviating from them (e.g. accepting `-` for stdin without an explicit spec) needs a deliberate design note ([POSIX](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html)).
- GNU standards require every program to support `--help` and `--version`, and clap generates both from `Command`/`Parser` metadata automatically — do not suppress them ([GNU standards](https://www.gnu.org/prep/standards/html_node/Command_002dLine-Interfaces.html)).
- Responsiveness beats raw speed: print *something* within 100ms even if it's just "Resolving…", and cargo/uv both model this by emitting an early status line before any network I/O completes ([clig.dev](https://clig.dev/)).
- A JSON output schema is a public API the moment one user scripts against it — version it (`"schemaVersion"` field or `--json` output wrapped in a versioned envelope) so a later CLI release can add fields without breaking parsers; this is the same discipline OCI manifests already impose on this project.

## Findings

### 1. clig.dev — the baseline contract

The Command Line Interface Guidelines (clig.dev, maintained by heroku/oclif and Basecamp/thoughtbot alumni) is the closest thing to a modern, checkable CLI spec. Key extracted rules, verbatim where quoted:

- **Output routing**: "Send output to `stdout`. The primary output for your command should go to `stdout`." / "Send messaging to `stderr`. Log messages, errors, and so on should all be sent to `stderr`." ([clig.dev](https://clig.dev/))
- **Exit codes**: "Return zero exit code on success, non-zero on failure."
- **Human first**: "Human-readable output is paramount. Humans come first, machines second." — implying the default (no flag) output is prose, and `--json`/`--plain` is opt-in, not the reverse.
- **JSON opt-in**: "Display output as formatted JSON if `--json` is passed."
- **Colour disabling conditions**: not a TTY, `NO_COLOR` set, `TERM=dumb`, or `--no-color` passed.
- **No animation off-TTY**: "If `stdout` is not an interactive terminal, don't display any animations."
- **State-change transparency**: "If you change state, tell the user."
- **Pager use**: use `less`-style paging only if stdin *or* stdout is a TTY, never in a pipe.
- **Error rewriting**: "Catch errors and rewrite them for humans," provide actionable next steps, and "put the most important information at the end of the output" (terminals scroll — the tail is what's visible).
- **Flag conventions**: standard long/short pairs — `-a/--all`, `-f/--force`, `-n/--dry-run`, `--no-input`, `-o/--output`, `-q/--quiet`, `-h/--help`, `--json`, `--version`.
- **Secrets**: "Do not read secrets directly from flags" (they show up in `ps`/shell history) — use `--password-file` or stdin instead. This applies directly to grim/ocx credential handling for registry auth.
- **Confirmation**: prompt `y/yes` interactively for dangerous ops, or require `-f`/`--force` non-interactively.
- **Escape hatch**: Ctrl-C must always work immediately; never block on network I/O in a way that swallows SIGINT.
- **Config precedence** (highest to lowest): flags → shell env vars → project-level config → user-level config → system-wide config.
- **Env var hygiene**: names must be uppercase letters/digits/underscore only, must not start with a digit, single-line values; secrets must not live in env vars because they leak via `/proc`, container `inspect`, and CI log dumps — this is directly relevant to ocx/grim registry token handling.
- **Responsiveness**: "Responsive is more important than fast. Print something to the user in <100ms."
- **Idempotence/recoverability**: a failed run should be resumable by re-running the same command line.

### 2. GNU coding standards and POSIX utility syntax

GNU's CLI chapter requires every program to support `--version` and `--help` as the two universal long options, recommends `getopt_long` (Rust equivalent: clap) for parsing, and states the principle that "any program offering verbosity control should use precisely `--verbose`" — i.e. long-option names are a shared vocabulary across tools, not per-tool bike-shedding ([GNU standards](https://www.gnu.org/prep/standards/html_node/Command_002dLine-Interfaces.html)). It also recommends output files be specified via `-o`/`--output` even where a bare positional filename is accepted for compatibility.

POSIX's Utility Syntax Guidelines (12 CLI, `Chapter 12`) are the formal grammar clap enforces by default:

- Guideline 3: each short option is a single alphanumeric char, preceded by one `-` (Guideline 4).
- Guideline 5: options without arguments can be grouped behind one `-` (`-xvf`), followed by at most one option that takes an argument.
- Guideline 9: all options precede operands.
- Guideline 10: the first bare `--` ends option parsing — everything after is a literal operand (critical for a wrapper CLI passing arguments through to a subprocess, e.g. `ocx run -- --flag-for-child`).
- Guideline 13: `-` as an operand means stdin/stdout for file-taking utilities.

([POSIX](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html))

clap's default parser (both derive and builder) implements these guidelines out of the box — grouped short flags, `--` as a terminator (`trailing_var_arg`/`allow_hyphen_values` when you need raw passthrough), and long options with `=` or space-separated values. Deviating (e.g. a non-standard grouping rule) should be treated as a deliberate, documented exception.

### 3. stdout vs stderr discipline

The rule "stdout is for the machine, stderr is for the human" is more precise stated as: **stdout carries the command's actual result** (the thing a pipe or `--json` consumer wants), and **stderr carries everything about how that result was produced** — logs, progress, warnings, prompts, and (non-`--json`) human narration. clig.dev's phrasing inverts the popular mnemonic slightly: it says human-readable output is paramount and *is* the primary stdout content in the default (non-JSON) mode; the "for the machine" framing kicks in specifically when `--json`/`--plain` is requested, at which point stdout must contain **only** that structured payload and nothing else (no banner, no "done!" line) so it's byte-for-byte parseable ([clig.dev](https://clig.dev/)).

Consequences for grim/ocx specifically:

- Registry pull/fetch progress, cache-hit/miss notices, and retry warnings belong on stderr unconditionally — they must not leak into `--json` output or into `ocx add pkg > lockfile-fragment.json` style redirection.
- Prompts (`Overwrite existing lockfile entry? [y/N]`) are written to stderr, read from stdin, and are skipped entirely when stdin isn't a TTY.
- A `--quiet` mode suppresses stderr narration but never stdout's primary payload.

### 4. Machine-readable output: --json, JSON Lines, schema stability

- **Batch JSON**: for a single command that returns one document (e.g. `ocx status --json`), emit one formatted JSON object/array on stdout, nothing else.
- **Streaming JSON**: for a command that emits a sequence of events (search matches, per-package install progress, log tailing), use JSON Lines — one complete, independently-parseable JSON value per line, `\n`-terminated (CRLF tolerated but not emitted), UTF‑8, no BOM, blank lines invalid ([jsonlines.org](https://jsonlines.org/)). This is exactly ripgrep's `--json` design and the pattern the *Command Line Applications in Rust* book documents: each JSON object carries a `type` field (`"begin"`, `"match"`, `"end"`) so a streaming consumer can dispatch on it without buffering the whole output ([rust-cli book](https://rust-cli.github.io/book/in-depth/machine-communication.html)).
- **Schema stability**: once any external tool parses `--json` output, that shape is a versioned public API. Two safe strategies: (a) additive-only evolution — never remove or retype a field, only add new optional ones; (b) an explicit `"schemaVersion"` (or `"apiVersion"`) field in the top-level JSON envelope that a consumer can gate on. For grim/ocx this matters because lockfile-adjacent JSON output will get piped into CI scripts.
- Correct vs incorrect:

```rust
// Correct: --json means stdout carries JSON and only JSON.
if cli.json {
    let payload = serde_json::json!({ "schemaVersion": 1, "packages": pkgs });
    println!("{}", serde_json::to_string(&payload)?); // stdout: pure JSON
} else {
    eprintln!("Resolving dependencies…"); // narration stays on stderr
    println!("Installed {} packages", pkgs.len());
}
```

```rust
// Incorrect: progress text interleaved with the JSON stream on stdout.
if cli.json {
    println!("Resolving..."); // breaks `ocx list --json | jq`
    println!("{}", serde_json::to_string(&payload)?);
}
```

### 5. Verbosity, quiet, and exit-code-only modes

`-v`/`-vv`/`-vvv` (increasing) and `-q` (decreasing/silencing) are the conventional verbosity controls; `clap-verbosity-flag` implements this directly against `log`/`tracing`:

- No flag → `Error` level only.
- `-v` → `Warn`, `-vv` → `Info`, `-vvv` → `Debug`, `-vvvv` → `Trace`.
- `-q`/`--quiet` silences output entirely; the default baseline level is swappable via the crate's `LogLevel` trait (`InfoLevel`, `WarnLevel`, etc.) if a tool wants a chattier default.

([clap-verbosity-flag docs](https://docs.rs/clap-verbosity-flag/latest/clap_verbosity_flag/))

cargo models the same idea with config-file/env/flag layering: `term.quiet`/`term.verbose` in `.cargo/config.toml`, `CARGO_TERM_QUIET`/`CARGO_TERM_VERBOSE` env vars, and `--quiet`/`--verbose` flags, with an explicit precedence and an explicit conflict rule ("`--quiet` overrides and disables verbose output"; "`--verbose` overrides and forces verbose output" — i.e. the later-specified, more-specific source wins) ([Cargo book config reference](https://doc.rust-lang.org/cargo/reference/config.html#termcolor)).

"Exit-code-only" mode (`-q` combined with no stdout output at all, success/failure conveyed purely by the process exit code) is the Unix-idiomatic contract for a command meant to be used in `if tool check; then …` shell conditionals — clig.dev's `-q`/`--quiet` convention and POSIX's "return zero on success" both point at this; ocx/grim should support it for anything that's plausibly used as a CI gate (e.g. `ocx verify --quiet`).

### 6. Colour and TTY detection

Precedence, assembled from NO_COLOR's spec and gh's documented behavior (gh is a widely-copied reference implementation of this exact logic in a Go CLI, and the Rust `colorchoice`/`anstream` stack implements the same contract):

1. `--color=always` / `--color=never` (explicit flag) — always wins.
2. `NO_COLOR` set to any non-empty string → colour off, full stop. Spec text: "Command-line software which adds ANSI color to its output by default should check for a `NO_COLOR` environment variable that, when present and not an empty string (regardless of its value), prevents the addition of ANSI color." NO_COLOR governs ANSI colour only — bold/underline/italic are out of scope ([no-color.org](https://no-color.org/)).
3. `CLICOLOR_FORCE` set to a non-empty, non-`"0"` value → force colour on even when piped (gh: "keep ANSI colors in output even when the output is piped") — this is the escape hatch for `| less -R` or CI log viewers that do render ANSI.
4. `CLICOLOR=0` → colour off; `CLICOLOR` unset or nonzero → fall through to TTY auto-detection.
5. Otherwise: colour on iff the destination stream (stdout for stdout content, stderr for stderr content — check the *actual output stream*, not a hardcoded one) is a TTY, via `is_terminal()`. `TERM=dumb` is also a "no colour" signal in the clig.dev checklist.

([gh manual environment vars](https://cli.github.com/manual/gh_help_environment), [no-color.org](https://no-color.org/))

Rust implementation: don't hand-roll this. The `anstream`/`anstyle`/`colorchoice`/`is-terminal` family (all from the `rust-cli`/`rust-cli-args-org` ecosystem, current as of clap 4.x / 2026) provides:

- `is-terminal` crate: `IsTerminal` trait, `.is_terminal()` on any `Read`/`Write` handle, checked per-stream (stdout vs stderr independently) ([is-terminal docs](https://docs.rs/is-terminal/latest/is_terminal/)). Note: as of this research this is still a separate crate, not yet folded into `std::io` — do not assume `std::io::IsTerminal` exists on an MSRV that predates its stabilization; check the project's edition/MSRV before relying on the std version.
- `anstream::AutoStream` wraps stdout/stderr and downgrades or strips ANSI codes automatically to match what the destination terminal supports, including Windows console translation via `anstyle-wincon` ([anstream docs](https://docs.rs/anstream/latest/anstream/)).
- clap's own `ColorChoice` enum (`Auto`/`Always`/`Never`, `Auto` is the default) is the natural type for a `--color` flag — implements `ValueEnum`/`FromStr` so `#[arg(value_enum)]` "just works" ([clap ColorChoice docs](https://docs.rs/clap/latest/clap/enum.ColorChoice.html)).

```rust
// Correct: check the destination stream's own TTY-ness, respect env, allow override.
use std::io::IsTerminal;
let stdout_colour = cli.color.unwrap_or(clap::ColorChoice::Auto);
let use_color = match stdout_colour {
    clap::ColorChoice::Always => true,
    clap::ColorChoice::Never => false,
    clap::ColorChoice::Auto => std::io::stdout().is_terminal() && std::env::var_os("NO_COLOR").is_none(),
};
```

```rust
// Incorrect: colour decided once for the whole process, ignoring which stream a write targets,
// and ignoring NO_COLOR entirely.
static USE_COLOR: bool = true; // no TTY check, no NO_COLOR check
```

### 7. Progress and interactivity

`indicatif::ProgressBar`/`ProgressStyle`/`MultiProgress` is the standard crate. Its own docs state the correct default: "if a non terminal is detected the progress bar will be completely hidden. This makes piping programs to logfiles make sense out of the box." ([indicatif docs](https://docs.rs/indicatif/latest/indicatif/)) — but that auto-detection is keyed off the stream indicatif is told to draw to; a bar mistakenly drawn to stdout (rather than stderr) will still corrupt piped stdout content on a non-TTY consumer that nonetheless treats descriptor 1 differently, so **draw progress to stderr explicitly**, don't rely solely on the library default.

gh's environment variables reinforce the pattern: `GH_SPINNER_DISABLED` to kill spinner animation for text-only environments, `GH_FORCE_TTY` to force interactive rendering even when piped (useful for demos/screenshots) ([gh manual](https://cli.github.com/manual/gh_help_environment)). A grim/ocx equivalent (`OCX_NO_PROGRESS`/`--no-progress`, mirroring uv's `--no-progress` / `UV_NO_PROGRESS`) is the expected shape ([uv CLI reference](https://docs.astral.sh/uv/reference/cli/)).

Prompting rules (clig.dev, reinforced by gh's non-interactive posture):

- Prompt only if stdin is a TTY (`std::io::stdin().is_terminal()`).
- Always provide a flag-based bypass (`-y`/`--yes`, `--no-input`) so scripts never need to fake a TTY.
- Detect CI explicitly too — `CI` is the de-facto universal env var GitHub Actions, GitLab CI, CircleCI, Travis, etc. all set; treating `CI` truthy as "non-interactive" even on a pseudo-TTY (some CI runners allocate one) prevents a hang. The `is_ci` crate is the standard, lightweight check for this rather than hand-rolling a table of provider-specific env vars ([is_ci docs](https://docs.rs/is_ci/latest/is_ci/)).
- Never echo password input; read passwords via `--password-file`/stdin, never a plain `--password` flag (clig.dev secrets rule applies here too).

### 8. Argument design with clap 4

clap 4's derive API is the default for a project of grim/ocx's shape (a stable, statically-known CLI grammar):

- `#[derive(Parser)]` on the top-level struct or enum; `#[derive(Subcommand)]` on an enum for subcommands; `#[derive(Args)]` for a struct meant to be `#[command(flatten)]`-ed into multiple subcommands (this is how a shared `--json`/`--verbose`/`--color` global-args block should be implemented once and reused, directly addressing the "one crate, no structure" pain point by giving CLI surface its own typed module) ([clap derive docs](https://docs.rs/clap/latest/clap/_derive/index.html)).
- Field types imply behavior: `bool` → flag, `Option<T>` → optional, `Vec<T>` → repeatable/multiple, bare `T` → required unless a default is given.
- `#[arg(env = "OCX_REGISTRY")]` gives env-var fallback per-argument; combined with clap's own precedence (explicit flag > env > `default_value`), this directly implements clig.dev's "flags beat env vars beat config" rule for any single argument — config-file values need to be layered in manually (read config, use it to seed `default_value_t`/pass as the struct's initial state) since clap has no built-in config-file source.
- `value_parser = clap::value_parser!(u16).range(1..)` gives typed range validation with clap-formatted errors instead of hand-written `if` checks and `String` errors — worth using for anything like a port or a retry count.
- `#[arg(hide = true)]` hides an arg from `--help` (for deprecated/internal flags) without removing parsing support — useful for a flag being phased out across a release boundary.
- Shell completions: `clap_complete::generate` against the same `Command` used for parsing, driven from a `completions` hidden subcommand or a build script — never hand-write a completion script separately from the arg definitions, they will drift.
- Man pages: `clap_mangen::Man::new(cmd).render(...)` in a `build.rs` or (preferred, since it avoids paying the codegen cost on every `cargo build`) an `xtask` binary invoked explicitly for releases ([clap_mangen README](https://github.com/clap-rs/clap/blob/master/clap_mangen/README.md)).
- `--help`/`--version` are generated automatically and must not be overridden to non-standard behavior (GNU standards requirement, Section 2 above); `--version` output format convention is `name version` on one line, optionally with build metadata on subsequent lines (cargo, ripgrep, uv all follow this).

```rust
// Correct: global args factored into one flattenable struct, reused across subcommands.
#[derive(clap::Args)]
struct GlobalArgs {
    #[arg(long, global = true, value_enum, default_value_t = clap::ColorChoice::Auto)]
    color: clap::ColorChoice,
    #[arg(long, global = true, env = "OCX_NO_PROGRESS")]
    no_progress: bool,
    #[command(flatten)]
    verbosity: clap_verbosity_flag::Verbosity,
}

#[derive(clap::Parser)]
struct Cli {
    #[command(flatten)]
    global: GlobalArgs,
    #[command(subcommand)]
    command: Command,
}
```

### 9. Piping, SIGPIPE, and buffering performance

Two distinct footguns, both well documented and both directly relevant to a registry-fetching CLI that can emit large listings:

**Buffering.** `std::io::Stdout` is *unconditionally line-buffered* — it flushes on every `\n`, regardless of whether the destination is a TTY or a file/pipe. This is filed as a known issue with an actual `FIXME` in libstd acknowledging it should be `LineWriter` for a TTY and `BufWriter` otherwise, matching what Python and C's stdio already do adaptively. The Rust CLI working group calls this out as "a pretty common pitfall for beginning Rust programmers" — code that `println!`s in a hot loop pays a syscall per line even when piped to a file, and ripgrep ships its own stdout-handling code specifically to route around it ([rust-lang/rust#60673](https://github.com/rust-lang/rust/issues/60673)).

Fix: for any command that can emit many lines (`ocx list`, `--json` streaming, verbose logs), wrap the locked handle in a `BufWriter` explicitly and flush once at the end (or via `Drop`), rather than trusting `println!`.

```rust
// Correct: lock once, buffer explicitly, flush before returning.
use std::io::{BufWriter, Write};
let stdout = std::io::stdout();
let mut out = BufWriter::new(stdout.lock());
for pkg in packages {
    writeln!(out, "{pkg}")?;
}
out.flush()?; // don't rely on Drop alone if you need to observe I/O errors
```

```rust
// Incorrect: println! in a hot loop — one write() syscall per line even when piped to a file.
for pkg in packages {
    println!("{pkg}");
}
```

**SIGPIPE.** Rust sets `SIGPIPE` to `SIG_IGN` before `main()` runs, so a write to a closed pipe (`ocx list | head -5`) doesn't kill the process the way a C tool would — it surfaces as `Err(ErrorKind::BrokenPipe)` from the write call. `println!`/`writeln!` used with the `!`-macro's default panicking behavior will **panic** on that error rather than exiting cleanly, producing an ugly "panicked at… Broken pipe" instead of the silent, zero-noise exit users expect from `head`-truncated output. The fix, until `-Zon-broken-pipe=kill` stabilizes: use `writeln!` (which returns `Result` instead of panicking) and match `ErrorKind::BrokenPipe` explicitly to exit quietly instead of propagating the error as a hard failure ([unstable book](https://doc.rust-lang.org/nightly/unstable-book/compiler-flags/on-broken-pipe.html)).

```rust
// Correct: treat BrokenPipe as a clean, silent exit — not an error.
if let Err(e) = writeln!(out, "{line}") {
    if e.kind() == std::io::ErrorKind::BrokenPipe {
        return; // or std::process::exit(0) if not in main's return path
    }
    return Err(e.into());
}
```

```rust
// Incorrect: println! panics on BrokenPipe, producing a stack trace when piped to `head`.
println!("{line}"); // panics: "failed printing to stdout: Broken pipe"
```

### 10. Config precedence and XDG base directories

clig.dev's precedence order — flags > env vars > project config > user config > system config — should be implemented with the config file read *before* clap parses (so its values seed `default_value`/struct defaults) and env-var fallback handled per-field via `#[arg(env = ...)]`, which naturally sits between flags and defaults in clap's own resolution order.

For path discovery, use the `directories` crate's `ProjectDirs::from(qualifier, org, app)` rather than joining `$HOME` manually — it dispatches to the XDG Base Directory spec on Linux (`XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_CACHE_HOME`, defaulting to `~/.config`, `~/.local/share`, `~/.cache` respectively when unset), to Apple's Standard Directories (`~/Library/Application Support/...`) on macOS, and to the Windows Known Folder API (`%APPDATA%`/`%LOCALAPPDATA%`) on Windows ([directories docs](https://docs.rs/directories/latest/directories/)). This directly matters for ocx/grim's cache/lockfile/credential storage being genuinely cross-platform rather than Linux-only-tested.

`etcetera` is a newer, actively-maintained alternative in the same space worth knowing by name if `directories`' maintenance cadence becomes a concern, but `directories` remains the more widely depended-upon crate as of this research.

Env var naming: prefix all tool-specific env vars with the tool's uppercase name (`OCX_`, `GRIM_`) to avoid collisions, matching cargo's `CARGO_*` and uv's `UV_*` conventions ([Cargo book](https://doc.rust-lang.org/cargo/reference/config.html#termcolor), [uv CLI reference](https://docs.astral.sh/uv/reference/cli/)).

### 11. Exit codes and `main()` signature

Return `std::process::ExitCode` from `main` (`fn main() -> ExitCode` or `fn main() -> Result<(), E>` where `E: std::process::Termination`-compatible via `?`) rather than calling `std::process::exit()` directly from arbitrary call sites. `process::exit()`/the nightly-only immediate-exit path "terminates the process immediately, so no destructors on the current stack or any other thread's stack will be run" — for a tool doing atomic file writes, lockfile updates, or temp-dir cleanup, that means a mid-write exit can leave corrupt state on disk. Returning `ExitCode::SUCCESS`/`ExitCode::FAILURE` (or `ExitCode::from(u8)` for a specific code, noting that "numeric values used in `ExitCode` lack portable meanings" beyond `SUCCESS`/`FAILURE` — different platforms mask/truncate differently) lets `main` unwind normally and run `Drop` impls first ([std::process::ExitCode docs](https://doc.rust-lang.org/std/process/struct.ExitCode.html)).

## Normative guidance candidates

1. **Route by content, not habit: primary result → stdout, everything else → stderr.** Rationale: the primary output is the only thing a pipe consumer wants; anything else corrupts it. Verify: grep for `println!`/`print!` calls outside of explicit `--json`/result-formatting code paths; any progress/log/prompt string printed via `println!` instead of `eprintln!` is a finding.
2. **`--json` output on stdout must be the only bytes on stdout for that invocation.** Rationale: a single stray `println!` breaks every `| jq` pipeline silently. Verify: with `--json` passed, capture stdout and confirm `serde_json::from_str` on the whole captured stream succeeds (a one-line integration test per JSON-capable subcommand).
3. **Never call `std::process::exit()` outside of `main`'s own return path; return `ExitCode`/`Result` instead.** Rationale: `process::exit` skips destructors, risking corrupted lockfiles/caches on early exit. Verify: `grep -rn "process::exit" src/` — every hit outside `fn main` is a finding; `cargo clippy` doesn't catch this by default, code review must.
4. **Colour decisions must check `NO_COLOR`, `CLICOLOR`/`CLICOLOR_FORCE`, `TERM=dumb`, and per-stream `is_terminal()` — via `anstream`/`colorchoice`, not a hand-rolled check.** Rationale: hand-rolled colour logic reliably misses one of the four signals. Verify: `grep -rn "NO_COLOR\|CLICOLOR" src/` should show zero hits outside of a thin wrapper around `anstream`/`colorchoice` — if the codebase reads these env vars manually, that's a red flag for a partial reimplementation.
5. **Draw progress bars/spinners to stderr, and suppress them whenever that stream is not a TTY or `CI`/`--no-progress`/`NO_COLOR`-adjacent flags are set.** Rationale: a progress bar on stdout corrupts piped output; a progress bar in CI logs is noise. Verify: `indicatif::ProgressBar::with_draw_target` calls should target `ProgressDrawTarget::stderr()` (or default, which is stderr) — grep for `ProgressDrawTarget::stdout` as an anti-pattern.
6. **Any interactive prompt is gated on `stdin().is_terminal()` and has a non-interactive bypass flag.** Rationale: a blocking prompt in a script or CI job hangs forever with no diagnostic. Verify: every `dialoguer`/manual `stdin().read_line` call site is preceded by an `is_terminal()` check or documented `--yes`/`--no-input` flag; a code-reading heuristic since this isn't mechanically greppable in general.
7. **Wrap stdout in an explicit `BufWriter` and flush once, for any command that can emit more than a handful of lines.** Rationale: `io::Stdout` is unconditionally line-buffered even when piped to a file — a per-line syscall is measurably slower for large output. Verify: grep for `println!`/`writeln!` inside a `for`/`while` loop over more than a small fixed bound; flag any such loop not wrapped in an explicit `BufWriter`.
8. **Treat `ErrorKind::BrokenPipe` from a stdout write as a clean, silent exit, not a propagated error or panic.** Rationale: default Rust behavior panics on write-after-pipe-close, which is wrong for CLI tools piped into `head`/`less`. Verify: grep for raw `println!`/`print!` in any command whose output can be large/streamed (these macros panic on I/O error) — they should be `writeln!`/`write!` with the `Result` explicitly matched.
9. **Global CLI args (`--color`, `-v`/`-vv`, `--json`) live in one `#[derive(Args)]` struct flattened into every subcommand, not redeclared per subcommand.** Rationale: redeclaration drifts — flag semantics diverge between subcommands over time. Verify: `grep -rn "long = \"color\"\|long = \"verbose\"" src/` should show exactly one definition site.
10. **Config/cache/data directories come from `directories::ProjectDirs`, never a hand-joined `$HOME/.something` path.** Rationale: hand-joined paths break XDG compliance on Linux and are simply wrong on Windows/macOS. Verify: `grep -rn "env::var(\"HOME\")\|dirs::home_dir" src/` outside of the one call into `directories`/`ProjectDirs` is a finding.
11. **Every tool-specific env var is prefixed (`OCX_`/`GRIM_`) and documented alongside its corresponding flag.** Rationale: unprefixed env vars collide with other tools and are undiscoverable. Verify: `grep -rn "env::var(" src/` and check each literal starts with the tool prefix.
12. **Man pages and shell completions are generated from the same `clap::Command` used for parsing (via `clap_mangen`/`clap_complete`), not maintained by hand.** Rationale: hand-maintained docs drift from the actual arg grammar within a release or two. Verify: check for a `build.rs`/`xtask` invoking `clap_mangen::Man`/`clap_complete::generate` against the CLI's own `Cli::command()`; absence of such generation alongside a checked-in man page/completion script is a finding.
13. **`--version` output is `<name> <version>` on the first line** (matching GNU/cargo/ripgrep convention), generated by clap's built-in version handling, never a custom `println!`. Rationale: scripts and packaging tooling parse this line; deviating breaks them. Verify: run `<bin> --version`, confirm first line matches `^\S+ \d`.

## AI-agent angle

- **Hallucinated buffering assumption.** Models trained on general Rust snippets reach for `println!` in loops by pure habit and don't know about the line-buffering footgun (`rust-lang/rust#60673` is a long-running, easy-to-miss issue). Check: any loop emitting output should be flagged for review if it uses `println!`/`print!` instead of a `BufWriter`-backed `writeln!`.
- **BrokenPipe panics look like a bug report, not a design flaw, to an agent triaging after the fact.** An agent asked to "fix the panic when piping to `head`" may patch the specific call site with a `.ok()` swallow rather than recognizing the systemic pattern (every `println!`/`print!` call is equally exposed). Check: grep for `.ok()` immediately after a `println!`/`writeln!` call — a sign the panic was patched locally instead of centralizing BrokenPipe handling.
- **NO_COLOR/CLICOLOR reimplementation instead of using `anstream`/`colorchoice`.** Models frequently write their own `if env::var("NO_COLOR").is_ok() { ... }` because it looks trivial, missing `CLICOLOR_FORCE`, `TERM=dumb`, and per-stream TTY checks — and often get the *is-empty* check backwards (treating an empty `NO_COLOR=""` as "disable colour" when the spec says only *presence*, regardless of emptiness — actually per-spec even empty string counts as present and non-empty is required per the spec text quoted above, so an agent needs to check presence-and-non-emptiness correctly, easy to get backwards). Check: any manual `env::var("NO_COLOR")` / `env::var("CLICOLOR")` read outside a thin `colorchoice`/`anstream` wrapper is a near-certain reimplementation with a gap.
- **`process::exit()` reached for from deep inside business logic** (a common LLM pattern for "just terminate the program from here on error") bypasses `Drop`/destructors — for a tool doing atomic renames/lockfile writes this can leave partial state. This compiles fine and looks correct in a quick test; it only breaks under interruption/error timing that a superficial test doesn't hit. Check: `grep -rn "process::exit" src/ | grep -v "fn main"`.
- **Outdated `#[unix_sigpipe = "..."]` attribute suggestions.** A model trained on older Rust nightly discussions may suggest the `#[unix_sigpipe]` attribute; this has been replaced by the `-Zon-broken-pipe=...` compiler flag and is still unstable as of this research — code depending on it will fail to compile on stable Rust. Check: `grep -rn "unix_sigpipe" src/` — any hit is stale/wrong.
- **`is-terminal` crate name/version drift and std overlap.** A model may either assume `std::io::IsTerminal` exists on an old MSRV, or add the third-party `is-terminal` crate as a dependency when `std::io::IsTerminal` is already available and sufficient for the project's actual MSRV — check the project's declared MSRV/edition before trusting either assumption, and prefer std's version when the MSRV supports it, third-party crate otherwise.
- **JSON output polluted by progress/log lines under `--json`.** An agent implementing a new subcommand by copy-pasting an existing non-JSON code path frequently forgets to gate the narration `println!`s behind `!cli.json`, producing output that looks fine manually but breaks any `jq` pipeline. Check: with `--json` passed, pipe stdout through `jq .` in CI — any parse failure is this bug.
- **Clap `env` fallback assumed to also read a config file.** Models sometimes assume `#[arg(env = "X")]` also checks a TOML/YAML config automatically — it does not; clap has no built-in config-file source, and an agent that skips manually layering config-file values in will silently drop the "project config"/"user config" tiers of clig.dev's precedence order. Check: does the codebase read a config file at all, and if so, is it merged in *before* clap parsing (so flags/env still override it)?

## Contested / evolving

- **`-Zon-broken-pipe` stabilization.** As of this research it's still a nightly-only unstable flag with three modes (`kill`/`error`/`inherit`); until it stabilizes, every CLI tool needs to hand-implement BrokenPipe-as-clean-exit. Watch the tracking issue ([rust-lang/rust#97889](https://github.com/rust-lang/rust/issues/97889)) — once stable, `kill` mode (SIGPIPE→SIG_DFL before `main`) becomes the simplest correct default for a text-emitting CLI and the manual `ErrorKind::BrokenPipe` handling becomes redundant, not wrong.
- **`is-terminal` crate vs `std::io::IsTerminal`.** The trait has been migrating into std; projects with a modern MSRV should prefer the std version and drop the crate dependency, but plenty of current tutorials and even some current crates still depend on the standalone crate for broader MSRV compatibility. Trend: moving toward std-only as MSRVs climb past the stabilization release.
- **`directories` vs `etcetera`.** `directories` is the incumbent and still the most-depended-upon, but `etcetera` markets itself as more spec-literal (distinguishing "XDG-only" from "native" behavior more explicitly) and has been gaining adoption in newer CLI projects circa 2024–2026. No consensus yet on which becomes the long-term default; pick one and be consistent rather than mixing.
- **Whether `--json` should imply `--no-progress`/`--quiet` automatically, or require both flags.** clig.dev doesn't fully resolve this; in practice most tools (gh, docker) auto-suppress interactive/progress output the moment `--json`/`-q` is requested rather than requiring the user to pass both, and that auto-suppression is the direction current tool design is trending — but a purist reading of "flags are independent, orthogonal, and explicit" argues against silently changing one flag's behavior based on another. Recommend the pragmatic auto-suppress default with a `--no-progress`-style override for the rare case someone wants both.
- **Man-page generation via `build.rs` vs `xtask`.** clap_mangen's own guidance now leans toward `xtask` (or a dedicated release-time step) over `build.rs`, specifically to avoid paying codegen cost on every incremental `cargo build`; `build.rs`-based generation is still common in older/smaller projects but is being phased out in favor of explicit release tooling.

## Sources

| URL | What it is | Date/era | Why it was worth reading |
|---|---|---|---|
| [clig.dev](https://clig.dev/) | Community CLI guidelines (spec-adjacent) | Living doc, referenced 2026 | The single densest source of checkable CLI rules; used verbatim for stdout/stderr, colour, prompting, config precedence rules. |
| [GNU Coding Standards — Command-Line Interfaces](https://www.gnu.org/prep/standards/html_node/Command_002dLine-Interfaces.html) | Official GNU project standard | Maintained, referenced 2026 | Origin of the `--help`/`--version` universal-option requirement and long-option naming consistency principle. |
| [POSIX.1-2017 Utility Argument Syntax (Ch. 12)](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html) | The Open Group official POSIX spec | 2017 edition, still current base text | Formal grammar clap's default parser implements; needed to know what "standard" argument syntax actually is. |
| [no-color.org](https://no-color.org/) | The NO_COLOR informal spec (primary source) | Living doc, referenced 2026 | Exact, quotable wording of the NO_COLOR contract used by every colour-aware Rust crate. |
| [clap derive reference](https://docs.rs/clap/latest/clap/_derive/index.html) | Official clap crate docs (docs.rs) | clap 4.x, 2026 | Authoritative on `#[derive(Parser)]`/`Args`/`Subcommand`/`ValueEnum` and magic vs raw attributes. |
| [clap `ColorChoice` enum docs](https://docs.rs/clap/latest/clap/enum.ColorChoice.html) | Official clap crate docs | clap 4.x, 2026 | Confirms `Auto`/`Always`/`Never` semantics and that `Auto` is clap's own default. |
| [indicatif crate docs](https://docs.rs/indicatif/latest/indicatif/) | Official crate docs (docs.rs) | Current, 2026 | Confirms indicatif's documented non-TTY auto-hide behavior for `ProgressBar`/`MultiProgress`. |
| [anstream crate docs](https://docs.rs/anstream/latest/anstream/) | Official crate docs (docs.rs) | Current, 2026 | Confirms `AutoStream`'s graceful-degradation design and its dependency chain (`anstyle`, `colorchoice`, `is_terminal_polyfill`, `anstyle-wincon` for Windows). |
| [is-terminal crate docs](https://docs.rs/is-terminal/latest/is_terminal/) | Official crate docs (docs.rs) | v0.4.x, 2026 | Confirms the `IsTerminal` trait's role and that it remains a separate crate for broader MSRV support alongside std's version. |
| [clap-verbosity-flag docs](https://docs.rs/clap-verbosity-flag/latest/clap_verbosity_flag/) | Official crate docs (docs.rs) | Current, 2026 | Exact `-v`/`-vv`/`-q` to log-level mapping used as the verbosity convention. |
| [directories crate docs](https://docs.rs/directories/latest/directories/) | Official crate docs (docs.rs) | Current, 2026 | Confirms `ProjectDirs`/`BaseDirs` platform mapping (XDG on Linux, Known Folders on Windows, Standard Directories on macOS). |
| [clap_mangen README](https://github.com/clap-rs/clap/blob/master/clap_mangen/README.md) | Official crate source/README, clap-rs org repo | Current, 2026 | Real `build.rs` example for man-page generation and the `xtask`-over-`build.rs` recommendation. |
| [jsonlines.org](https://jsonlines.org/) | The JSON Lines format spec (primary source) | Living doc, referenced 2026 | Exact line-termination/encoding rules for streaming JSON output. |
| [rust-lang/rust#60673](https://github.com/rust-lang/rust/issues/60673) | Official Rust project issue tracker | Opened 2019, still open/current 2026 | Primary-source evidence for the stdout line-buffering footgun, including the libstd `FIXME` and the ripgrep workaround reference. |
| [Rust Unstable Book — `on-broken-pipe`](https://doc.rust-lang.org/nightly/unstable-book/compiler-flags/on-broken-pipe.html) | Official Rust compiler docs | Nightly-current, 2026 | Exact semantics table for `-Zon-broken-pipe=kill/error/inherit` and confirmation the `#[unix_sigpipe]` attribute was superseded. |
| [`Command Line Applications in Rust` book — machine communication](https://rust-cli.github.io/book/in-depth/machine-communication.html) | Official Rust CLI Working Group book | Maintained, referenced 2026 | Rust-specific worked example of the ripgrep-style `type`-tagged streaming JSON pattern. |
| [`std::process::ExitCode` docs](https://doc.rust-lang.org/std/process/struct.ExitCode.html) | Official Rust std library docs | Stable, current 2026 | Authoritative on `SUCCESS`/`FAILURE`, portability caveats for arbitrary codes, and the destructors-run-vs-not distinction from `process::exit`. |
| [Cargo Book — Configuration / `term.color`](https://doc.rust-lang.org/cargo/reference/config.html#termcolor) | Official Cargo documentation | Current, 2026 | Real-tool model of flag > env > config-file precedence with exact env var names (`CARGO_TERM_COLOR` etc.) and quiet/verbose conflict rules. |
| [uv CLI reference](https://docs.astral.sh/uv/reference/cli/) | Official Astral/uv documentation | Current, 2026 | Real modern Rust CLI's global-flag surface (`--color`, `--no-progress`, `-q`/`-v`, `--offline`) and their env var equivalents, as a design model. |
| [GitHub CLI (`gh`) manual — environment](https://cli.github.com/manual/gh_help_environment) | Official GitHub CLI documentation | Current, 2026 | Reference implementation of the full NO_COLOR/CLICOLOR/CLICOLOR_FORCE/GH_FORCE_TTY precedence stack in a widely-used real tool. |
| [`is_ci` crate docs](https://docs.rs/is_ci/latest/is_ci/) | Official crate docs (docs.rs) | Current, 2026 | Confirms the standard lightweight approach to CI-environment detection for gating interactive prompts. |

