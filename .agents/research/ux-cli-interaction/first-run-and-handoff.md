---
title: "CLI first run and handoff: what an installer and a CLI owe a new user from install to first success"
program: product
sub_program: ux
topic: ux-cli-interaction
worker: first-run-and-handoff
date_researched: 2026-11-27
model: sonnet
sources_fetched: 21
---

# CLI first run and handoff

Scope. Covers the last lines an installer prints, what a CLI prints when run with no config or project, what a first command should teach, and how to budget and measure time to first success. Does not cover docs quickstarts (docs-quality), marketing install pages (marketing), or the pinned stream, colour, prompt and exit-code contracts (cited only where a measurement touched them).

Method. Six installers were run in a clean container, one fresh container per run: `docker run --rm rl-firstrun bash -c '<documented install command>'`. The image is `debian:stable-slim` with `curl ca-certificates unzip xz-utils` and a non-root user, built from `~/.cache/research-lang/exemplars/product/first-run/Dockerfile`. Timing uses `date +%s.%N` before and after the command. All runs are 2026-11-27 from one residential WSL2 host, so seconds are network-dependent; treat them as ratios and order of magnitude, not budgets. Raw output is in `~/.cache/research-lang/exemplars/product/first-run/*.txt`. Installer versions at run time: ocx 0.6.8, grim 0.17.0 (the grounding audit saw 0.16.0), uv from astral.sh, rustc 1.100.0, deno 2.9.8, bun 1.4.5, gh 2.106.0 (release tarball, not apt).

## Contents

1. Summary
2. Findings
3. Normative guidance candidates
4. Dated facts
5. What an agent must not decide alone
6. AI-agent angle
7. Contested / evolving
8. Sources

## 1. Summary

- No fetched authority defines a first-run standard. clig.dev says "Suggest commands the user should run" and "If you change state, tell the user", but it has no section on first run or on installers' last lines ([clig.dev](https://clig.dev/), no date on the page).
- Measured, six installers end on three different things: a verify command (ocx, bun, deno), a PATH-activation `source` line (uv, grim, rustup), or nothing useful (rustup ends on two `warn:` lines when no C linker exists). None ends on a command that does useful work.
- The documented install pages of uv, rustup.rs, deno and bun differ on the same point: uv gives no verify command; rustup.rs says only "follow the onscreen instructions"; deno and bun document `deno --version` and `bun --version` plus "open a new terminal".
- grim's own installer ends with "To add $HOME/.cargo/bin to your PATH, either restart your shell or run: source $HOME/.cargo/env" and no first command. The grim docs page starts with a different product's installer (ocx), which costs 7.2 s and two commands against 0.7-1.3 s and one command for the direct installer.
- ocx is the slowest installer measured (4.4-5.8 s, three runs) because its installer runs `ocx self setup`, which pulls the CLI as a package. It is also the only one that edits four shell profiles and writes a systemd session file; it prints all of that on stderr in a 36-line block.
- Every installer measured requires a shell restart or `source` before the tool is on PATH. The first command in a fresh shell works in 4-100 ms for `--version`.
- With no config, ocx and grim both exit with an error; ocx names the fix (`run ocx init to create one`), grim does not (`/home/u: no grimoire.toml found by walking up from the working directory`, exit 79). gh's no-credential output is the model: `To get started with GitHub CLI, please run:  gh auth login`.
- Every exemplar tested with no project (uv, cargo, bun, gh) names the missing file; only bun and gh also name the next command (`bun init`, `gh auth login`). uv, cargo and deno do not.
- `grim add` in a directory with no AI-client marker succeeds but prints an ANSI-coloured WARN log line (with piped stdout, `^[[2m` and `^[[33m` present) saying the skill went to a pool most clients do not read. It is a warning on a success path, with no next command.
- Clock definitions for "time to hello world" are vendor-defined and disagree on start and stop; no independent benchmark with numbers was found. A budget has to be set per product and measured by script.
- A checkable budget is better stated in commands than seconds: count commands from the documented install line to the first output that does the product's job. Measured: ocx 2 (install, exec), grim direct 2 (install, `grim init`) plus `grim add` for a result, uv 2, bun 2, deno 2, rustup 2.

## 2. Findings

### 2.1 What the authorities say

