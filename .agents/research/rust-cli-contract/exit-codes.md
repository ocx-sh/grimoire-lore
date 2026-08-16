---
title: Exit Code Conventions and Rust Mechanics
topic: exit-codes
agent: inv-exit
model: sonnet
date_researched: "2026-08"
sources_count: 21
scope: |
  Covers exit code conventions (POSIX, GNU, BSD sysexits.h, shell reserved ranges),
  real-tool exit code tables (git, curl, ripgrep, cargo, gh, docker, systemd), Rust's
  ExitCode/Termination/process::exit mechanics, child-process status propagation,
  SIGINT/SIGTERM/SIGPIPE handling, and exit-code testing/documentation practice.
  Does not cover general error-type design (see the error-handling subarea) or
  logging/telemetry of failures.
---

## Table of contents

1. [Shell and POSIX exit status conventions](#1-shell-and-posix-exit-status-conventions)
2. [BSD sysexits.h and the case against it](#2-bsd-sysexitsh-and-the-case-against-it)
3. [Real tool exit code tables](#3-real-tool-exit-code-tables)
4. [Rust mechanics: ExitCode, Termination, main's return type](#4-rust-mechanics-exitcode-termination-mains-return-type)
5. [`std::process::exit` and why to avoid it](#5-stdprocessexit-and-why-to-avoid-it)
6. [exitcode / sysexits Rust crates](#6-exitcode--sysexits-rust-crates)
7. [clap's exit codes and overriding them](#7-claps-exit-codes-and-overriding-them)
8. [Propagating a child process's exit status](#8-propagating-a-child-processs-exit-status)
9. [Signals: SIGINT/SIGTERM handling and correct 130](#9-signals-sigintsigterm-handling-and-correct-130)
10. [SIGPIPE and the broken-pipe panic](#10-sigpipe-and-the-broken-pipe-panic)
11. [Testing exit codes](#11-testing-exit-codes)
12. [Documenting exit codes](#12-documenting-exit-codes)

## Summary

- POSIX defines only three hard rules: 0 = success, 126 = found but not executable, 127 = not found; everything else (1–125) is implementation-defined ([POSIX §2.8.2](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html)).
- Signal-terminated processes report exit status `128+N` in shells (SIGINT → 130, SIGTERM → 143); this is a shell/waitpid convention, not something a process sets itself via `exit()` ([bash manual](https://tiswww.case.edu/php/chet/bash/bashref.html), [POSIX](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html)).
- Exit status is an 8-bit value on Unix — anything you pass to `exit()` above 255 is silently truncated mod 256; never rely on values ≥ 256 ([bash manual](https://tiswww.case.edu/php/chet/bash/bashref.html), [Rust `process::exit` docs](https://doc.rust-lang.org/std/process/fn.exit.html)).
- Codes 126, 127, 128–165, and 255 are conventionally reserved by the shell/OS layer; scripts and CLIs should not invent meanings inside that range ([Advanced Bash-Scripting Guide, Appendix E](https://tldp.org/LDP/abs/html/exitcodes.html)).
- BSD `sysexits.h` defines 64–78 (`EX_USAGE`=64 … `EX_CONFIG`=78) but its own man page admits "the choice of an appropriate exit value is often ambiguous" — treat it as a source of *names*, not a mandate ([sysexits.h(3head)](https://www.man7.org/linux//man-pages/man3/sysexits.h.3head.html)).
- Practitioner consensus (e.g. the widely cited exit-code best-practices post) is that **documenting your own codes matters more than compliance with sysexits.h**, especially since sysexits.h doesn't exist on Windows ([chrisdown.name](https://chrisdown.name/2013/11/03/exit-code-best-practises.html)).
- Real large tools mostly reject sysexits.h: git uses 128 (fatal)/129 (usage) ([git docs](https://git-scm.com/docs/api-error-handling)), ripgrep/grep use 0/1/2 (match/no-match/error) ([ripgrep discussion](https://github.com/BurntSushi/ripgrep/issues/948)), gh uses 0/1/2/4 ([gh docs](https://cli.github.com/manual/gh_help_exit-codes)), curl has ~50 tool-specific codes (1–99) that are its own invention, not sysexits ([everything.curl.dev](https://everything.curl.dev/cmdline/exitcode.html)).
- Rust panics exit with code **101**, distinct from ordinary `Err` returns from `main` (also 1 by default via `Termination`) — a reviewer can use 101 to distinguish "crashed" from "cleanly reported failure" in CI logs.
- Return `std::process::ExitCode` from `main`, not `std::process::exit` — `exit()` skips all destructors on every thread and can race with C `atexit`/`exit` under FFI ([`process::exit` docs](https://doc.rust-lang.org/std/process/fn.exit.html)).
- `main() -> Result<(), E>` where `E: Debug` prints `Err`'s `Debug` output to stderr and exits `FAILURE` — this is why CLIs should use `anyhow`/custom errors with a *good* `Debug` impl (or a `Display`-forwarding wrapper), or return `ExitCode` directly for control over the message ([`Termination` trait docs](https://doc.rust-lang.org/std/process/trait.Termination.html)).
- `ExitCode::from(u8)` exists for arbitrary codes, but the type intentionally has no `Eq`/raw-value getter — treat exit codes as write-only from application code, not as something to branch on internally.
- `ExitStatus::code()` returns `None` on Unix when the child died from a signal — code that unwraps this Option and assumes an integer will panic on any SIGKILL/SIGTERM'd child; use `ExitStatusExt::signal()` instead ([`ExitStatus` docs](https://doc.rust-lang.org/std/process/struct.ExitStatus.html), [`ExitStatusExt` docs](https://doc.rust-lang.org/std/os/unix/process/trait.ExitStatusExt.html)).
- clap defaults usage errors to exit code **2** (changed from 1 in clap 3, [clap-rs#1327](https://github.com/clap-rs/clap/issues/1327)); help/version print to stdout and exit **0** — both determined by `ErrorKind` via `Error::exit_code()`.
- Rust's default SIGPIPE disposition is `SIG_IGN` before `main()` — this is *why* piping a Rust program's stdout into `head` causes a "Broken pipe (os error 32)" panic instead of the silent kill C programs get; a stable fix (`sigpipe` crate or a compiler flag) still requires action from the author as of 2026 ([Unstable Book: on-broken-pipe](https://doc.rust-lang.org/nightly/unstable-book/compiler-flags/on-broken-pipe.html)).
- Stabilizing a fix for this (`unix_sigpipe` attribute, later `-Zon-broken-pipe` flag) has been in flight since 2022 and is **still nightly-only** as of 2026 — this is the single most "gotcha" item for AI-generated Rust CLIs that print large output ([tracking issue #97889](https://github.com/rust-lang/rust/issues/97889)).
- To report 130/143 correctly after handling SIGINT/SIGTERM for cleanup, the correct technique is to restore the signal's default disposition and re-raise it (or call `exit(128+signal)`), not to hand-pick 130 as a guess — the parent shell needs to see the real signal-terminated waitpid status in job-control contexts.
- `assert_cmd` is the standard crate for asserting a Rust binary's exit code/stdout/stderr in integration tests (`.assert().failure().code(2)`), and `trycmd`/`insta-cmd` add snapshot-style testing on top for many CLI invocations at once.

## Findings

### 1. Shell and POSIX exit status conventions

POSIX (`IEEE Std 1003.1`, §2.8.2) sets exactly three hard conventions and leaves the rest to the application:

- **0** = successful completion.
- **127** if the command name could not be found ("If a command is not found, the exit status shall be 127.").
- **126** if the command name was found but was not an executable utility.
- **1–125** are free for the application; POSIX only says a command that "fails during word expansion or redirection" must return a status in this range.
- **>128** for signal termination — "The exit status of a command that terminated because it received a signal shall be reported as greater than 128" ([POSIX Shell & Utilities §2.8.2](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html)).

Bash makes the signal rule concrete: a simple command's exit status is `128+n` if the command was terminated by signal `n`, and exit status is always restricted to 8 bits ("the maximum value is 255") — anything larger silently wraps ([Bash Reference Manual, §Exit Status](https://tiswww.case.edu/php/chet/bash/bashref.html)).

The Advanced Bash-Scripting Guide's exit-code appendix, still the most commonly cited reference for the "special meaning" ranges, tabulates:

| Code | Meaning |
|---|---|
| 1 | General/miscellaneous error |
| 2 | Shell builtin misuse |
| 126 | Command found but not executable |
| 127 | Command not found |
| 128 | Invalid argument to `exit` (only 0–255 valid) |
| 128+n | Fatal error signal `n` |
| 130 | Terminated by Control-C (SIGINT = 2) |
| 255 | Out-of-range exit status (wraps via mod 256) |

and recommends restricting *your own* codes to 64–113 (plus 0) precisely to stay clear of everything the shell/OS layer already claims ([TLDP Advanced Bash-Scripting Guide, Appendix E](https://tldp.org/LDP/abs/html/exitcodes.html)). This is folklore-grade guidance, not a standard — but the underlying reserved ranges (1–2, 126–165, 255) it warns you off are real and worth avoiding.

`timeout(1)`-family tools use 124 for "command timed out," which is a GNU coreutils convention, not POSIX; it is still worth avoiding for your own use since so many CI harnesses grep for it.

### 2. BSD sysexits.h and the case against it

`<sysexits.h>` originated in 4.0BSD for `sendmail(8)`. Its 16 constants (`EX_OK`=0, `EX__BASE`=64, `EX_USAGE`=64 … `EX_CONFIG`=78) are:

| Constant | Value | Meaning |
|---|---|---|
| `EX_OK` | 0 | Successful termination |
| `EX_USAGE` | 64 | Command line usage error |
| `EX_DATAERR` | 65 | Data format error |
| `EX_NOINPUT` | 66 | Cannot open input |
| `EX_NOUSER` | 67 | Addressee unknown |
| `EX_NOHOST` | 68 | Host name unknown |
| `EX_UNAVAILABLE` | 69 | Service unavailable |
| `EX_SOFTWARE` | 70 | Internal software error |
| `EX_OSERR` | 71 | System error (e.g. can't fork) |
| `EX_OSFILE` | 72 | Critical OS file missing |
| `EX_CANTCREAT` | 73 | Can't create (user) output file |
| `EX_IOERR` | 74 | Input/output error |
| `EX_TEMPFAIL` | 75 | Temp failure; retry invited |
| `EX_PROTOCOL` | 76 | Remote error in protocol |
| `EX_NOPERM` | 77 | Permission denied |
| `EX_CONFIG` | 78 | Configuration error |

Source: [`sysexits.h(3head)` — man7.org](https://www.man7.org/linux//man-pages/man3/sysexits.h.3head.html). Its own text hedges hard: "The choice of an appropriate exit value is often ambiguous."

**The argument against treating it as gospel today:** it's a Unix-only, sendmail-era convention with no Windows equivalent — the widely-cited practitioner post on exit code best practices notes explicitly that "this method won't work on systems that don't support sysexits.h, though (like Windows, for example)" and lands on a pragmatic middle ground: use the constants where they naturally fit *and* fall back to plain numbers with real documentation when they don't — "the most important thing is that you make sure the exit codes your program returns are well documented, even if you don't use the constants from sysexits.h" ([chrisdown.name, "Best practices when designating exit codes"](https://chrisdown.name/2013/11/03/exit-code-best-practises.html)).

For OCX/Grimoire specifically (a cross-platform Rust CLI shipped as prebuilt binaries for Linux/macOS/Windows), sysexits.h's Unix-only vocabulary is a poor structural fit as the *primary* contract, but individual codes (`EX_CONFIG`, `EX_NOINPUT`, `EX_IOERR`) remain useful, well-understood *names* to borrow when your own scheme needs a "misconfigured" or "can't read input" bucket — treat it as a naming vocabulary, not an ABI you must match number-for-number.

### 3. Real tool exit code tables

**git** — two codes for its own failures, distinct from subprocess-forwarded ones: `die()` prints a message and exits **128** for fatal application errors, `usage()` exits **129** for command-line usage errors ([git docs: api-error-handling](https://git-scm.com/docs/api-error-handling)). Note git does *not* use sysexits.h's 64/78 for these — it picked shell-reserved-adjacent numbers instead, on the theory that "128+" already reads as "abnormal" to a shell user.

**curl** — the most elaborate documented scheme of any of these tools: ~50 distinct, stable, numbered codes from 1 (unsupported protocol) to 99 (unrecoverable poll/select error), each with a fixed, permanent meaning that curl commits never to reuse for something else. Selected entries:

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Unsupported protocol |
| 2 | Failed initialization |
| 3 | URL malformed |
| 6 | Could not resolve host |
| 7 | Failed to connect to host |
| 22 | HTTP error ≥400 (only with `--fail`) |
| 26 | Read error |
| 28 | Operation timeout |
| 35 | TLS/SSL handshake failure |
| 47 | Too many redirects |
| 51 | Peer certificate/SSH fingerprint verification failed |
| 60 | Peer certificate authentication failed (CA problem) |
| 67 | Login authentication failed |
| 78 | Requested resource (URL) not found |

curl explicitly states the design intent: "A lot of effort has gone into the project to make curl return a usable exit code when something goes wrong and it always returns 0 (zero) when the operation went as planned" ([everything.curl.dev — Exit code](https://everything.curl.dev/cmdline/exitcode.html)). Several numbers (20, 24, 29, 32, 40–41, 44, 46, 50, 57, 62, 75–76, 81) are deliberately retired/unused placeholders, not gaps — curl never reassigns a retired code, which is the property that makes long-lived scripts able to trust specific numbers for over a decade.

**ripgrep / grep** — a minimal, precise three-way split: 0 = at least one match, 1 = no match, 2 = an error occurred (regex syntax error, unreadable file, etc.), with the explicit design note that this matches GNU grep's behavior. The rg/grep contributors have discussed (and rejected keeping ambiguous) splitting "no match" from "error" further, precisely because scripts rely on being able to tell "grep found nothing" from "grep couldn't run" via 1 vs 2 ([ripgrep#948](https://github.com/BurntSushi/ripgrep/issues/948), [ripgrep#1159](https://github.com/BurntSushi/ripgrep/issues/1159)).

**cargo** — 101 is cargo's own fallback/infrastructure-failure code (distinct from a *test binary's own* exit code, which cargo forwards verbatim when a single test process fails); with `--no-fail-fast`, since there's no longer one authoritative child exit code, cargo always reports 101. This 101 is unrelated to (but numerically coincides with) rustc's panic exit code — both signal "something crashed/failed at the infrastructure level, not a normal program failure."

**gh (GitHub CLI)** — a deliberately small, stable set: 0 success, 1 generic failure, 2 cancelled, 4 requires authentication ("If a command requires authentication, the exit code will be 4") — with an explicit caveat that individual subcommands may add more ([gh exit-codes docs](https://cli.github.com/manual/gh_help_exit-codes)).

**docker** — reserves 125 for "the docker run command itself failed" (bad flag, daemon problem), 126 for "container command located but not executable," 127 for "container command not found" — i.e. docker deliberately mirrors the shell's 126/127 vocabulary one layer up, at the container-invocation level, while claiming 125 for its own CLI-level failures.

**systemd** — for services, uses the LSB init-script exit code space (`EXIT_INVALIDARGUMENT` = 2, and a documented block of `EXIT_STATUS_LSB` codes) layered under its own additional constants in `src/shared/exit-status.h`, which is the most "bureaucratic" of the schemes here — worth knowing about as the far end of the spectrum from curl's flat integer list, but not a model to imitate for a CLI package manager.

**Contrast of philosophies:** git and gh keep tiny fixed vocabularies and lean on stderr text for detail; curl treats the exit code itself as the primary machine-readable diagnostic and has committed to never recycling a number; ripgrep/grep use exit code purely to distinguish match-state from failure-state, a orthogonal axis from "what went wrong." None of the widely-used tools researched here adopt sysexits.h's 64–78 range wholesale.

### 4. Rust mechanics: ExitCode, Termination, main's return type

Since Rust 1.61.0, `main` can return any type implementing `std::process::Termination`:

```rust
pub trait Termination {
    fn report(self) -> ExitCode;
}
```

Implementations relevant to CLIs ([Termination trait docs](https://doc.rust-lang.org/std/process/trait.Termination.html)):

- `()` → always `ExitCode::SUCCESS`.
- `ExitCode` → itself, unchanged.
- `Result<T, E> where T: Termination, E: Debug` → `Ok(t)` yields `t.report()`; `Err(e)` **prints `e`'s `Debug` representation to stderr** and returns `ExitCode::FAILURE` (i.e. a shell-visible `1`, though not guaranteed to literally be 1 — see below).
- `!` and `Infallible` → uninhabited, never actually return.

```rust
// Correct: main -> Result, error path prints the *Debug* impl of the error.
fn main() -> Result<(), anyhow::Error> {
    do_work()?;   // anyhow::Error's Debug prints a nice chain w/ backtrace hint
    Ok(())
}
```

```rust
// Wrong (compiles, misleading in CI): E's Debug is ugly/uninformative,
// e.g. a bare struct with no context, so the operator sees garbage on stderr.
#[derive(Debug)]
struct Oops;
fn main() -> Result<(), Oops> {
    Err(Oops) // stderr prints "Error: Oops" — no context, no chain
}
```

`ExitCode` itself:

```rust
use std::process::ExitCode;

fn main() -> ExitCode {
    if !check_foo() {
        return ExitCode::from(42);
    }
    ExitCode::SUCCESS
}
```

- `ExitCode::SUCCESS` / `ExitCode::FAILURE` are the *canonical* platform-portable codes; `ExitCode::from(u8)` builds an arbitrary code but the docs explicitly warn numeric values "don't have portable meanings across platforms" and some platforms mask more/fewer bits than others ([`ExitCode` docs](https://doc.rust-lang.org/std/process/struct.ExitCode.html)).
- `ExitCode` deliberately does **not** implement `Eq`, `Hash`, or expose its raw value — "There may be multiple failure codes; not all will compare equal to `ExitCode::FAILURE`." Application code should treat exit codes as write-only outputs, not as an internal signaling channel to branch on.
- A `main` returning bare `()` (the historical default) implicitly reports `SUCCESS` unless a panic/`process::exit` intervenes.
- Rust panics bypass `Termination` entirely and always exit **101**, regardless of what `main`'s return type says — this is a fixed runtime constant, not something `Termination` controls.

### 5. `std::process::exit` and why to avoid it

```rust
pub fn exit(code: i32) -> !
```

Per the official docs: this terminates immediately; **no destructors on the current stack or any other thread's stack run** — this is its defining difference from returning from `main`/`Termination`. `atexit`-style handlers *do* still run ([`process::exit` docs](https://doc.rust-lang.org/std/process/fn.exit.html)).

Concretely, this means:

```rust
// Wrong: the tempfile guard's Drop (cleanup) never runs; the temp dir leaks.
fn main() {
    let _guard = TempDirGuard::new();
    if error_condition() {
        std::process::exit(1); // guard.drop() is skipped
    }
}
```

```rust
// Correct: return ExitCode so Drop runs on unwind out of main.
fn main() -> std::process::ExitCode {
    let _guard = TempDirGuard::new();
    if error_condition() {
        return std::process::ExitCode::FAILURE; // guard drops normally
    }
    std::process::ExitCode::SUCCESS
}
```

Two more docs-stated caveats: only the low 8 bits of the `i32` are visible to the parent on Unix (`exit(0x0100)` reports as 0 on Linux but 256 on Windows — a genuine cross-platform trap for a tool that ships Windows binaries), and mixing Rust's `exit()`/return-from-`main` with C code calling `exit`/`quick_exit` concurrently is **undefined behavior** on Unix — directly relevant to OCX/Grimoire's subprocess-execution surface if any FFI or C-linked dependency is involved.

### 6. exitcode / sysexits Rust crates

- **`exitcode`** (crates.io, v1.1.2 lineage) — a thin `pub const OK: i32 = 0; ...` re-export of sysexits.h's 16 constants, meant to be passed to `std::process::exit()` (predates `ExitCode`/`Termination`, i.e. this crate's whole API shape is a pre-1.61 idiom) ([docs.rs/exitcode](https://docs.rs/exitcode/latest/exitcode/)).
- **`sysexits`** / **`sysexits-rs`** — a newer, `#[repr]`-typed enum version of the same constants that implements `Termination` directly, so it composes with `main() -> ExitCode`-style code instead of requiring `process::exit` calls (`sorairolake/sysexits-rs` on GitHub).
- Because `exitcode` predates `ExitCode`, using it today means going back to the `process::exit(exitcode::CONFIG)` pattern and giving up destructor safety — prefer a `Termination`-implementing wrapper (`sysexits-rs`, or a hand-rolled `enum` implementing `Termination`) over the older `exitcode` crate for new code.

### 7. clap's exit codes and overriding them

`clap::Error::exit()` "prints the error and exits. Depending on the error kind, this either prints to stderr and exits with a status of 2, or prints to stdout and exits with a status of 0." `Error::exit_code()` exposes the same logic without terminating: `2` for stderr-class errors (bad args, missing required value, etc.), `0` for stdout-class "errors" (`--help`, `--version`) ([`clap::error::Error` docs](https://docs.rs/clap/latest/clap/error/struct.Error.html)).

This 2-for-usage-errors value is not accidental — clap changed it from 1 to 2 specifically to line up with the getopt/POSIX-utility convention of reserving 2 for usage errors ([clap-rs/clap#1327](https://github.com/clap-rs/clap/issues/1327)).

To override: don't call `Command::get_matches()` (which auto-prints and calls `process::exit` for you); call `try_get_matches()` and handle the `Result<ArgMatches, clap::Error>` yourself, mapping to whatever `ExitCode` your program's contract promises — this is the only supported override path, there is no `Command::exit_code(n)` setter.

```rust
// Wrong: no way to change clap's exit(2) after the fact.
let matches = cli.get_matches(); // panics/exits before you get control

// Correct: intercept and re-map.
let matches = match cli.try_get_matches() {
    Ok(m) => m,
    Err(e) => {
        e.print().ok();
        return std::process::ExitCode::from(64); // e.g. your own EX_USAGE-style code
    }
};
```

### 8. Propagating a child process's exit status

```rust
pub fn code(&self) -> Option<i32>   // ExitStatus
pub fn success(&self) -> bool
```

`code()` returns `None` on Unix specifically when the child was killed by a signal rather than exiting normally — a Rust CLI that shells out to a downloaded tool (very relevant to OCX/Grimoire's "subprocess execution of downloaded tools" surface) and does `std::process::exit(status.code().unwrap())` will **panic** the moment that child dies to SIGKILL/SIGSEGV/etc. ([`ExitStatus` docs](https://doc.rust-lang.org/std/process/struct.ExitStatus.html)).

```rust
// Wrong: panics if the child was killed by a signal (code() is None).
std::process::exit(status.code().unwrap());
```

```rust
// Correct (unix): fall back to 128+signal, matching shell convention.
use std::os::unix::process::ExitStatusExt;
let code = status.code().unwrap_or_else(|| 128 + status.signal().unwrap_or(1));
std::process::exit(code);
```

`ExitStatusExt` (unix-only, `std::os::unix::process`) exposes the raw wait-status bits: `signal() -> Option<i32>`, `core_dumped() -> bool`, `stopped_signal() -> Option<i32>`, `continued() -> bool`, `from_raw(i32)`/`into_raw()` for round-tripping the raw `waitpid` status ([`ExitStatusExt` docs](https://doc.rust-lang.org/std/os/unix/process/trait.ExitStatusExt.html)). On Windows there is no signal concept — `code()` is effectively always `Some` there — so any "propagate child status" logic needs a `#[cfg(unix)]` branch to be correct cross-platform, which matters directly for OCX/Grimoire's stated Linux/macOS/Windows target matrix.

### 9. Signals: SIGINT/SIGTERM handling and correct 130

For a synchronous CLI, the `ctrlc` crate is the standard minimal option: it installs a handler and the idiomatic pattern is a cooperative flag (`Arc<AtomicBool>`) the main loop polls, because signal handlers run in a restricted context where most operations (including allocation) are unsafe — the handler should do the *minimum*, just flip a flag or send on a pre-allocated channel ([rust-cli book: Signal handling](https://github.com/rust-cli/book/blob/master/src/in-depth/signals.md)). For broader Unix signal coverage (SIGHUP, SIGTERM, etc.) the same book recommends `signal-hook` as having "the widest community support."

For an async (tokio) CLI:

```rust
use tokio::signal;

// Simple SIGINT/ctrl-c
signal::ctrl_c().await?;

// Unix-specific signals (SIGTERM, SIGHUP, ...)
use tokio::signal::unix::{signal, SignalKind};
let mut term = signal(SignalKind::terminate())?;
term.recv().await;
```
([`tokio::signal` docs](https://docs.rs/tokio/latest/tokio/signal/index.html)) — requires the `signal` feature flag.

**Why re-raising is the "correct" way to report 130/143, not hard-coding it:** the number 130 is only correct for SIGINT specifically (`128+2`); a program that catches SIGTERM (143), SIGHUP (129), or SIGQUIT (131) for cleanup and then unconditionally exits `130` lies to its parent about which signal actually killed it — this breaks process supervisors (systemd, docker) and shells that branch on the specific signal number. The portable pattern after your cleanup runs is:

```rust
// After cleanup: reinstate default disposition and re-raise, don't hardcode 130.
unsafe {
    libc::signal(libc::SIGINT, libc::SIG_DFL);
    libc::raise(libc::SIGINT);
}
```

or, more simply within std, computing `128 + signal_number` yourself (as in §8) if you already know which signal you caught and re-raising isn't convenient. Either way the point is: derive the code from the *actual* signal received, don't assume SIGINT.

### 10. SIGPIPE and the broken-pipe panic

Rust's libstd has set `SIGPIPE` to `SIG_IGN` before `fn main()` runs since Rust 1.0 (2014). Consequence: writes to a closed pipe return `EPIPE`, which Rust's stdio layer converts to `io::ErrorKind::BrokenPipe` — and macros like `println!`/`writeln!` `.unwrap()` that `Result` internally, so:

```rust
// Panics with "failed printing to stdout: Broken pipe (os error 32)"
// the moment the reader (e.g. `head -n1`) closes the pipe.
fn main() {
    loop {
        println!("hello world");
    }
}
```
This is the classic "Rust program piped into `head` panics" bug, and it's a direct consequence of the SIG_IGN default, documented plainly in the (nightly-only) [Unstable Book's `on-broken-pipe` page](https://doc.rust-lang.org/nightly/unstable-book/compiler-flags/on-broken-pipe.html), which lays out the exact default table:

| Setting | SIGPIPE before `main()` | SIGPIPE before child `exec()` |
|---|---|---|
| *(default, stable, since 1.0)* | `SIG_IGN` | `SIG_DFL` |
| `-Zon-broken-pipe=kill` | `SIG_DFL` (C-like: silent kill) | not touched |
| `-Zon-broken-pipe=error` | `SIG_IGN` (current default, explicit) | not touched |
| `-Zon-broken-pipe=inherit` | untouched | untouched |

**Fixes available on stable Rust today (2026):**
1. The `sigpipe` crate — one call, `sigpipe::reset();` as the first line of `main`, resets SIGPIPE to `SIG_DFL` so the process is silently killed like a C program on a broken pipe (no panic, exit via signal as usual).
2. Handle `io::ErrorKind::BrokenPipe` explicitly at your top-level write call and exit quietly instead of panicking, if you want a specific non-signal exit code rather than a bare kill.
3. `-Zon-broken-pipe=kill`/`error` compiler flags — **nightly-only**, not usable for a distributed release binary.

Stabilization has been attempted twice — first as `#[unix_sigpipe = "sig_dfl"]` (proposed Feb 2024), then, after community pushback about "contaminating" the language with a special main attribute, restarted in May 2024 as the current `-Zon-broken-pipe=...` compiler-flag approach — and as of this research (Aug 2026) the tracking issue [rust-lang/rust#97889](https://github.com/rust-lang/rust/issues/97889) still shows it gated behind `-Z`, i.e. **nightly-only**. Any CLI shipping stable-toolchain release binaries (OCX/Grimoire's case) must use the `sigpipe` crate or manual `BrokenPipe` handling — it cannot rely on a compiler default changing.

### 11. Testing exit codes

- **`assert_cmd`** — the standard integration-test crate: wraps `std::process::Command`, runs the binary under test (`Command::cargo_bin("mytool")`), and asserts on the result — `.assert().success()`, `.assert().failure().code(2)`, plus stdout/stderr predicate matching ([docs.rs/assert_cmd](https://docs.rs/assert_cmd/)).
```rust
use assert_cmd::Command;
Command::cargo_bin("ocx")?
    .arg("install")
    .arg("--bad-flag")
    .assert()
    .failure()
    .code(2); // matches clap's usage-error convention
```
- **`trycmd`** — bulk snapshot testing across many `.toml`/`.md`-embedded CLI invocations at once, good for asserting a whole help/usage surface (and its exit codes) doesn't drift silently ([docs.rs/trycmd](https://docs.rs/trycmd)).
- **`insta-cmd`** — bridges `std::process::Command` into the `insta` snapshot-testing workflow; `assert_cmd_snapshot!(Command::new(...))` snapshots stdout/stderr *and* the exit code together, so a code change shows up as a snapshot diff in review (`docs.rs/insta-cmd`).
- Shell-based CI assertion remains valid and often simplest for a handful of cases: `mytool bad-args; test $? -eq 2` — cheap, no extra crate, but doesn't scale to "assert the whole help text plus code" the way trycmd/insta-cmd do.

### 12. Documenting exit codes

- Traditional Unix man pages carry a dedicated **`EXIT STATUS`** section (`man 1 <tool>` conventionally puts this right after `OPTIONS`/before `SEE ALSO`) — git, curl, and gh all follow this, and curl's is the largest, functioning as its true API contract for scripts.
- `--help` output should at minimum mention where the full list lives (gh's `gh help exit-codes` is a dedicated subcommand precisely so the four-code contract is one command away, not buried in a wall of flag docs).
- For a Rust project, the natural equivalent is a `## Exit codes` (or `## Exit status`) section in the crate's top-level README/docs.rs page, kept in sync with an enum whose variants document the mapping — see §7 for the pattern of implementing `Termination` on a typed enum, which makes the doc comments on that enum double as the exit-code reference.

## Normative guidance candidates

1. **Return `ExitCode` (or a `Result` whose `Ok`/`Err` implement `Termination`) from `main`; never call `std::process::exit` after any `Drop`-bearing value has been constructed on any thread.** Rationale: `exit()` skips all destructors — leaked temp files, unflushed buffers, unreleased locks. Verify: `grep -rn "process::exit" src/` and confirm every hit is either in `main` before any resource acquisition, or in a documented signal-reraise path (§9).
2. **Never `.unwrap()` an `ExitStatus::code()` when propagating a child process's exit code.** Rationale: `code()` is `None` on Unix when the child died to a signal; unwrapping panics exactly when the child crashed hardest. Verify: `grep -rn "\.code()\.unwrap()" src/` — every hit is a bug candidate; correct code falls back to `128 + signal()` on unix (§8).
3. **Pick one small, fixed exit-code vocabulary for the whole binary (e.g. 0/1/2, or a typed enum with ~5–8 variants) and document it in the top-level README under an `## Exit codes` heading; do not invent per-subcommand ad hoc numbers.** Rationale: git/gh/ripgrep all succeed with 2–4 codes total; curl's 50-code scheme only works because it's exhaustively documented — an undocumented large scheme is worse than a small documented one. Verify: code-reading — enumerate every `ExitCode::from(n)` / enum variant in the crate and check each has a doc comment and a README row.
4. **Do not reach for the `exitcode` crate (or raw sysexits.h numbers) as the primary contract on a project that ships Windows binaries.** Rationale: sysexits.h is a Unix/sendmail convention with no Windows meaning, and `exitcode` predates `ExitCode`/`Termination`, forcing back to `process::exit`. Verify: `grep -rn "exitcode::" Cargo.toml src/` — if present, confirm it's a deliberate, documented choice, not a default reach.
5. **`main() -> Result<(), E>`'s error path is only acceptable if `E`'s `Debug` output is actually informative on stderr** (i.e. `E` is `anyhow::Error`, a `thiserror` enum with good messages, or similar) — not a bare unit struct or a raw `String`. Rationale: `Termination`'s blanket impl prints `Debug`, not `Display`; a `#[derive(Debug)] struct Oops;` prints `Error: Oops`, telling the operator nothing. Verify: code-reading the error type returned by `main`; confirm its `Debug` impl (derived or manual) surfaces a real message/chain.
6. **When re-raising a caught signal to report the correct exit status, derive the code from the signal actually received — do not hardcode 130.** Rationale: 130 is only correct for SIGINT; a handler shared across SIGINT/SIGTERM/SIGHUP that always exits 130 misreports which signal killed the process to supervisors. Verify: code-reading the signal-handling module — check the exit/raise call references the *matched* signal, not a literal `130`.
7. **A release-mode CLI that can emit unbounded stdout must explicitly handle `SIGPIPE`/`BrokenPipe` (via the `sigpipe` crate or explicit `ErrorKind::BrokenPipe` handling on the top write call), because stable Rust still ignores `SIGPIPE` by default as of 2026.** Rationale: otherwise piping into `head`/`less`/a broken downstream process crashes with a panic instead of a silent, expected exit. Verify: `grep -rn "sigpipe" Cargo.toml src/`, or code-reading the outermost stdout-writing loop for a `BrokenPipe` match arm; absence of both on a CLI with streaming output is the bug.
8. **Never let `clap`'s default usage-error exit code (2) collide with an application-level meaning for 2 elsewhere in the same binary.** Rationale: clap auto-exits 2 on parse failure unless you intercept via `try_get_matches()`; a custom code 2 defined elsewhere becomes ambiguous to scripts. Verify: enumerate every `ExitCode`/exit-number the binary can produce; confirm 2 (if used elsewhere) isn't reachable except through the clap parse-failure path, or that `try_get_matches()` is used to remap.
9. **Exit codes above 125 are shell/OS territory (126 not-executable, 127 not-found, 128+N signals, 130/143 common) — do not assign application meaning inside 126–255.** Rationale: colliding with these ranges makes shell-level failures indistinguishable from application-level ones in scripts and CI. Verify: enumerate the binary's own `ExitCode::from(n)` call sites; flag any `n >= 126`.
10. **When shelling out to a downloaded/untrusted tool (subprocess execution is a named OCX/Grimoire concern), always branch on unix `signal()` before assuming `code()` is populated, and treat a signal-terminated child as at least as severe as a nonzero exit code, never silently swallowed.** Rationale: crash/kill of a child conveys more risk (segfault, OOM-kill, external SIGKILL) than a clean nonzero return and should propagate distinctly. Verify: code-reading every `Command::output()/status()` call site that inspects a downloaded binary's result; confirm a `None` from `code()` is handled, not defaulted to success.

## AI-agent angle

- **Hallucinated/outdated `process::exit(code) as the default main() pattern.** Models trained heavily on pre-2021 Rust (before `ExitCode`/`Termination` stabilized in 1.61) reflexively write `fn main() { ... std::process::exit(1); }` even in fresh code, silently reintroducing the destructor-skip bug (§5). Mechanical check: `grep -rn "process::exit" src/main.rs src/bin/**/*.rs` — any hit outside a signal-reraise path is suspect; the fix is `fn main() -> ExitCode`.
- **`ExitStatus::code().unwrap()` used to "simply" forward a child's exit code.** This *compiles* and passes on the happy path, so it survives casual review, but panics the first time the downloaded/subprocess tool is killed by a signal in CI or on a flaky machine — exactly the "compiles but wrong" trap named in this task. Mechanical check: `grep -rn "\.code()\.unwrap()"` — flag every hit (§2 above).
- **Assuming SIGPIPE is handled "because Rust is safe."** Models frequently do not know Rust's SIGPIPE default is `SIG_IGN`-before-main (a fact buried in nightly unstable-book docs, not the stable stdlib docs an agent is likely to have absorbed), and will write streaming-output CLIs with zero broken-pipe handling. Mechanical check: does `Cargo.toml` depend on `sigpipe`, or does the top-level print loop match on `ErrorKind::BrokenPipe`? If neither, and the CLI streams unbounded output, this is a live bug (§10).
- **Treating clap's exit(2) as changeable via a config option that doesn't exist.** An agent asked to "make usage errors exit with 64" may hallucinate a `Command::exit_code(64)` builder method that clap has never shipped, rather than correctly intercepting via `try_get_matches()` (§7). Mechanical check: `cargo doc --open -p clap` / `docs.rs` search for the invented method name; if it doesn't resolve, the code won't compile — but agents sometimes "fix" this by wrapping in `#[allow(...)]`-laden shims instead of the real fix, so also grep for suspicious `unsafe`/reflection-like workarounds near clap setup.
- **`main() -> Result<(), String>` (or similar low-information error type) presented as "proper error handling."** It compiles, `Termination` accepts it, and the exit code is technically correct (1) — but the printed message is whatever `Debug` does for a bare `String` (quoted, escaped, no context), which is materially worse than what a hand-written `eprintln!` + `ExitCode::FAILURE` would give a user. Mechanical check: code-reading `main`'s return type — flag bare `String`/`&str`/unit-struct error types with no `Display`/context-carrying `Debug`.
- **Hardcoding `130` in every SIGINT/SIGTERM handler regardless of which signal fired.** Because 130 is the most commonly seen number in tutorials, agents copy it verbatim into shared signal-handling code that's actually reused for SIGTERM too. Mechanical check: code-reading the handler registration — does it register one handler for multiple `SignalKind`s but always exit the same hardcoded number? (§9, rule 6).

## Contested / evolving

- **SIGPIPE default disposition is an active, unresolved language design question.** The 2022–2024 stabilization attempt (`unix_sigpipe` attribute → `-Zon-broken-pipe` flag) has not landed as of this research (Aug 2026); the community debate is whether the *language default* should ever change (breaking the "ignore, convert to `BrokenPipe` error" behavior millions of programs implicitly rely on) versus leaving it opt-in per-crate forever. Current trend: opt-in via the `sigpipe` crate or manual handling remains the only portable stable-Rust answer; do not assume a future compiler version silently fixes this for you ([tracking issue #97889](https://github.com/rust-lang/rust/issues/97889)).
- **Whether sysexits.h is worth using at all in new cross-platform Rust code is genuinely disputed.** One camp (the `exitcode`/`sysexits-rs` crate authors, and BSD-tradition CLI authors) treats it as free, well-known vocabulary worth adopting wholesale; the other camp (evidenced by git, gh, ripgrep, and curl all independently choosing their *own* schemes rather than sysexits.h) treats it as legacy baggage irrelevant outside Unix mail utilities. This research found no real-world large tool from the last decade adopting sysexits.h wholesale as its primary contract — the practical trend favors small custom vocabularies over BSD compliance, but sysexits.h names remain popular as *inspiration* for what buckets to define.
- **`process::exit` vs `ExitCode` guidance is settled in principle but not universally followed in the ecosystem** — `ExitCode`/`Termination` have been stable since 1.61 (2022), yet a large fraction of published crates, tutorials, and (especially) LLM training data still show the pre-1.61 `process::exit`-from-`main` idiom, because it's shorter to write and "obviously correct" for programs with no `Drop` cleanup to worry about. Treat any new CLI code using `process::exit` in `main` as a signal to check whether it predates this convention or has a specific signal-reraise justification.

## Sources

| URL | What it is | Date / era | Why it was worth reading |
|---|---|---|---|
| [doc.rust-lang.org/std/process/struct.ExitCode.html](https://doc.rust-lang.org/std/process/struct.ExitCode.html) | Official Rust std docs | current (1.61+ API) | Primary source for `ExitCode`, `from(u8)`, `SUCCESS`/`FAILURE`, portability caveats |
| [doc.rust-lang.org/std/process/trait.Termination.html](https://doc.rust-lang.org/std/process/trait.Termination.html) | Official Rust std docs | current | Primary source for `main`'s return-type mechanics, `Result<T,E>` behavior |
| [doc.rust-lang.org/std/process/fn.exit.html](https://doc.rust-lang.org/std/process/fn.exit.html) | Official Rust std docs | current | Primary source for why `exit()` skips destructors, 8-bit truncation, UB with C `exit` |
| [doc.rust-lang.org/std/process/struct.ExitStatus.html](https://doc.rust-lang.org/std/process/struct.ExitStatus.html) | Official Rust std docs | current | Primary source for `code()`/`success()` semantics, `None` on signal death |
| [doc.rust-lang.org/std/os/unix/process/trait.ExitStatusExt.html](https://doc.rust-lang.org/std/os/unix/process/trait.ExitStatusExt.html) | Official Rust std docs | current | Primary source for `signal()`, `core_dumped()`, `from_raw`/`into_raw` |
| [doc.rust-lang.org/nightly/unstable-book/compiler-flags/on-broken-pipe.html](https://doc.rust-lang.org/nightly/unstable-book/compiler-flags/on-broken-pipe.html) | Official Rust nightly docs | 2024-era, still nightly in 2026 | Primary source for the SIGPIPE default table and why the broken-pipe panic happens |
| [github.com/rust-lang/rust/issues/97889](https://github.com/rust-lang/rust/issues/97889) | Rust compiler tracking issue | 2022–2026 (ongoing) | Primary source for stabilization history/current status of SIGPIPE handling |
| [www.man7.org/.../sysexits.h.3head.html](https://www.man7.org/linux//man-pages/man3/sysexits.h.3head.html) | Linux man page | BSD origin, current mirror | Primary source for exact sysexits.h constants and values |
| [pubs.opengroup.org POSIX §2.8.2](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html) | POSIX/Single Unix Spec | IEEE Std 1003.1 (current issue) | Primary source: the only three hard-mandated exit status rules |
| [tiswww.case.edu/.../bashref.html](https://tiswww.case.edu/php/chet/bash/bashref.html) | GNU Bash Reference Manual (mirror) | current bash | Primary source for 8-bit truncation and 128+n signal convention |
| [tldp.org/LDP/abs/html/exitcodes.html](https://tldp.org/LDP/abs/html/exitcodes.html) | Advanced Bash-Scripting Guide, Appendix E | long-standing community reference | Widely-cited table of reserved exit code ranges (126–165, 255) and the 64–113 recommendation |
| [git-scm.com/docs/api-error-handling](https://git-scm.com/docs/api-error-handling) | Official Git developer docs | current | Primary source for git's 128 (fatal) / 129 (usage) convention |
| [everything.curl.dev/cmdline/exitcode.html](https://everything.curl.dev/cmdline/exitcode.html) | Official curl project documentation site | current | Primary source for curl's full ~50-code table and its stability philosophy |
| [github.com/BurntSushi/ripgrep/issues/948](https://github.com/BurntSushi/ripgrep/issues/948) | Real project issue tracker (ripgrep) | ongoing | Confirms ripgrep's 0/1/2 scheme deliberately matches GNU grep |
| [cli.github.com/manual/gh_help_exit-codes](https://cli.github.com/manual/gh_help_exit-codes) | Official GitHub CLI docs | current | Primary source for gh's 0/1/2/4 scheme |
| [docs.rs/exitcode/latest/exitcode](https://docs.rs/exitcode/latest/exitcode/) | Crate docs (crates.io ecosystem) | v1.1.2 lineage, pre-`ExitCode` idiom | Confirms exact constant names/values and the crate's pre-1.61 API shape |
| [docs.rs/clap/latest/clap/error/struct.Error.html](https://docs.rs/clap/latest/clap/error/struct.Error.html) | Official clap crate docs | clap 4.x (current) | Primary source for clap's exit(2)/exit(0) split and `exit_code()` |
| [github.com/clap-rs/clap/issues/1327](https://github.com/clap-rs/clap/issues/1327) | Real project issue tracker (clap) | clap 3.x-era change | Documents *why* clap changed usage-error exit code from 1 to 2 |
| [docs.rs/tokio/latest/tokio/signal/index.html](https://docs.rs/tokio/latest/tokio/signal/index.html) | Official tokio crate docs | current tokio (1.x) | Primary source for `ctrl_c()` and unix `SignalKind` async signal handling |
| [github.com/rust-cli/book/blob/master/src/in-depth/signals.md](https://github.com/rust-cli/book/blob/master/src/in-depth/signals.md) | Rust CLI Working Group book (community-maintained reference book) | current | Recommends `ctrlc`/`signal-hook` and the cooperative-flag pattern for sync CLIs |
| [chrisdown.name/2013/11/03/exit-code-best-practises.html](https://chrisdown.name/2013/11/03/exit-code-best-practises.html) | Practitioner blog post | 2013, still widely cited | The canonical "document your codes, don't just cargo-cult sysexits.h" argument |
