---
title: "CLI contract: exit codes, streams, and interface UX"
topic: rust-cli-contract
model: opus
consolidates:
  - rust-cli-contract/exit-codes.md
  - rust-cli-contract/cli-ux-and-output-streams.md
  - ocx-codebase-audit/exit-codes-and-cli.md
  - ocx-codebase-audit/rules-inventory.md
  - ocx-codebase-audit/errors-async-security.md
date: 2026-08
---

# CLI contract: exit codes, streams, and interface UX

## Verdict

1. **The exit-code table is pinned, not re-derived.** OCX already ships a sysexits-derived
   enum across `ocx_cli`, `ocx_lib`, `grim` and `ocx-mirror`, locked by unit tests, a Python
   integration test and a public website table ([audit §1](ocx-codebase-audit/exit-codes-and-cli.md)).
   The conventions research argues no modern tool adopts sysexits wholesale and that it is
   Unix-only ([exit-codes.md §2](rust-cli-contract/exit-codes.md)) — **we overrule that here**:
   its actual normative claim is *"document your codes"*, not *"use sysexits"*
   ([chrisdown.name](https://chrisdown.name/2013/11/03/exit-code-best-practises.html)), and on
   Windows these are just integers with no conflicting meaning. Breaking a shipped, scripted
   contract to satisfy a naming preference is a net loss. **§ The exit-code table below is final.**
2. **Where the two families' names diverge, ocx's win**: 77 is `PermissionDenied`, 81 is
   `PolicyBlocked`. Grimoire's *own rule doc* already says `PermissionDenied` — only its code
   drifted; and `OfflineBlocked` is narrower than the `--frozen`/`VerifyOffline` cases it
   actually covers ([audit §5](ocx-codebase-audit/exit-codes-and-cli.md)).
3. **82 `DirtyRcBlock` is real, shipped, tested and undocumented everywhere.** Document it and
   reserve it workspace-wide so grim can never reuse the number.
4. **The rule text banning trait-based classification is retired.** ocx implements
   `ClassifyExitCode` on 50+ error types and has done so in production; the rule's stated
   rationale (circular dep lib → cli → lib) is void because the trait lives in `ocx_lib::cli`,
   not the binary. Both shapes are sanctioned; what is mandatory is *one* taxonomy per
   workspace and a test locking the fall-through.
5. **grim's JSON error envelope becomes the cross-tool contract, not a grim quirk.**
   `{code, exit, message, reason?, retryable?, forceable?}` on stdout is the only structured
   error format either tool should grow ([audit §4](ocx-codebase-audit/exit-codes-and-cli.md)).
6. **Two mitigations that exist in one tool are now required in both**: ocx's CWE-150 terminal
   sanitization of the error chain, and grim's BrokenPipe→exit-0 short-circuit.
7. Human output first, machine output opt-in and *pure*; `stdout` = result, `stderr` = every
   word about how the result was produced ([clig.dev](https://clig.dev/)).

## The ruleset

### The exit-code table (final, pinned)

Every OCX-family binary returns exactly one of these. Values are `#[repr(u8)]` variants of a
single `ExitCode` enum per workspace.

| Code | Name | Meaning | Status |
|---|---|---|---|
| 0 | `Success` | Success | **Implemented** — ocx, grim, ocx-mirror |
| 1 | `Failure` | Unclassified failure; classification fall-through **only** | **Implemented** |
| 64 | `UsageError` | Bad CLI invocation (incl. every clap parse failure) | **Implemented** |
| 65 | `DataError` | Malformed input data / manifest / lockfile | **Implemented** |
| 69 | `Unavailable` | Registry or resource unreachable, non-retryable | **Implemented** |
| 74 | `IoError` | Filesystem I/O fault | **Implemented** |
| 75 | `TempFail` | Retryable transient failure | **Implemented** |
| 77 | `PermissionDenied` | `EPERM` / insufficient permissions | **Implemented (ocx); newly committed name in grim** — grim code says `NoPermission`, must rename |
| 78 | `ConfigError` | Bad config file or missing field | **Implemented** |
| 79 | `NotFound` | Resource / config path not found | **Implemented** |
| 80 | `AuthError` | Authentication failure | **Implemented** |
| 81 | `PolicyBlocked` | Deliberate `--offline` / `--frozen` / verify-offline refusal (not a fault) | **Implemented (ocx); newly committed name in grim** — grim code says `OfflineBlocked`, must rename |
| 82 | `DirtyRcBlock` | Refused to rewrite a shell-RC block carrying user edits | **Implemented (ocx only); newly committed as reserved workspace-wide** — currently absent from every doc surface |
| 83–99 | *(unassigned)* | Next free slots for new tool-specific codes | **New commitment** — allocate upward from 83 |
| 128+N | *(not ours)* | Forwarded signal status of a **child** process only | **Implemented** (`child_process.rs:35-50`) |

Never claimed, never reused: 2–63, 66–68, 70–73, 76, 100–127, 126–255. Unused sysexits values
(66 `EX_NOINPUT`, 70 `EX_SOFTWARE`, …) stay unclaimed rather than being repurposed with a
different meaning.

### Exit-code rules

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| EXIT-01 | Every process exit value comes from the shared typed `ExitCode` enum; no bare integer literal reaches a process exit. | One source of truth; a magic `3` is undiscoverable to scripts. | `grep -rn "ExitCode::from(\|exit(" src/ crates/` — every hit must be the enum's own `From` impl or `main`. | MUST |
| EXIT-02 | `main` returns `std::process::ExitCode`; `std::process::exit` is forbidden outside `main`'s own return path and a documented signal re-raise. | `exit()` skips **all** destructors on every thread — mid-write exits corrupt lockfiles and leak temp dirs ([std docs](https://doc.rust-lang.org/std/process/fn.exit.html)). | `grep -rn "process::exit" src/ crates/ \| grep -v "fn main"` — every hit is a finding. | MUST |
| EXIT-03 | Parse the CLI with `try_get_matches`/`try_parse`: `--help`/`--version` → 0, every other clap error → 64. Never let clap's default exit(2) escape. | clap exits 2 by default ([clap-rs#1327](https://github.com/clap-rs/clap/issues/1327)); 2 has no meaning in our table and is shell-builtin territory. | Integration test: `<bin> --bogus-flag` asserts code 64; `grep -rn "get_matches()\|::parse()" ` finds un-intercepted call sites. | MUST |
| EXIT-04 | Assign no application meaning to 1, 2, or anything ≥ 100. 1 is reachable only as the classification fall-through. | 126/127/128+N/130/143/255 are shell and OS territory; colliding makes a shell failure indistinguishable from ours ([POSIX §2.8.2](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html), [TLDP App. E](https://tldp.org/LDP/abs/html/exitcodes.html)). | Enumerate the enum's discriminants; any new value outside 0/1/64–99 is a finding. | MUST |
| EXIT-05 | Never `.unwrap()` `ExitStatus::code()`. On unix fall back to `128 + status.signal()`; a signal-killed child never maps to success. | `code()` is `None` when the child died to a signal — the unwrap panics exactly when the downloaded tool crashed hardest ([ExitStatus docs](https://doc.rust-lang.org/std/process/struct.ExitStatus.html)). | `grep -rn "\.code()\.unwrap()\|\.code()\.unwrap_or(0)"` — every hit is a bug. | MUST |
| EXIT-06 | New codes are append-only. A shipped code's number and meaning are never reassigned or recycled, even after the feature is removed. | curl's 50-code scheme works only because retired numbers stay retired ([everything.curl.dev](https://everything.curl.dev/cmdline/exitcode.html)); scripts pin numbers for years. | Review: any diff changing an existing discriminant's value or meaning is a finding. | MUST |
| EXIT-07 | The classification fall-through to `Failure` is locked by a test, and classification matches are exhaustive — no `_ =>` wildcard over a local error enum. | A new error variant must compile-error until it is classified, not silently become exit 1. | Existing: ocx `classify.rs:661`, grim `error.rs:1009`. Require an equivalent for each new error enum. | MUST |
| EXIT-08 | One exit-code taxonomy per workspace. A binary that needs its own must carry an ADR and a doc note naming the carve-out. | Sibling binaries with different tables break shared CI error handling. Current sanctioned carve-out: `ocx_shim` (Windows launcher constraints, ADR-justified). | `grep -rn "enum ExitCode\|ShimError"` — each hit outside the shared enum needs its ADR link. | MUST |
| EXIT-09 | Error→code classification may be a free function *or* a trait (`ClassifyExitCode`); pick one per workspace and do not mix. | ocx's trait dispatch is production-proven and composes through nested wrappers; grim's free-function match fits its single top-level enum. The old "trait causes circular deps" ban is void — the trait lives in the lib crate. | Review: a workspace with both shapes is a finding. | SHOULD |
| EXIT-10 | Every code in the table has (a) a doc comment on the variant, (b) a row in the tool's public docs, and (c) at least one test asserting a real invocation produces it. | An undocumented code is not a contract. 82 shipped for months with none of (b). | `grim`/`ocx` docs table row count == enum variant count; `test_exit_codes.py`-style assertions. | MUST |
| EXIT-11 | If a signal is caught for cleanup, derive the reported status from the signal actually received (re-raise after restoring `SIG_DFL`); never hardcode 130. | 130 is only correct for SIGINT; a shared handler that always exits 130 lies to systemd/docker about SIGTERM. | Review the handler registration: the exit/raise call must reference the matched signal. | SHOULD |

### Stream, output and UX rules

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CLI-01 | The command's result goes to stdout; logs, progress, warnings, prompts and errors go to stderr, unconditionally. | stdout is the pipe consumer's channel; registry progress leaking into `ocx add … > frag.json` corrupts it ([clig.dev](https://clig.dev/)). | `grep -rn "println!\|print!" src/ crates/` — every hit outside result-formatting code is a finding. | MUST |
| CLI-02 | Under `--format json`/`--json`, stdout contains **only** the JSON payload — no banner, no progress, no trailing "done". | One stray line breaks every `\| jq` pipeline silently, and the failure is invisible in manual testing. | Per JSON-capable subcommand: capture stdout in an integration test and `serde_json::from_str` the whole stream. | MUST |
| CLI-03 | Render the error chain exactly once, at the single `main.rs` boundary, and sanitize it before it reaches a terminal. | Error chains quote package/skill names read off wire documents — CWE-150 terminal injection. ocx pins this with `sanitize_for_terminal` + a structural test (`ocx_cli/main.rs:36`, `api/data.rs:164`); grim writes `{err:#}` raw (`grim/main.rs:326`, flagged HIGH in [errors-async-security.md](ocx-codebase-audit/errors-async-security.md)). | `grep -rn "writeln!(io::stderr()\|eprintln!" main.rs` — the boundary write must route through the sanitizer. | MUST |
| CLI-04 | Structured error output is the pinned envelope `{"error": {"code": <slug>, "exit": <int>, "message": …, "reason"?, "retryable"?, "forceable"?}}` on **stdout**, with stable slugs. | Already grim's shipped 1.0 contract (`grim/exit_code.rs:64-79`, `main.rs:220-265`, `docs/src/json-interface.md`); ocx has no structured error doc and must adopt this rather than invent a second shape. | Snapshot test of the envelope per exit code; slug changes are breaking. | MUST |
| CLI-05 | A closed downstream stdout pipe is a clean exit 0, handled once centrally — never a panic and never a propagated error. | Rust sets SIGPIPE to `SIG_IGN` before `main`, so `println!` **panics** on `\| head`; `-Zon-broken-pipe` is still nightly-only in 2026 ([rust-lang/rust#97889](https://github.com/rust-lang/rust/issues/97889)). grim does this (`main.rs:319-320`); ocx does not. | `grep -rn "BrokenPipe\|sigpipe"` — a streaming CLI with neither is a live bug. Test: `<bin> list \| head -1` exits 0, prints no panic. | MUST |
| CLI-06 | Any command that can emit more than a handful of lines writes through a locked `BufWriter` and flushes explicitly. | `io::Stdout` is unconditionally line-buffered even when piped to a file — one syscall per line ([rust-lang/rust#60673](https://github.com/rust-lang/rust/issues/60673)). | Review loops emitting output: `println!` inside an unbounded `for` is a finding. | SHOULD |
| CLI-07 | Colour is decided by `anstream`/`colorchoice` plus an explicit `--color=auto\|always\|never`, per destination stream — never a hand-rolled env check. | Hand-rolled logic reliably misses one of `NO_COLOR` (presence, non-empty), `CLICOLOR=0`, `CLICOLOR_FORCE`, `TERM=dumb`, per-stream TTY ([no-color.org](https://no-color.org/), [gh manual](https://cli.github.com/manual/gh_help_environment)). | `grep -rn "NO_COLOR\|CLICOLOR"` — any hit outside a thin anstream wrapper is a partial reimplementation. | MUST |
| CLI-08 | Progress bars and spinners draw to stderr, and are suppressed when that stream is not a TTY, when `CI` is set, or when a machine-output flag is active. | A bar on stdout corrupts piped output; a bar in CI logs is noise. `indicatif` auto-hides only for the target it was given. | `grep -rn "ProgressDrawTarget::stdout"` — any hit is a finding. | MUST |
| CLI-09 | Never prompt unless `stdin().is_terminal()`, and always ship a non-interactive bypass (`--yes`/`--no-input`). Treat truthy `CI` as non-interactive even on a pseudo-TTY. | A blocking prompt in CI hangs forever with no diagnostic. | Review every `read_line`/`dialoguer` call site for a preceding TTY gate; `is_ci` for the CI check. | MUST |
| CLI-10 | Global flags (`--color`, `--quiet`, `--log-level`, `--format`) live in one `#[derive(Args)]` struct flattened into every subcommand, and the set is identical across OCX-family tools. | Redeclaration drifts. Live asymmetry: ocx has `-q/--quiet`, grim does not (`grim/src/cli/options.rs:60`) — grim must add it. | `grep -rn 'long = "color"\|long, global' ` shows exactly one definition site per flag. | MUST |
| CLI-11 | Never accept a secret through a flag value or a plain env var; use `--password-file`, stdin, or the credential store. | Flag values land in `ps` and shell history; env vars leak via `/proc`, `docker inspect` and CI log dumps — directly the registry-token path ([clig.dev](https://clig.dev/)). | `grep -rn '"password"\|"token"\|"secret"' ` over clap arg definitions. | MUST |
| CLI-12 | A `///` on a clap-facing surface states the user contract and nothing else: ASCII only, short help ≤ ~70 chars, no ADR/section/code-path references, no dates. | PowerShell 5.1 mojibakes non-ASCII captured help; internal references are noise to users. Already enforced in ocx by four gates in `task verify` (`cli_help_text_is_ascii`, `cli_help_text_has_no_internal_references`, `cli_definition_is_valid`, `test_completion_ascii.py`) — grimoire has no equivalent rule or gate. | Run those four tests; grim must gain equivalents. | MUST |
| CLI-13 | Config, cache and data paths come from `directories::ProjectDirs`; every tool env var is prefixed `OCX_`/`GRIM_` and documented next to its flag. | Hand-joined `$HOME/...` breaks XDG on Linux and is simply wrong on Windows/macOS — this tool ships all three ([directories docs](https://docs.rs/directories/latest/directories/)). | `grep -rn 'env::var("HOME")\|dirs::home_dir'` outside the one ProjectDirs call is a finding. | MUST |
| CLI-14 | Shell completions and man pages are generated from the same `clap::Command` used for parsing (`clap_complete`/`clap_mangen`, via xtask), never hand-maintained. | Hand-written completions drift from the arg grammar within a release or two. | A checked-in completion script with no generator in the repo is a finding. | SHOULD |
| CLI-15 | Config-file values are layered in *before* clap parses, so the precedence is flags > env > project config > user config > system config. | `#[arg(env = …)]` covers only flags-vs-env; clap has no config-file source, so an agent that stops there silently drops two precedence tiers ([clig.dev](https://clig.dev/)). | Test: same setting in a project config and an env var — env must win; a flag must beat both. | SHOULD |
| CLI-16 | Print something within ~100 ms of start for any command that does network I/O, and say so when state changes on disk. | Responsiveness beats speed; a silent registry resolve reads as a hang ([clig.dev](https://clig.dev/)). | Manual/behavioural; check for an early status line before the first await on network. | CONSIDER |

## Applied to OCX

**Already satisfied**

- The 0/1/64/65/69/74/75/78/79/80 rows of the table are implemented identically in ocx, grimoire
  and ocx-mirror, with unit tests on both sides — EXIT-01, EXIT-04, EXIT-06 hold
  ([audit §1](ocx-codebase-audit/exit-codes-and-cli.md)).
- EXIT-03: both tools map `DisplayHelp`/`DisplayVersion` → 0 and every other clap error → 64;
  ocx factors it into `ocx_lib/src/cli/clap.rs:31`, grim inlines it at `grim/main.rs:282-285`.
- EXIT-05: `ocx_lib/src/utility/child_process.rs:35-50` and `script/ocx_module.rs:245` already
  compute `128 + signum` for signal-killed children — the only 128+ producer in either codebase,
  and correctly a *forwarded* status.
- EXIT-07: fall-through is test-locked at ocx `classify.rs:661` and grim `error.rs:1009`.
- CLI-01/CLI-03 (ocx side): single stderr boundary at `ocx_cli/src/main.rs:36`, sanitized through
  `api::data::sanitize_for_terminal` with a structural regression test pinning the call.
- CLI-04 (grim side) and CLI-05 (grim side) are already shipped exactly as specified.
- CLI-12 (ocx side): all four `task verify` gates exist.

**Violated**

- **CLI-03 in grimoire** — `grim/main.rs:326` writes `{err:#}` straight to stderr with no
  sanitizer, on error chains that quote registry-sourced package and skill names. Rated HIGH in
  [errors-async-security.md](ocx-codebase-audit/errors-async-security.md); same threat model ocx
  explicitly defends.
- **CLI-05 in ocx** — no `StdoutPipeClosed` equivalent in `ocx_cli/src/main.rs`; `ocx … | head`
  can panic.
- **EXIT-01/EXIT-03 in `ocx_schema`** — `ocx_schema/src/main.rs:15` calls raw `process::exit(1)`
  for an unknown `schema_for()` argument. That is a usage error and must be 64; the binary is
  entirely outside the taxonomy. Code is wrong, not the rule.
- **CLI-10 in grimoire** — no `--quiet` flag on `GlobalOptions` (`grim/src/cli/options.rs:60`).
- **CLI-12 in grimoire** — no `quality-cli-help` rule and no help-text gates at all; the rule
  exists only in ocx.
- **EXIT-10 for code 82** — `DirtyRcBlock` is produced at `self_group/setup.rs:187` and
  `config_setup.rs:145` and unit-tested at `exit_code.rs:158-163`, yet appears in neither rule
  copy nor the public table at `website/.../command-line.md:301-306`.
- **77/81 naming in grimoire** — code says `NoPermission`/`OfflineBlocked`; the pinned names are
  `PermissionDenied`/`PolicyBlocked`. Grimoire's own rule doc already says `PermissionDenied`,
  so this is an internal doc/code mismatch, not just a cross-repo split.

**New commitments**

- EXIT-08 formally sanctions the `ocx_shim` carve-out (`ocx_shim/src/main.rs:13-19`, local
  `ShimError` E1–E8 → 78/77/74/69/74) instead of leaving it a silent violation of the old
  "one enum per workspace" rule.
- EXIT-09 retires the old Block-tier ban on trait-based classification. ocx's
  `ClassifyExitCode` (`ocx_lib/src/cli/classify.rs:44`, ~50 impls) is now the sanctioned shape
  for ocx; grim's free-function `classify()` (`grimoire/src/error.rs:177`) stays sanctioned for
  grim. This was the single largest doc/code divergence the audit found.
- CLI-04 promotes grim's envelope — including `Classification { exit, reason }` and the
  `.slug()` machine string — to a cross-tool contract ocx must adopt for structured errors.
- Codes 83–99 are declared the allocation range for anything new; 82 is reserved workspace-wide.

## AI-agent failure modes

Ranked by how often they bite in this codebase's shape.

1. **`println!` for narration.** Copy-pasting a non-JSON code path into a JSON-capable one and
   forgetting to gate the narration — output looks fine by hand, breaks every `| jq`. The single
   most frequent CLI regression (CLI-01, CLI-02).
2. **`std::process::exit()` from inside business logic** as the reflexive "just terminate here"
   move. Compiles, passes a happy-path test, silently skips `Drop` — for a tool doing atomic
   renames and lockfile writes that means partial state on disk (EXIT-02).
3. **Pre-1.61 `fn main()` + `process::exit(1)`** written into brand-new code, because most
   training data predates `ExitCode`/`Termination` (EXIT-02).
4. **`ExitStatus::code().unwrap()`** to "simply forward" a child's exit code. Survives review,
   panics the first time a downloaded tool is SIGKILLed in CI (EXIT-05).
5. **No BrokenPipe handling at all**, because agents do not know Rust's SIGPIPE default is
   `SIG_IGN`-before-`main` — a fact documented only in the nightly unstable book. Worse, when
   asked to *fix* the resulting panic, agents patch the one call site with `.ok()` instead of
   centralizing (CLI-05).
6. **Hand-rolling `NO_COLOR`.** `if env::var("NO_COLOR").is_ok()` looks trivial and misses
   `CLICOLOR_FORCE`, `TERM=dumb`, per-stream TTY, and the presence-vs-non-empty distinction
   (CLI-07).
7. **`println!` in a hot loop**, unaware that `io::Stdout` is line-buffered even when piped to a
   file (CLI-06).
8. **Bare magic numbers for new exit conditions** (`exit 3` for "network error") instead of the
   enum, or inventing a second success code (EXIT-01, EXIT-04).
9. **Hallucinating `Command::exit_code(64)`** on clap, which has never existed, instead of
   intercepting via `try_get_matches` (EXIT-03).
10. **Hardcoding `130`** in a handler that is also registered for SIGTERM, because 130 is the
    number in every tutorial (EXIT-11).
11. **`main() -> Result<(), String>`** presented as proper error handling — `Termination` prints
    `Debug`, so the operator sees a quoted, escaped, context-free string.
12. **Suggesting `#[unix_sigpipe = "..."]`**, superseded by `-Zon-broken-pipe` and still nightly —
    the code will not compile on the release toolchain.
13. **Assuming `#[arg(env = …)]` also reads the config file.** It does not; the project/user
    config tiers get silently dropped (CLI-15).

## Open questions

1. **Does ocx adopt grim's JSON *error* envelope (CLI-04), or does grim's stay grim-only?** ocx has
   `DataInterface` for command *results* but no structured error document. Adopting it is a new
   public contract on ocx and needs a version/compat decision.
2. **Should `--format json` auto-imply `--no-progress`/`--quiet`?** Every real tool (gh, docker)
   auto-suppresses; a purist reading says flags stay orthogonal. Recommendation is auto-suppress
   with an override, but this is a UX call.
3. **Is `ocx_schema` worth bringing into the taxonomy, or should it be deleted/merged?** Fixing
   `process::exit(1)` → 64 is trivial; the deeper question is whether a fourth binary outside the
   contract should exist at all.
4. **Does grimoire get a `quality-cli-help` rule and the four ASCII/reference gates**, or is that
   scoped to ocx's larger command surface?
5. **Renaming 77/81 in grimoire is a source-compatible change but a doc-visible one.** Is the slug
   in the JSON envelope (`"offline-blocked"`) also renamed — which *is* a breaking change for any
   consumer matching on it — or does the slug stay frozen while the Rust variant renames?

## Sub-artifacts

- [rust-cli-contract/exit-codes.md](rust-cli-contract/exit-codes.md) — POSIX/GNU/sysexits
  conventions, real-tool exit-code tables (git, curl, ripgrep, cargo, gh, docker), Rust
  `ExitCode`/`Termination`/`process::exit` mechanics, child-status propagation, signals, SIGPIPE,
  and exit-code testing.
- [rust-cli-contract/cli-ux-and-output-streams.md](rust-cli-contract/cli-ux-and-output-streams.md) —
  stdout/stderr discipline, `--json`/JSON Lines and schema stability, colour and TTY detection,
  progress and prompting, clap 4 argument design, buffering, and XDG/config precedence.
- [ocx-codebase-audit/exit-codes-and-cli.md](ocx-codebase-audit/exit-codes-and-cli.md) — the
  as-implemented OCX/grim/ocx-mirror exit-code taxonomy, contract bypasses, and the doc/code
  divergences, with file:line evidence.
- [ocx-codebase-audit/rules-inventory.md](ocx-codebase-audit/rules-inventory.md) — the existing
  `quality-rust-exit_codes.md` and `quality-cli-help.md` rule text as currently shipped.
- [ocx-codebase-audit/errors-async-security.md](ocx-codebase-audit/errors-async-security.md) —
  the error-boundary comparison, including the HIGH CWE-150 finding on grim's unsanitized stderr.

## Key sources

| URL | Why |
|---|---|
| [clig.dev](https://clig.dev/) | The densest checkable CLI spec: stream routing, colour, prompting, config precedence, secrets |
| [std::process::ExitCode](https://doc.rust-lang.org/std/process/struct.ExitCode.html) | `SUCCESS`/`FAILURE`, `from(u8)`, portability caveats |
| [std::process::Termination](https://doc.rust-lang.org/std/process/trait.Termination.html) | `main`'s return-type mechanics; why `Err` prints `Debug` |
| [std::process::exit](https://doc.rust-lang.org/std/process/fn.exit.html) | Destructor skipping, 8-bit truncation, UB with C `exit` |
| [std::process::ExitStatus](https://doc.rust-lang.org/std/process/struct.ExitStatus.html) | `code()` returns `None` on signal death |
| [Unstable Book — on-broken-pipe](https://doc.rust-lang.org/nightly/unstable-book/compiler-flags/on-broken-pipe.html) | The exact SIGPIPE default table behind the `\| head` panic |
| [rust-lang/rust#97889](https://github.com/rust-lang/rust/issues/97889) | SIGPIPE stabilization still nightly-only in 2026 |
| [rust-lang/rust#60673](https://github.com/rust-lang/rust/issues/60673) | `io::Stdout` unconditional line-buffering, with the libstd `FIXME` |
| [POSIX §2.8.2 exit status](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html) | The only three hard-mandated exit rules; the >128 signal rule |
| [sysexits.h(3head)](https://www.man7.org/linux//man-pages/man3/sysexits.h.3head.html) | Exact constant names/values for 64–78 |
| [chrisdown.name — exit code best practices](https://chrisdown.name/2013/11/03/exit-code-best-practises.html) | The "document your codes" argument that decides Verdict §1 |
| [everything.curl.dev — exit code](https://everything.curl.dev/cmdline/exitcode.html) | The never-recycle-a-number discipline behind EXIT-06 |
| [clap Error docs](https://docs.rs/clap/latest/clap/error/struct.Error.html) + [clap-rs#1327](https://github.com/clap-rs/clap/issues/1327) | clap's exit(2)/exit(0) split and why it must be intercepted |
| [no-color.org](https://no-color.org/) | Quotable NO_COLOR contract |
| [gh manual — environment](https://cli.github.com/manual/gh_help_environment) | Reference implementation of the full colour/TTY precedence stack |
| [jsonlines.org](https://jsonlines.org/) | Line-termination/encoding rules for streaming JSON |
| [directories crate](https://docs.rs/directories/latest/directories/) | XDG / Known Folders / macOS Standard Directories mapping |