clig.dev has no first-run, onboarding, empty-state or installer chapter. The relevant lines, fetched 2026-11-27 ([clig.dev](https://clig.dev/)): "Suggest commands the user should run"; "suggesting to the user commands they can run next helps them learn how to use your program"; "Lead with examples"; "If you change state, tell the user"; "Print something to the user in <100ms"; "Display output on success, but keep it brief"; "If possible, distribute as a single binary"; "Make it easy to uninstall". On analytics only: "clearly tell users about it on your website or first run". The page shows no date.

Atlassian's ten Forge CLI principles (published 2020-07-23, vendor guidance from a CLI vendor) include "Suggest the next best step": "suggesting the next best step users should take at the end of each command" and "Craft human-readable error messages" with "suggestions for how to fix it" ([Atlassian](https://www.atlassian.com/blog/it-teams/10-design-principles-for-delightful-clis)). It has no principle on first run or installers; the nearest is "prompt the user to enter any outstanding information" instead of throwing an error.

Heroku's CLI style guide (updated 2025-01-31) says prompts must be bypassable: "Ensure that args or flags can always be provided to bypass the prompt" ([Heroku](https://devcenter.heroku.com/articles/cli-style-guide)). It has nothing on first run.

So the rule set in section 3 is mostly derived from measurement plus two generic authority lines (suggest next commands, tell the user about state changes), not from a first-run standard. That gap is stated, not hidden.

### 2.2 Installer final lines, measured

Command per row: `docker run --rm rl-firstrun bash -c '<install command> | tail -8'`. Shown: the last lines of the installer's combined output, 2026-11-27.

| Installer (documented command) | Last meaningful lines | Names a first command? | Command is useful, not only a check? | Activation shown |
|---|---|---|---|---|
| ocx `curl -fsSL https://setup.ocx.sh/sh \| sh` | `ocx 0.6.8 installed successfully!` / `Restart your shell, then verify with:` / `ocx about` / uninstall block `rm -rf /home/u/.ocx` | yes, `ocx about` | no, it prints version, registry, platform, shell, home | "Restart your shell" (no command) |
| grim `curl -fsSL https://setup.grimoire.rs/sh \| sh` | `everything's installed!` / `To add $HOME/.cargo/bin to your PATH, either restart your shell or run:` / `source $HOME/.cargo/env (sh, bash, zsh)` / `source $HOME/.cargo/env.fish (fish)` | no | n/a | `source` line |
| uv `curl -LsSf https://astral.sh/uv/install.sh \| sh` | `everything's installed!` / same `source $HOME/.local/bin/env` pair | no | n/a | `source` line |
| rustup `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh -s -- -y` | `Rust is installed now. Great!` / `To get started you may need to restart your current shell.` ... `. "$HOME/.cargo/env"` / then `warn: no default linker (cc) was found in your PATH` and `warn: many Rust crates require a system C toolchain to build` as the last two lines | no | n/a | `.` line, but not last |
| deno `curl -fsSL https://deno.land/install.sh \| sh -s -- -y` | `Deno was added to the PATH.` / `You may need to restart your shell for it to become available.` / `Run '/home/u/.deno/bin/deno --help' to get started` / `Stuck? Join our Discord https://discord.gg/deno` | yes, `deno --help` (absolute path, works before PATH is live) | no, help text | restart note |
| bun `curl -fsSL https://bun.com/install \| bash` | `Manually add the directory to ~/.bashrc (or similar): export BUN_INSTALL=... export PATH=...` / `To get started, run:` / `bun --help` | yes, `bun --help` | no | manual export lines |

Observations from the table (all measured, 2026-11-27):

1. Only deno's first command works before PATH is live, because it prints the absolute path. ocx, bun and grim need a shell restart or `source` first. In a fresh shell, `ocx --help`, `grim --help` and `bun --help` print in 4-45 ms (`t grim --version` 3.9 ms; `bun --version` 7.8 ms; `ocx --help` 43 ms in `ocx.txt` and `grim-nocfg.txt`).
2. No installer prints a command that does the product's job. The closest are `ocx package exec nodejs/node:24 -- node --version` (docs only) and `grim init` (docs only).
3. rustup, with no C linker present, ends its output on two `warn:` lines. Anything an agent greps for as "the last line" there is a warning about a toolchain prerequisite, not a next step.
4. The ocx installer's own stderr is 36 lines (`docker run ... 2>/tmp/e; wc -l </tmp/e`), including raw `pulling count=1` and `Downloading layer sha256:... to /home/u/.ocx/temp/...` progress lines from the bootstrap and a table of five shim files and four profile edits. The final "installed successfully" block sits below this and is the only part addressed to a human.
5. The grounding audit's installer table recorded the ocx success text and no "verify with" for grim; both are confirmed unchanged at ocx 0.6.8 and grim 0.17.0.

The grim install page tells the reader to install ocx first, then `ocx --global add grimoire/cli`, with the direct `setup.grimoire.rs` installer third ([site-shape audit, `product-audit/site-shape.md` lines 159 and 246](../product-audit/site-shape.md)). Measured: ocx installer then `ocx --global add grimoire/cli` takes 7.2 s and the second command prints `pulling count=1`, the trust-policy line, a layer download line and a two-row table; the direct grim installer takes 0.7-1.3 s (three runs: 1.3, 0.7, 1.3). The ocx route gives grim 0.17.0 either way. The direct route is shorter, but each route ends with no first grim command printed.

### 2.3 Installer timings, three runs each

Command: `s=$(date +%s.%N); <install> >/dev/null 2>&1; e=$(date +%s.%N)`, fresh container each, seconds (file `timing3.txt`).

| Product | Run 1 | Run 2 | Run 3 | Notes |
|---|---|---|---|---|
| ocx | 5.8 | 5.5 | 4.4 | pulls the CLI as an OCI package and writes shims for 5 shells |
| grim (direct) | 1.3 | 0.7 | 1.3 | cargo-dist installer |
| uv | 1.0 | 1.4 | 0.8 | |
| deno | 2.6 | 3.9 | 4.0 | |
| bun | 1.9 | 1.5 | 1.6 | |
| rustup (`-y`, one run) | 16.5 | | | downloads toolchain; first run also 15.5 s for ocx (cold) |

An `-y` flag was needed for rustup and deno because a piped installer cannot prompt without a tty; the documented rustup.rs command has no `-y`, so a human gets prompts and the number above is the unattended path.

### 2.4 First useful output

| Product | Command | Wall seconds | stdout | stderr noise before the result |
|---|---|---|---|---|
| ocx | `ocx package exec nodejs/node:24 -- node --version` after install | 6.3 | `v24.22.3` | 3 stderr lines: `Package ... not found locally, pulling.`, the trust-policy line, `Downloading layer sha256:... to /home/u/.ocx/temp/...` |
| grim | `grim init` then `grim add ghcr.io/grimoire-rs/skills/grim-usage` | 3.0 | table with `created`, then `added` | one ANSI-coloured WARN log line (no AI client detected) |
| gh | `gh pr list` with no credentials | 0.04 | none | `To get started with GitHub CLI, please run:  gh auth login` exit 4 |
| uv | `uv run x.py` with no project | 1.15 | none | downloads CPython 3.15.2 (36.5 MiB) then `error: Failed to spawn: x.py` exit 2 |
| deno | `deno eval "console.log(1+1)"` after install | 0.04 | `2` | none |
| bun | `bun -e "console.log(1+1)"` after install | 0.008 | `2` | none |
| rustup | `cargo new hello -q && cargo run -q` after install | 0.20 | none, exit 101 | `error: linker `cc` not found`, `could not compile `hello``; the installer had already warned (`warn: no default linker (`cc`) was found`) |
| rustup | `rustc --version` after install | 0.016 | `rustc 1.100.0 (0ef1bc386 2026-11-09)` | none |

Command for the deno, bun and rustup rows: `~/.cache/research-lang/exemplars/product/first-run/run.sh <name> '<documented install command>' '<first command>'`, fresh container each, 2026-11-27, raw output in `first-success-2.txt`. "First useful output" is the first output that does a job of the product (run code, build code), not `--help`; the job commands are this document's choice and are a judgment (see section 5). End to end from the installer's first byte to first job output, one run each: deno 2.7 + 0.04 = 2.7 s, bun 1.8 + 0.008 = 1.8 s, rustup 12.6 s to a toolchain, then a build that fails on a clean image for lack of a C linker; `rustc --version` succeeds. ocx 4.4-5.8 s install + 6.3 s exec = about 11 s; grim 0.7-1.3 s install + 3.0 s = about 4 s (one run each for the job step). In every case the job command ran with the activation done by the harness; a human also pays one shell restart. Install seconds differ from 2.3 because each row is a separate run (deno 2.6-4.0 in 2.3, 2.7 here; first-pass deno run also took 6.8 s); the order of magnitude is stable, the digits are not.

The ocx first run prints the trust-policy line `no trust policy covers 'ocx.sh/nodejs/node'; installing ... without signature verification` with no level prefix on every unsigned install; it is a security-relevant statement in the same visual weight as progress.

### 2.5 Empty-config and no-project output, measured

Command shape: `<tool> <verb> </dev/null` in an empty directory under a clean `HOME`, 2026-11-27 (`grim-nocfg.txt`, `exemplars-nocfg.txt`).

| Tool and command | Exit | Message (first line) | Names the next command? |
|---|---|---|---|
| ocx `env` | 64 (measured: `cd /tmp/e && ocx env; echo $?` in a fresh container, `ocx-env-rc.txt`) | ``error: no ocx.toml found in /tmp/e or any parent; run `ocx init` to create one`` | yes |
| grim `status`, `context`, `install`, `lock`, `add foo` | 79 | `/home/u: no grimoire.toml found by walking up from the working directory` | no |
| grim (bare) | 0 | full help, 86 lines in long form | commands listed in lifecycle order (`init`, `lock`, `install`) |
| uv `sync` | 2 | ``error: No `pyproject.toml` found in current directory or any parent directory`` | no |
| cargo `build` | 101 | ``error: could not find `Cargo.toml` in `/home/u/w` or any parent directory`` | no |
| deno `run x.ts` | 1 | `error: Module not found "file:///home/u/w/x.ts".` | no |
| bun `install` | 1 | `error: Bun could not find a package.json file to install from` then `note: Run "bun init" to initialize a project` | yes |
| gh `pr list` / `repo view` / `auth status` | 4 / 4 / 1 | `To get started with GitHub CLI, please run:  gh auth login` plus the `GH_TOKEN` alternative; `You are not logged into any GitHub hosts. To log in, run: gh auth login` | yes |

Three of eight rows name the fix. Both fleet CLIs also differ: the ocx message is the shape to copy; the grim message is the one to change. Exit codes are the pinned contract and are not re-decided here.

A separate measured fault on the same path: with stdout piped, grim's WARN line carries ANSI codes (`^[[2m2026-11-27T12:26:07Z^[[0m ^[[33m WARN`) and `--color never` did not remove them in the grounding audit; deno's `error:` line also carried `^[[0m^[[1m^[[31m` when stderr was redirected to a file in this run. NO_COLOR is the documented opt-out ([no-color.org](https://no-color.org/), page updated 2026-11-25, informal proposal from 2017). Colour is pinned elsewhere; this is a cross-reference only.

### 2.6 What gh models

gh is the one CLI measured that treats "no credentials" as a first-run state: the message states the single next command and the non-interactive alternative, and exits non-zero (4) without prompting when stdin is not a terminal. Its docs split interactive and headless paths: `gh auth login` starts interactive setup, `--with-token` reads from stdin, and `GH_TOKEN` is "most suitable for 'headless' use of gh such as in automation" ([gh auth login](https://cli.github.com/manual/gh_auth_login)); `GH_PROMPT_DISABLED` disables prompting, `GH_NO_UPDATE_NOTIFIER` disables update notices, `GH_FORCE_TTY` forces terminal-style output ([gh environment](https://cli.github.com/manual/gh_help_environment)).

### 2.7 Next-step lines after state-changing commands

`grim init` prints one table row (`created`) and nothing more; `grim add` prints a table with `added` and no line saying that `grim install` or the next verb follows. ocx `add` and `pull` print tables with no next-step line (grounding audit, section 3). clig.dev's "If you change state, tell the user" is met by the table; "Suggest commands the user should run" is not. Homebrew's caveats mechanism is the established precedent for post-install text: it is for "specific issues with the Homebrew packaging", not for marketing or general next steps ([Homebrew Formula Cookbook](https://docs.brew.sh/Formula-Cookbook)). So the installer's last block should be short and operational.

### 2.8 Time to first success

"Time to hello world" has no independent definition. Instruqt's glossary: "the time it takes for a developer to set up and run their first successful command, application, or project", with no formula and no numeric target, and no date; the page is vendor material from a lab-software company ([Instruqt](https://instruqt.com/glossary/time-to-hello-world)). A search for definitions returned vendor blogs that disagree on start (sign-up, docs landing, first interaction) and stop (first successful command, first API response); that result is a search listing, not a fetched source, and the one vendor post that has numbers, [Fern (July 2026 in its title)](https://buildwithfern.com/post/reduce-time-to-hello-world-enterprise-partners.md), was fetched in the repair pass: it defines TTHW as docs landing to first successful API call and states "under two minutes ... top tier" and "over ten minutes" as friction, citing no data for either; it is an API metric from a vendor that sells onboarding work. No numeric benchmark with a stated basis was found, so any seconds figure is this project's own.

Consequence: define start as "the user copies the documented install command" and stop as "the first output that does the product's own job, run from a fresh shell", count commands and seconds separately, and record both with the command that produced them.

### 2.9 Fleet baseline for the budget

Using the fleet's own measurements (grounding audit `cli-first-run.md` section 1 and the runs above):

| Path | Commands | Installer seconds | First useful result seconds | Reading words before first command |
|---|---|---|---|---|
| ocx README | 3 (install, `ocx package install`, `ocx package exec`) | 4.4-5.8 | 6.3 (exec path, includes pull) | 97 |
| grim README | 3 (install, `grim init`, `grim add`) | 0.7-1.3 | 3.0 | 257 |
| ocx site tutorial | 2 before first output | | | 1363 (5.7 minutes at 238 wpm) |
| grim site quickstart | 12 command lines in 9 shell blocks | | | 1932 (8.1 minutes) |

Reading rate 238 wpm for adult silent non-fiction reading in English: Brysbaert, "How many words do we read per minute? A review and meta-analysis of reading rate", Journal of Memory and Language 109 (2019), article 104047, 190 studies, 18,573 participants in the journal version, 260 wpm for fiction, 183 wpm oral ([bibbase record quoting the abstract](https://bibbase.org/network/publication/brysbaert-howmanywordsdowereadperminuteareviewandmetaanalysisofreadingrate-2019), read 2026-11-27; the preprint release is dated 2019-06-13 in [BPS Research Digest](https://www.bps.org.uk/research-digest/most-comprehensive-review-date-finds-average-persons-reading-speed-slower), which reports 238 wpm for 190 studies and 17,887 participants). The publisher page (sciencedirect, doi 10.1016/j.jml.2019.104047) returned HTTP 403, so the journal text itself was not read; the figure rests on the abstract as quoted by the bibliographic record and the preprint coverage.

### 2.10 What belongs where

`installer-script` today (406 lines, measured 2026-10-11) is about integrity, truncation, downloader probes, platform detection, prompts, PATH edits and exit codes; its step 9 covers editing PATH only "with consent and an opt-out flag". It has no row on what the installer's last lines say: `grep -n -iE "final|last line|next|first command" skills/installer-script/SKILL.md` finds nothing about final output (only the template's `say "restart your shell or log in again to pick up PATH"` at `references/install-template.sh:275` and `installed $APP $VERSION to $_dir/$APP` at `:326`). So the installer half is a gap in an existing skill, and the empty-config half is a new thing for the new CLI reference.

## 3. Normative guidance candidates

IDs are working labels (`CLI-FR-n`), to be renumbered by the consolidator.

1. CLI-FR-1 (MUST, installer-script). The installer's last non-blank line of success output is one runnable command that works in the shell the user is in. Rationale: the last line is the only line a skimming user reads after a 20-40 line install, and the table in 2.2 shows no installer does this. VERIFY: run the installer in a clean container with a pseudo-terminal off, capture stderr, then `tail -n 1 | grep -E '^\s*[a-z$./~][^ ]*( |$)'` and run that line in `bash -c` after sourcing the activation line; it must exit 0 and print to stdout. Pass: last line `  ocx init`. Fail: `Stuck? Join our Discord https://discord.gg/deno`, or `warn: no default linker (cc) was found in your PATH`.
2. CLI-FR-2 (MUST, installer-script). Print any PATH activation as one line before the first-command line, never after. If the first command needs PATH, either prefix it (`. "$HOME/.ocx/env.sh" && ocx init`) or print the first command by absolute path as deno does (`Run '/home/u/.deno/bin/deno --help'`). Rationale: a first command that fails with `command not found` is the worst first impression; in 2.2 only deno's printed first command (absolute path) works before PATH is live, and the other five (ocx, grim, uv, rustup, bun) need a restart or `source` first. VERIFY: after the installer, in the same container with `PATH` unchanged, run the printed first command verbatim; exit 0.
3. CLI-FR-3 (MUST, installer-script). The final block names the first command that does the product's job, not only `--help` or `--version`, unless the product has no offline job; say what it does in five words or fewer. Rationale: 2.2 shows ocx names `ocx about` (version, registry, home) and deno/bun name `--help`; a verify command proves the install, a job command proves the value. VERIFY: reading heuristic with pass/fail: Pass `Next: grim init   create grimoire.toml here`; Fail `bun --help`.
4. CLI-FR-4 (SHOULD, installer-script). No `warn:` or error line after the first-command line. Print prerequisite warnings (rustup's missing linker) before the final block. Rationale: rustup's own last two lines are warnings in the C-linker-less case in 2.2. VERIFY: `tail -n 3 <installer stderr> | grep -ciE '^(warn|error|warning)'` equals 0.
5. CLI-FR-5 (SHOULD, installer-script). Installer messages go to stderr; stdout stays empty unless an explicit print flag is set; low-level progress (`pulling count=1`, layer paths) is suppressed unless `--verbose`. Rationale: the ocx installer's 36 stderr lines contain raw `Downloading layer sha256:...` lines; stdout-silent is already ocx practice (`install.sh:27-29`). VERIFY: `sh install.sh 2>/dev/null | wc -c` prints 0; `sh install.sh 2>&1 | grep -c 'sha256:'` is 0 outside a `--verbose` run.
6. CLI-FR-6 (SHOULD, installer-script). A second run prints the same first-command block, not only "already installed". Rationale: the ocx re-run line `ocx vX already installed at ... (set OCX_INSTALL_FORCE=1 to reinstall)` (grounding audit, section 5) leaves a returning user at the same dead end. VERIFY: run twice in one container; compare `tail -n 3` of both runs.
7. CLI-FR-7 (MUST, new CLI reference). With no config or project file, a command that needs one prints to stderr: what was not found, where it looked, and the exact command that creates it, in one sentence, and exits with the pinned not-found code. Rationale: 2.5, three of eight tools do; grim, uv, cargo, deno do not. VERIFY: in an empty temp dir run every project-scoped subcommand of the CLI under test (`<cli> <verb> </dev/null 2>&1`); `grep -E "run \`?<cli> init|<cli> init"` matches, e.g. via a loop over `<cli> --help` verb list. Pass: ocx's `no ocx.toml found in /home/u or any parent; run ocx init to create one`. Fail: `/home/u: no grimoire.toml found by walking up from the working directory`.
8. CLI-FR-8 (MUST, new CLI reference). The suggested command in CLI-FR-7 must exist and run. Rationale: the grounding audit's row 4 shows ocx telling the user to `run ocx install ...`, which is not a command. VERIFY: extract the backticked command from the error, run it with `--help`; exit 0.
9. CLI-FR-9 (SHOULD, new CLI reference). Running the bare binary with no arguments prints concise help with the first-run commands first, exit 0. Rationale: clig.dev "display concise help text" and "Lead with examples"; grim already puts `init`, `lock`, `install` first, ocx lists `env`, `add`, `clean`, with `exec` at row 18 of 23 (grounding audit, section 2). VERIFY: `<cli> 2>&1 | awk '/Commands:/{f=1;next} f&&NF{print NR": "$1}' | head -5` must include the verbs the quickstart uses within the first five rows.
10. CLI-FR-10 (SHOULD, new CLI reference). A command that changes state ends with one line naming the next command, only when a single next step is dominant (`grim init` then `grim add <ref>`). Rationale: clig.dev "Suggest commands the user should run", Atlassian "Suggest the next best step" (2020). VERIFY: in a clean temp dir run each state-changing verb; `tail -n 1` on stderr is `next:`-prefixed or absent only for a documented reason; the named command runs with `--help`.
11. CLI-FR-11 (MUST, new CLI reference). A success path that produces a WARN-level condition the user must act on prints it as a result row or an unprefixed human line, not a timestamped log line, and respects NO_COLOR when stdout or stderr is piped. Rationale: 2.5, grim's WARN line with ANSI codes and a timestamp. VERIFY: `NO_COLOR=1 <cli> add <ref> 2>&1 | cat -v | grep -c '\^\[\['` equals 0 and `<cli> add <ref> 2>&1 | grep -cE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'` equals 0.
12. CLI-FR-12 (SHOULD, new CLI reference). Security-relevant lines (unsigned install) carry a level prefix (`warning:`) and are printed once, not per package. Rationale: ocx's trust-policy line is unprefixed. VERIFY: `ocx package install <ref> 2>&1 | grep -n 'without signature verification'` line starts with `warning:`.
13. CLI-FR-13 (SHOULD, shared). Every interactive first-run prompt has a flag or environment bypass and a non-tty default, and the non-tty message names the bypass (gh: `GH_TOKEN`, `--with-token`, `GH_PROMPT_DISABLED`). Rationale: Heroku (2025-01-31) and gh. VERIFY: run the first-run command with `</dev/null`; it exits non-zero within 2 seconds without hanging, and its message contains `--` or an `ALL_CAPS` env name.
14. CLI-FR-14 (MUST, new CLI reference). Every CLI ships a first-run script in its repo that measures time to first success, in the form of the container command from this document, and CI runs it on each release. Rationale: the numbers in 2.3 move with network, so only a script gives a trend. VERIFY: file exists (`ls scripts/first-run.sh` or equivalent) and the CI step is green; it prints three numbers: install seconds, commands counted, first-result seconds.
15. CLI-FR-15 (SHOULD, shared). Budget. Commands from documented install line to first job output: at most 3, counting the installer, a required activation, and one command. Local, no-network commands (`--version`, `--help`, empty-config error): under 100 ms measured, per clig.dev. The installer itself: record seconds in CI, do not hard-fail on a number; fail CI if it grows more than 2x against the previous release's median of three. Rationale: 2.8, no independent seconds benchmark; commands and ratios are stable, seconds are not. VERIFY: the CLI-FR-14 script output; `awk` compare against a stored baseline.
16. CLI-FR-16 (CONSIDER, installer-script). Offer a `--print-next` or `*_INSTALL_PRINT_NEXT` hatch that prints only the first command to stdout, so wrappers (devcontainers, Dockerfiles, CI) can chain it. Rationale: the ocx installer already has `OCX_INSTALL_PRINT_PATH` for stdout. VERIFY: `sh install.sh --print-next 2>/dev/null` prints one line.

Split decided. `installer-script` gets CLI-FR-1 to 6 and 16 (the installer's final block, ordering, stream, re-run) as new rows in its SH-INST range and a kit check (`tail` of stderr runs the printed command). The new CLI reference gets CLI-FR-7 to 12 and 14 (empty config, bare invocation, next-step line, warning shape). CLI-FR-13 and CLI-FR-15 are shared and belong in the CLI reference with a cross-link from the skill.

## 4. Dated facts

| Fact | Source | Source's date | Kind |
|---|---|---|---|
| "Suggest commands the user should run"; "If you change state, tell the user"; "Print something to the user in <100ms"; "Lead with examples" | [clig.dev](https://clig.dev/) | none on page, fetched 2026-11-27 | guideline from the authors of CLI Guidelines |
| Ten principles incl. "Suggest the next best step" | [Atlassian blog](https://www.atlassian.com/blog/it-teams/10-design-principles-for-delightful-clis) | 2020-07-23 | vendor guidance |
| Prompts must be bypassable by args or flags | [Heroku CLI style guide](https://devcenter.heroku.com/articles/cli-style-guide) | "Last updated January 31, 2025" | platform's own guide |
| `GH_TOKEN`, `GH_PROMPT_DISABLED`, `GH_NO_UPDATE_NOTIFIER`, `GH_FORCE_TTY`, `NO_COLOR`, `CLICOLOR=0` | [gh environment manual](https://cli.github.com/manual/gh_help_environment) | none on page, fetched 2026-11-27 | the tool itself |
| `gh auth login` interactive and `--with-token` flows | [gh auth login](https://cli.github.com/manual/gh_auth_login) | none, fetched 2026-11-27 | the tool itself |
| NO_COLOR: ANSI colour by default should check `NO_COLOR` | [no-color.org](https://no-color.org/) | page updated 2026-11-25; proposal 2017; no version | informal community standard |
| uv install: `curl -LsSf https://astral.sh/uv/install.sh \| sh`; no verify command given; binaries in `~/.local/bin`; `UV_NO_MODIFY_PATH=1` | [uv installation](https://docs.astral.sh/uv/getting-started/installation/) | none, fetched 2026-11-27 | tool's docs |
| rustup: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh`, "follow the onscreen instructions" | [rustup.rs](https://rustup.rs/) | none, fetched 2026-11-27 | tool's site |
| deno: `curl -fsSL https://deno.land/install.sh \| sh`; verify `deno --version`; "open a new terminal" | [Deno docs](https://docs.deno.com/runtime/getting_started/installation/) | none, fetched 2026-11-27 | tool's docs |
| bun: `curl -fsSL https://bun.com/install \| bash`; "open a new terminal window" then `bun --version` | [Bun docs](https://bun.sh/docs/installation) | none, fetched 2026-11-27 | tool's docs |
| Homebrew caveats are for packaging differences; `post_install` deprecated | [Homebrew Formula Cookbook](https://docs.brew.sh/Formula-Cookbook) | none, fetched 2026-11-27 | tool's docs |
| TTHW: "the time it takes for a developer to set up and run their first successful command, application, or project"; no formula, no target | [Instruqt glossary](https://instruqt.com/glossary/time-to-hello-world) | none ("All rights reserved 2026") | vendor data |
| Installer timings, final lines, no-config messages | measured, this document, section 2.2-2.5 | 2026-11-27 | independent measurement, single host |
| Reading rate 238 wpm (adult silent non-fiction, English); 260 fiction; 183 oral | [Brysbaert 2019 record (bibbase)](https://bibbase.org/network/publication/brysbaert-howmanywordsdowereadperminuteareviewandmetaanalysisofreadingrate-2019); preprint coverage [BPS Research Digest](https://www.bps.org.uk/research-digest/most-comprehensive-review-date-finds-average-persons-reading-speed-slower) | journal vol. 109, 2019 (December); preprint 2019-06-13 | independent meta-analysis; journal page 403, read via record |
| TTHW targets "under two minutes ... top tier", "over ten minutes signals major onboarding friction"; no data cited | [Fern post](https://buildwithfern.com/post/reduce-time-to-hello-world-enterprise-partners.md) | July 2026 (in title only) | vendor data, API-onboarding metric, unsourced thresholds |

## 5. What an agent must not decide alone

- Which command the product's installer should name as the first command. It states the product's promise (`ocx init` versus `ocx package exec`); that is a product and brand decision. Propose two, ask.
- Whether the installer may edit shell profiles, write systemd session files or prompt by default. The ocx installer edits `.profile`, `.bashrc`, `.zprofile`, `.zshrc` and `~/.config/environment.d/ocx.conf`; consent defaults are a policy decision (the skill's step 9 already asks for consent and an opt-out).
- Whether to add telemetry, an update notice or a first-run analytics notice. clig.dev says to "tell users ... on first run", but whether to collect at all is a business and legal decision.
- The seconds figure in a published budget, and whether a CI regression gate blocks a release. The numbers here come from one host and one network.
- Any wording about signature verification, trust or security posture in the installer (the unsigned-install line). Legal and security owners decide it.
- Whether to ship `-y` or unattended defaults for installers that prompt (rustup, deno).
- Whether grim's install page should lead with the direct installer rather than ocx. That is a distribution and product-positioning choice; measured cost is 7.2 s and one extra command (2.2), the decision is the owner's.

## 6. AI-agent angle

| Characteristic mistake | Mechanical check |
|---|---|
| Writes an installer that ends `echo "Installation complete!"` with no command | CLI-FR-1: `tail -n 1` of stderr must parse as a command and run |
| Prints `source ~/.bashrc` as if it were universal; the shell may be zsh, fish or nushell (ocx writes `env.sh`, `env.fish`, `env.ps1`, `env.nu`, `env.elv`) | Installer prints the line for the detected `$SHELL` only; grep its output for the other shells' names |
| Ends on `--help` or `--version` and calls it "get started" | CLI-FR-3 reading heuristic |
| Writes an error `config not found` with no creating command | CLI-FR-7 loop over verbs |
| Invents a next-step command that does not exist (the ocx `ocx install` case) | CLI-FR-8: run the named command with `--help` |
| Treats `docker`/CI timing as a fixed budget and hard-codes seconds | CLI-FR-15: relative regression against a stored baseline, commands counted |
| Copies a clig.dev line as if it were a first-run standard | clig.dev has no first-run section (2.1); cite as "suggest commands" and "tell the user" only |
| Uses the grim README's 3-step path as the budget model without counting reading time | 2.9: count words and shell blocks, not only commands |
| Adds a Discord or marketing line after the next step | CLI-FR-1 fail example; last line must be the command |
| Makes `-y` the documented command, hiding the interactive prompt humans meet | State both in the measurement script; a human run is the documented one |

## 7. Contested / evolving

- Verify command versus job command. deno and bun docs treat `--version` as the install check and `--help` as "get started" ([Deno](https://docs.deno.com/runtime/getting_started/installation/), [Bun](https://bun.sh/docs/installation)); this document argues a job command is better for the last line. No A/B evidence exists either way; this is a judgment, ask the owner before applying it to a product with no offline job.
- Whether an installer should edit shell profiles at all. uv, rustup, deno, bun and ocx do and offer an opt-out (`UV_NO_MODIFY_PATH=1`; ocx `--no-modify-path`); the installer-script skill requires consent and an opt-out. The alternative of printing the line only is what bun's installer did here when it could not edit.
- Time-to-hello-world definition. Vendor sources vary on start (sign-up, docs landing, first interaction) and stop (first call, first success) ([Instruqt](https://instruqt.com/glossary/time-to-hello-world), search listing 2026-11-27); no standard. Trend: more vendor posts in 2026 treat it as an API-onboarding metric, not a CLI one; unconfirmed beyond a search listing.
- Next-step lines versus quiet output. clig.dev says "err on the side of less" for success output and also "suggest commands the user should run"; both are on the same page ([clig.dev](https://clig.dev/)). Reconciled here as one line only when one next step dominates (CLI-FR-10).
- Whether an `ocx`-first install path is a feature (one package manager, two products) or a defect. The site-shape audit reads it as a defect in the onboarding chain; measured cost is 7.2 s against 0.7-1.3 s.

## 8. Sources

Primary (platform or authority itself) first.

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://clig.dev/ | Command Line Interface Guidelines | no date | the generic authority; its gap on first run is itself a finding |
| https://docs.astral.sh/uv/getting-started/installation/ | uv install docs | fetched 2026-11-27 | exemplar: no verify command |
| https://rustup.rs/ | rustup install page | fetched 2026-11-27 | exemplar: "follow the onscreen instructions" |
| https://docs.deno.com/runtime/getting_started/installation/ | Deno install docs | fetched 2026-11-27 | exemplar: verify and "new terminal" |
| https://bun.sh/docs/installation | Bun install docs | fetched 2026-11-27 | exemplar: manual PATH lines |
| https://cli.github.com/manual/gh_auth_login | gh auth login manual | fetched 2026-11-27 | interactive versus headless |
| https://cli.github.com/manual/gh_help_environment | gh environment variables | fetched 2026-11-27 | bypass and tty variables |
| https://devcenter.heroku.com/articles/cli-style-guide | Heroku CLI style guide | updated 2025-01-31 | prompts must be bypassable |
| https://no-color.org/ | NO_COLOR standard | updated 2026-11-25 | colour opt-out |
| https://docs.brew.sh/Formula-Cookbook | Homebrew caveats | fetched 2026-11-27 | post-install message precedent |
| https://www.atlassian.com/blog/it-teams/10-design-principles-for-delightful-clis | Atlassian Forge CLI principles | 2020-07-23 | "Suggest the next best step" |
| https://instruqt.com/glossary/time-to-hello-world | TTHW definition | undated, vendor | shows the metric has no standard |
| https://bibbase.org/network/publication/brysbaert-howmanywordsdowereadperminuteareviewandmetaanalysisofreadingrate-2019 | Brysbaert 2019 bibliographic record with abstract | 2019 | source of 238 wpm |
| https://www.bps.org.uk/research-digest/most-comprehensive-review-date-finds-average-persons-reading-speed-slower | BPS summary of the preprint | 2019-06-13 | second source for 238 wpm |
| https://buildwithfern.com/post/reduce-time-to-hello-world-enterprise-partners.md | Fern TTHW post | July 2026 (title) | the only numeric TTHW targets found; vendor, unsourced |
| https://setup.ocx.sh/sh | ocx installer, executed in container | 2026-11-27 | measured final lines |
| https://setup.grimoire.rs/sh | grim installer, executed in container | 2026-11-27 | measured final lines |
| https://astral.sh/uv/install.sh | uv installer, executed | 2026-11-27 | measured |
| https://sh.rustup.rs | rustup installer, executed | 2026-11-27 | measured |
| https://deno.land/install.sh | deno installer, executed | 2026-11-27 | measured |
| https://bun.com/install | bun installer, executed | 2026-11-27 | measured |

Also used (local, not counted as fetched): `skills/installer-script/SKILL.md` (406 lines), `.agents/research/product-audit/cli-first-run.md`, `.agents/research/product-audit/site-shape.md` lines 159 and 246, the raw runs in `~/.cache/research-lang/exemplars/product/first-run/`.

Not fetched. `https://blog.developer.atlassian.com/10-design-principles-for-delightful-clis/` redirected to a non-Atlassian host and was not followed; the `atlassian.com` copy was read instead. The publisher page for Brysbaert 2019 (sciencedirect) returned 403. Start rows, resolved in the repair pass: M124-M126 are `ux-topic-map.md` lines 245-247 (`grep -nE "M12[456]" .agents/research/ux-topic-map.md`). The scout ids are row numbers per scout file, not global ids: DT35 and DT36 are `ux-topic-map/devtools.md` rows 35 (DX metrics for a small fleet: vendor-reported DX Core 4, no verified measure) and 36 (time to first success: "No published number was verified"); OC2 and OC38 are `ux-topic-map/onboarding-conversion.md` rows 2 (TTHW definitions vary, targets unsourced) and 38 ("No source found in this corpus that studies CLI first-run directly"). PR44 does not resolve: `grep -nE "^\| *44 " ux-topic-map/*.md` matches only `onboarding-conversion.md` (an unrelated cancel-flow row) and `practitioner.md` has no row 44; no installer or first-run row exists under that id, so it is unused. Every one of these rows agrees with this document's finding that no verified numeric budget exists. Windows installers (`install.ps1`) were not run.
