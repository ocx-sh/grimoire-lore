---
title: "CLI discoverability and recovery: version flag, typo suggestions, global-flag position, completion offer"
program: product
sub_program: ux
topic: ux-cli-interaction
worker: discoverability-recovery
date_researched: 2026-11-27
model: sonnet
sources_fetched: 18
scope: "Covers what a CLI owes a user who mistypes, forgets, or asks which version is installed: the version flag, did-you-mean at every command layer, auto-correct policy, global-flag position, and the completion offer. Measurements were re-run verbatim in a repair pass on 2026-11-27 (docker completion offer now checked). Not covered: error wording (UX-TEXT), exit-code values (pinned elsewhere), help-page structure (sibling dive), destructive-command confirmation. The help-structure dive's install directory did not exist on disk on 2026-11-27, so exemplars were the CLIs already on PATH (versions in Findings 1). Scout row IDs M118-M123, DT3, DT4, DT8, CG34, CG36 were not found as literal IDs in the topic-map files; the closest rows are devtools.md row 8 (typo policy) and the cli-first-run.md audit, both used."
---

# CLI discoverability and recovery

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Dated facts](#dated-facts)
5. [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Every CLI must answer `<cli> --version` with exit 0, one line on stdout, `<name> <semver>` first. Of 8 measured CLIs, 7 do; `ocx` exits 64 and has only the subcommand `ocx version`.
- Also accept `-V`. uv, grim, cargo, rustc accept it; git, gh, docker, npm, ocx reject it (npm and gh answer with a help dump and exit 1).
- A typo at the top level must get a suggestion. Measured: git, cargo, gh, uv, grim suggest; docker and ocx do not. ocx is the worst case, because its message tells a typo-ing user to install a plugin.
- A typo at the subcommand layer and in a flag needs a suggestion too. Measured: cargo, uv, ocx, grim suggest flags; git, gh, docker do not.
- Never auto-run a corrected command by default. git's default is "show" (`help.autoCorrect` default, git master docs); clig.dev says assuming what the user meant "can be dangerous, especially if the resulting action modifies state."
- Auto-run is acceptable only as an explicit user opt-in (git `help.autoCorrect=immediate`, measured: it runs `status` for `stauts`, exit 0, with a warning on stderr).
- Suggestion must be exact-one or a short list. git, cargo, gh print a short list, never more than 3 in these runs.
- Global flags: make them work before and after the subcommand. Measured: cargo, gh, uv accept both positions; git `-C`, docker `--debug` and ocx `--format` fail after the subcommand.
- clap does this with one setting: `Arg::global(true)`. "Global arguments only propagate down ... it doesn't matter where the user uses the global argument" (clap source docs, 4.6.x).
- A flag whose meaning changes with position (`ocx -g`) is a deliberate trap; avoid it, or give each meaning its own name.
- Provide a completion generator command, list it in top-level `--help`, and document one install line per shell. Measured: gh, docker, uv, npm, ocx, grim all print a script; cargo and git do not have a built-in command.
- Offer completion where the user looks: the top-level help, the install docs, and the unknown-command message must all point to the one real command. ocx fails this: `ocx self --help` says completions live under `self`; they live under `ocx shell completion`; `ocx completion bash` returns the plugin hint.
- Generate dynamic completion scripts at shell start, not once to a file: clap_complete warns the shell code and the binary can mismatch after an upgrade.
- If a CLI uses clap `external_subcommand` (plugin dispatch), it swallows clap's own suggester; the dispatcher must run its own nearest-name check before the "plugin not found" message.

## Findings

### 1. Measurements (commands, exit codes, outputs)

Environment: Linux (WSL2), 2026-11-27, `NO_COLOR=1`, stdin `/dev/null`, scratch `HOME` (cargo run with the real `RUSTUP_HOME`/`CARGO_HOME`, because a scratch HOME made rustup report "could not choose a version of cargo"; that run is not counted). Versions: git 2.43.0, cargo 1.96.0 (2026-05-25), gh 2.105.0 (2026-11-17), npm 11.20.0, uv 0.13.9, docker 29.10.0, ocx 0.6.8, grim 0.16.0. All of these are tools already on PATH; the help-structure dive directory was not found.

**1a. Version flag.** Command: `<cli> --version` and `<cli> -V`, exit via `$?`. Re-run 2026-11-27 and the decisive lines below are copied from that run.

| CLI | `--version` | `-V` |
|---|---|---|
| git | exit 0, stdout `git version 2.43.0` | exit 129, stderr `unknown option: -V` plus usage |
| cargo | exit 0, `cargo 1.96.0 (30a34c682 2026-05-25)` | exit 0, same |
| gh | exit 0, `gh version 2.105.0 (2026-11-17)` plus release URL line | exit 1, stderr `unknown shorthand flag: 'V' in -V` followed by the whole top-level help |
| npm | exit 0, `11.20.0` (bare number, no program name) | exit 1, stdout carries the full usage text, stderr empty |
| uv | exit 0, `uv 0.13.9 (x86_64-unknown-linux-gnu)` | exit 0, same |
| docker | exit 0, `Docker version 29.10.0, build fdd4b8e` | exit 125, `unknown shorthand flag: 'V' in -V` |
| ocx | exit 64, stderr `error: unexpected argument '--version' found` + `Usage: ocx [OPTIONS] [COMMAND]` | exit 64, `unexpected argument '-V' found` |
| grim | exit 0, `grim 0.16.0` | exit 0, same |

Also: `ocx version` works (the audit and this run; `--format json` before it gives a JSON object with `schema_version`, `version`, `channel`, `commit`). `grim add --version` exits 64 with `similar argument exists: '--verify'` (a wrong suggestion, since the user wanted a version). `gh pr --version`: `unknown flag: --version`. `ocx package install --version`: unexpected argument, exit 64.

Cause in ocx: the top-level derive is `#[command(name = "ocx", about, long_about = None)]` with no `version` (`/home/mherwig/dev/ocx-sh/ocx/crates/ocx_cli/src/app.rs:55-58`; `grep -n "command(" crates/ocx_cli/src/app.rs`). clap adds `-V/--version` only when a version is set ([clap `Command::version`](https://github.com/clap-rs/clap/blob/master/clap_builder/src/builder/command.rs): "Sets the version for the short version (`-V`) and help messages. If `Command::long_version` is not specified, this message will be displayed for `--version`").

**1b. Typos.** Command lines as run, stdin `/dev/null`, `NO_COLOR=1`, stdout and stderr merged, first lines kept (the cut is only at the end of each block; no line is reworded). Re-measured 2026-11-27 for this repair.

Top-level typo:

```
$ git stauts            [exit 1]  git: 'stauts' is not a git command. See 'git --help'. / The most similar command is / 	status
$ cargo buidl           [exit 101] error: no such command: `buidl` / help: a command with a similar name exists: `build` / help: view all installed commands with `cargo --list`
$ gh isue list          [exit 1]  unknown command "isue" for "gh" / Did you mean this? / 	issue
$ uv ad                 [exit 2]  error: unrecognized subcommand 'ad' / tip: some similar subcommands exist: 'audit', 'add'
$ docker runn           [exit 1]  docker: unknown command: docker runn / Run 'docker --help' for more information
$ ocx instal            [exit 64] error: unknown subcommand 'instal'; if `ocx-instal` is an official OCX plugin, install it with `ocx --global add ocx.sh/ocx/instal`, otherwise put an `ocx-instal` binary on your PATH
$ grim instal           [exit 64] error: unrecognized subcommand 'instal' / tip: some similar subcommands exist: 'init', 'uninstall', 'install'
$ git stat              [exit 1]  git: 'stat' is not a git command. See 'git --help'. / The most similar commands are / 	status / 	stage
```

Subcommand typo:

```
$ git remote ad         [exit 129] error: unknown subcommand: `ad' / usage: git remote [-v | --verbose] ...   (no suggestion)
$ gh pr lst             [exit 1]  unknown command "lst" for "gh pr" / Did you mean this? / 	list
$ uv pip instal         [exit 2]  error: unrecognized subcommand 'instal' / tip: some similar subcommands exist: 'list', 'uninstall', 'install'
$ docker image lss      [exit 1]  docker: unknown command: docker image lss / Usage:  docker image   (no suggestion)
$ ocx package instal    [exit 64] error: unrecognized subcommand 'instal' / tip: some similar subcommands exist: 'uninstall', 'install'
$ grim ad foo           [exit 64] error: unrecognized subcommand 'ad' / tip: a similar subcommand exists: 'add'
```

Flag typo:

```
$ git status --shrot             [exit 129] error: unknown option `shrot' / usage: git status [<options>] [--] [<pathspec>...]   (no suggestion)
$ cargo build --relase           [exit 1]   error: unexpected argument '--relase' found / tip: a similar argument exists: '--release'
$ gh pr list --stat              [exit 1]   unknown flag: --stat / then the command's help text   (no suggestion)
$ uv pip install --upgrad        [exit 2]   error: unexpected argument '--upgrad' found / tip: a similar argument exists: '--upgrade'
$ docker run --detac             [exit 125] unknown flag: --detac / Usage:  docker run [OPTIONS] IMAGE [COMMAND] [ARG...]   (no suggestion)
$ ocx package install --selct    [exit 64]  error: unexpected argument '--selct' found / tip: a similar argument exists: '--select'
$ grim add --foo                 [exit 64]  error: unexpected argument '--foo' found / tip: to pass '--foo' as a value, use '-- --foo'   (no near match exists, so this is correct)
```

Notes. (1) Far-typo cells (`xyzzy`) from the first pass are not repeated; they add nothing to the rule. (2) `npm instal` in a directory with a `package.json` exited 0 and printed `added 266 packages, and audited 267 packages in 13s`: npm ran `install` for the typo. Confirmed by this run, not inferred; it side-effected a gitignored `node_modules` in the repo worktree (no tracked file changed). (3) `npm --sav` printed `11.20.0`, exit 0, when re-run: an unknown flag prefix resolves to `--version` (observed; cause not investigated). (4) Suggestion lists in the measured tools hold 1 to 3 items.


**1c. git auto-correct modes** (git 2.43.0 installed; doc below is git master): `git -c help.autocorrect=immediate stauts` ran `status` and exited 0, with stderr `WARNING: You called a Git command named 'stauts', which does not exist. Continuing under the assumption that you meant 'status'.` Default (unset): suggestion shown, exit 1, command not run. `never`: `git: 'stauts' is not a git command. See 'git --help'.` with no suggestion. `prompt`: on git 2.43.0 it behaved like `never` (no suggestion, exit 1, stdin was `/dev/null` so no tty). The master documentation lists `prompt`; the installed 2.43.0 evidently predates it or cannot prompt without a tty. Do not rely on `prompt` in scripts.

Primary doc, git master `Documentation/config/help.adoc`: "If git detects typos and can identify exactly one valid command similar to the error, git will try to suggest the correct command or even run the suggestion automatically." Values: `0`, "false", "off", "no", "show": show the suggested command (default); `1`, "true", "on", "yes", "immediate": run immediately; a positive number above 1: run after that many deciseconds; "never": do not run or show; "prompt": show and prompt for confirmation ([git help.adoc](https://raw.githubusercontent.com/git/git/master/Documentation/config/help.adoc)). Note the condition "exactly one": the measured `git stat` printed two candidates (`status`, `stage`) and so cannot auto-run.

**1d. Global flag position.** Same flag before and after the subcommand.

| CLI | Before | After |
|---|---|---|
| cargo | `cargo --color never build --help` exit 0 | `cargo build --color never --help` exit 0 |
| gh | `gh --repo a/b pr list --help` exit 0 | `gh pr list --repo a/b --help` exit 0 |
| uv | `uv --quiet pip --help` exit 0 | `uv pip --quiet --help` exit 0 |
| docker | `docker --debug version` exit 0, prints `Client: Docker Engine - Community` | `docker version --debug` exit 125, `unknown flag: --debug` |
| git | `git -C /tmp/claude-1000/sc/g status -s` exit 0 (acts on that repo) | `git status -C /tmp/claude-1000/sc/g` stderr ``error: unknown switch `C'`` (exit 129 in the first pass) |
| ocx | `ocx --format json version` exit 0, JSON | `ocx version --format json` exit 64 `unexpected argument '--format' found`; `ocx package install --format json --help` exit 64 too |
| grim | `grim --format json --version` exit 0 | `grim --version --format json` exit 0 |

The ocx `--help` states of `--format`: "Applies to every command; there is no per-command `--format`." Yet the flag is rejected after the subcommand: the help promises "every command" and the parser delivers "before the subcommand only". It also documents a deliberate position trap: "Before the subcommand `-g` means `--global`; after it, `-g` means `--group`." (`ocx --help`, Options.) The error body in the ocx failure case is also emitted as a JSON object on stdout (`"exit_code": 64`) even though the user's JSON flag was the thing rejected; that is an exit-contract matter and left to the stream-contract rules.

Primary: clap `Arg::global`: "Global arguments only propagate down, not up (to parent commands), however their values once a user uses them will be propagated back up to parents. In effect, this means one should define all global arguments at the top level, however it doesn't matter where the user uses the global argument." ([clap arg.rs](https://github.com/clap-rs/clap/blob/master/clap_builder/src/builder/arg.rs)). clig.dev: "If possible, make arguments, flags and subcommands order-independent." ([clig.dev](https://clig.dev/)). Cobra distinguishes persistent flags (available to the command and all its children) from local flags ([cobra user guide](https://raw.githubusercontent.com/spf13/cobra/main/site/content/user_guide.md)); persistent flags are the cobra equivalent of clap `global`.

**1e. Completions: installed and offered?** Commands run: `bash -c '<cli> <completion cmd> bash' >out 2>err`, exit code, `wc -l out`, `wc -c err`; offer checked with `<cli> --help | grep -in complet`.

| CLI | Generator | Result | Offered where |
|---|---|---|---|
| gh | `gh completion -s bash` | exit 0, 426 lines, 0 bytes stderr; `gh --help` line 33: `completion:    Generate shell completion scripts` | listed in top-level help. The [gh completion manual](https://cli.github.com/manual/gh_completion) (page footer "© 2026 GitHub, Inc.") gives per-shell lines, e.g. bash `eval "$(gh completion -s bash)"`, zsh `gh completion -s zsh > /usr/local/share/zsh/site-functions/_gh`, and says "When installing GitHub CLI through a package manager, it's possible that no additional shell configuration is necessary to gain completion support." |
| docker | `docker completion bash` | exit 0, 426 lines, 0 bytes stderr; `docker completion --help` lists `bash`, `fish`, `powershell`, `zsh` | `docker --help \| grep -i complet` printed nothing: the generator is not listed in top-level help. The `docker runn` typo message offers only `Run 'docker --help'`. Not offered. |
| uv | `uv generate-shell-completion bash` | exit 0, 11360 lines, 0 bytes stderr | `uv --help \| grep -i complet` printed nothing. The [uv installation docs](https://docs.astral.sh/uv/getting-started/installation/) give a manual line per shell, e.g. `echo 'eval "$(uv generate-shell-completion bash)"' >> ~/.bashrc`, and do not say the installer sets completion up (the page says only: "Updating uv will re-run the installer and can modify your shell profiles."). |
| npm | `npm completion` | exit 0, 69 lines, 0 bytes stderr | the `completion` command appears in the top-level command list (`npm --help` line 17). The [npm completion docs](https://docs.npmjs.com/cli/v11/commands/npm-completion) say "Enables tab-completion in all npm commands." and show `npm completion >> ~/.bashrc` (a one-shot append, the stale-file pattern DISC-17 warns about). |
| cargo | `cargo completion` | exit 101, `error: no such command: \`completion\`` then `help: view all installed commands with \`cargo --list\`` | none built in |
| git | `git completion bash` | exit 1, `git: 'completion' is not a git command. See 'git --help'.` | ships as files; `ls /usr/share/bash-completion/completions \| grep -E '^(git\|docker\|gh\|uv\|npm\|cargo\|ocx\|grim)$'` lists `docker` and `git` only, so none of gh, uv, npm, cargo, ocx, grim was installed system-wide on this host |
| ocx | `ocx shell completion --shell bash` | exit 0, 2450 lines, 0 bytes stderr; `ocx completion bash` exit 64 with `error: unknown subcommand 'completion'; if \`ocx-completion\` is an official OCX plugin, install it with \`ocx --global add ocx.sh/ocx/completion\`` | `$OCX_HOME/env.sh` evals `ocx shell completion --shell=... --if-enabled` on every interactive source (lines 56-69 of that file, read in the first pass); `ocx --help` line 25 reads `self     Manage the OCX installation itself (PATH activation, completions, self-update)`, which sends the user to `self`, not `shell`; `ocx shell completion --help` documents `--if-enabled`, `OCX_NO_COMPLETION` and a docs URL |
| grim | `grim completions bash` | exit 0, 3437 lines, 0 bytes stderr; `grim completions nosuchshell` exit 64, `error: invalid value 'nosuchshell' for '<SHELL>'` / `[possible values: bash, elvish, fish, powershell, zsh]` | `grim --help` line 26: `completions  Print a shell completion script (bash, zsh, fish, elvish, powershell)` |

No tested CLI printed a completion hint after a typo (the unknown-command messages above carry none). clap_complete documents two designs: ahead-of-time scripts (`generate`, `generate_to`) and the dynamic `CompleteEnv` flow (`COMPLETE=$SHELL <bin>`, gated by `unstable-dynamic` per docs.rs, clap_complete 4.6.12). Its dynamic-mode warning: "We recommend re-sourcing your completions on upgrade. These completions work by generating shell code that calls into `your_program` while completing. That interface is unstable and a mismatch ... may result in either invalid completions or no completions being generated. For this reason, we recommend generating the shell code anew on shell startup" ([clap_complete env/mod.rs](https://raw.githubusercontent.com/clap-rs/clap/master/clap_complete/src/env/mod.rs)). The `Shell` enum covers "natively-supported shell types"; nushell is a separate crate, `clap_complete_nushell` ([clap_complete README](https://raw.githubusercontent.com/clap-rs/clap/master/clap_complete/README.md)). docs.rs notes the older `generator` and `shells` modules are deprecated in favour of `aot` ([docs.rs clap_complete](https://docs.rs/clap_complete/latest/clap_complete/)).

### 2. What the primary sources say

- **[clig.dev](https://clig.dev/)** (no date shown on the page; independent community guideline, re-fetched 2026-11-27): "If the user did something wrong and you can guess what they meant, suggest it." "You can ask if they want to run the suggested command, but don't force it on them." "Assuming what they meant can be dangerous, especially if the resulting action modifies state." "If possible, make arguments, flags and subcommands order-independent." The standard-flag list gives `--version`: "Version." and says of `-v`: "This can often mean either verbose or version." It does not name `-V` and does not mention shell completion. Same page: "Display concise help text by default."
- **GNU Coding Standards** (page last updated 2026-04-27): `--version` should "print information about its name, version, origin and legal status, all on standard output, and then exit successfully. Other options and arguments should be ignored once this is seen." First line "is meant to be easy for a program to parse; the version number proper starts after the last space", format `GNU Emacs 19.30`; the name "should be a constant string; don't compute it from argv[0]." ([GNU standards 4.8.1](https://www.gnu.org/prep/standards/html_node/_002d_002dversion.html)). npm's bare `11.20.0` fails the "name first" part of this standard; docker's `Docker version 29.10.0, build ...` passes the "version after last space" test only if the parser takes the token before the comma, so it is borderline.
- **Cargo**: `-V, --version` "Print version info and exit"; `cargo --list` lists installed subcommands; commands may be built-in, aliases, or external tools ([cargo manual](https://doc.rust-lang.org/cargo/commands/cargo.html)). The measured unknown-command message adds two recovery hints: the nearest name and `cargo --list`.
- **Cobra** (used by gh and docker's Go side): "Cobra will print automatic suggestions when 'unknown command' errors happen"; `SuggestionsMinimumDistance` tunes it; `SuggestFor` names words that should suggest a command though they are not close by edit distance (the fetched example is `kubectl remove`); "Cobra adds a top-level '--version' flag if the Version field is set on the root command." ([cobra user guide](https://raw.githubusercontent.com/spf13/cobra/main/site/content/user_guide.md)). So cobra's version flag is opt-in too; gh sets it, docker's `--version` is custom.
- **clap**: `Command::version` gives `-V`; `Command::disable_version_flag(true)` removes `-V`; `propagate_version(true)` makes `myprog test --version` print `myprog-test v1.1`; `infer_subcommands(true)` lets `te` match `test` (unique prefix) ([clap command.rs](https://raw.githubusercontent.com/clap-rs/clap/master/clap_builder/src/builder/command.rs)). The `suggestions` cargo feature produces the `tip: a similar subcommand exists` text; the changelog mentions a binary-size reduction for that feature ([clap CHANGELOG](https://raw.githubusercontent.com/clap-rs/clap/master/CHANGELOG.md)); the current release is 4.6.10, dated 2026-11-24 in the changelog. ocx and grim both print that tip, which confirms the feature is on in both.
- **Plugin dispatch interaction (ocx).** `external_subcommand` is declared at `crates/ocx_cli/src/command.rs:484`; `crates/ocx_cli/src/app/plugin_dispatch.rs:90-96` builds the hint `unknown subcommand '{name}'; if ocx-{name} is an official OCX plugin, install it with ocx --global add ocx.sh/ocx/{name}...` without any nearest-name lookup. Any typo of a built-in therefore produces an instruction to run `ocx --global add ocx.sh/ocx/<typo>`, which is an install command built from unvalidated user input.

### 3. Verdicts for the four decisions

1. **Version rule.** `<cli> --version` and `<cli> -V` print `<canonical-name> <semver>[ extra]` on stdout, one line, exit 0, ignoring other arguments. A `version` subcommand is allowed in addition, never instead.
2. **Typo rule.** Suggest at three layers (top-level command, subcommand, flag); suggest from the closest 1 to 3 names; state the suggestion, never run it unless the user opted in through documented config or flag.
3. **Global-flag rule.** A flag that is documented as applying to every command works before and after the subcommand. Position-dependent meaning is banned.
4. **Completion offer.** One generator command, discoverable from top-level `--help`, one documented install line per shell, never silently editing a profile without telling and without an opt-out.

## Normative guidance candidates

Severity key: MUST / SHOULD / CONSIDER. Each rule has a binary check.

1. **DISC-1 (MUST).** Make `<cli> --version` exit 0 and print to stdout exactly one first line `<canonical-name> <semver>`. Rationale: the [GNU standard](https://www.gnu.org/prep/standards/html_node/_002d_002dversion.html) wants name and version on stdout with success exit, and parsers take the token after the last space; `ocx --version` exits 64 today. Verify: `out=$(<cli> --version); echo $?` is `0`, and `printf '%s\n' "$out" | head -1 | grep -E '^[A-Za-z][A-Za-z0-9._ -]* v?[0-9]+\.[0-9]+\.[0-9]+'` matches. Fail example: `11.20.0` (npm), exit 64 (ocx). Pass: `grim 0.16.0`.
2. **DISC-2 (SHOULD).** Accept `-V` as the short form of `--version`; do not use `-v` for version if `-v` could mean verbose. Rationale: [clig.dev](https://clig.dev/) says of `-v` "This can often mean either verbose or version", and clap/uv/cargo/grim already use `-V`, so users and scripts meet it. Verify: `<cli> -V` output byte-identical to `<cli> --version`, exit 0. clap: `#[command(version)]` on the root, never `disable_version_flag(true)` without replacement.
3. **DISC-3 (MUST).** Keep a `version` subcommand only in addition to the flag. Rationale: scripts and users type the flag first; a subcommand-only CLI (ocx) fails the first thing a user tries, with exit 64 and no hint. Verify: both `<cli> version` and `<cli> --version` exit 0 (ocx today: only the first).
4. **DISC-4 (MUST).** `--version` writes nothing to stderr and never runs an update check or a network call. Rationale: version probes run in loops, CI and package-manager hooks; a network call or stderr noise makes the probe slow, flaky and unparseable (the GNU standard asks for stdout only and exit at once). Verify: `<cli> --version 2>&1 >/dev/null | wc -c` is `0`; `strace -f -e trace=connect <cli> --version` shows no connect (Linux).
5. **DISC-5 (MUST).** An unknown top-level command prints a nearest-name suggestion when one is within edit distance. Rationale: [clig.dev](https://clig.dev/) "If the user did something wrong and you can guess what they meant, suggest it."; git, cargo, gh, uv and grim do, docker and ocx leave the user to guess (measured 1b). Verify with a one-edit typo: `<cli> <cmd minus one letter> 2>&1 | grep -iE 'similar|did you mean|most similar'`. Pass: cargo, gh, git, uv, grim; fail: docker, ocx.
6. **DISC-6 (MUST).** An unknown subcommand under a group prints a suggestion. Rationale: same clig.dev rule at the layer where names are longer and more alike (`list`, `lst`); measured gap: git and docker print usage only. Verify: `<cli> <group> <sub minus one letter> 2>&1 | grep -iE 'similar|did you mean'`. Pass: uv, ocx, gh; fail: git (`git remote ad`), docker (`docker image lss`).
7. **DISC-7 (SHOULD).** An unknown flag prints a suggestion naming the nearest flag. Rationale: flags are the commonest typo site and a dumped usage screen buries the one-letter fix; SHOULD not MUST because cobra-based CLIs (gh, docker) have no built-in flag suggester ([cobra guide](https://raw.githubusercontent.com/spf13/cobra/main/site/content/user_guide.md) documents suggestions for commands only). Verify: `<cli> <cmd> --<flag minus one letter> 2>&1 | grep -E "similar argument|did you mean"`. Pass: cargo, uv, ocx; fail: git, gh, docker.
8. **DISC-8 (MUST).** A plugin or external-subcommand dispatcher runs the nearest-name check against built-ins BEFORE it prints any "install this plugin" instruction, and never prints an install command built from raw user input without that check. Rationale: clap's `external_subcommand` swallows clap's own suggester, so a built-in typo (`ocx instal`) turns into a supply-chain install instruction (`ocx --global add ocx.sh/ocx/instal`, measured 1b); an agent or user may run it. Verify: `ocx instal 2>&1 | grep -E "install"` shows `install` as the suggestion and not `ocx --global add ocx.sh/ocx/instal`; `cargo test` case with a one-edit typo of every built-in name asserts the suggestion and exit 64.
9. **DISC-9 (MUST).** Never run a corrected command by default. Rationale: [clig.dev](https://clig.dev/) "Assuming what they meant can be dangerous, especially if the resulting action modifies state."; git's own default is to show only ([help.adoc](https://raw.githubusercontent.com/git/git/master/Documentation/config/help.adoc)). Verify: `<cli> <typo>; echo $?` is non-zero and no side effect (a file touch or `git reflog` entry) appears; grep the source for a retry-with-corrected-name path: `grep -rnE 'autocorrect|did_you_mean.*(exec|run|spawn)' src/`.
10. **DISC-10 (MUST).** Auto-run, if offered at all, is opt-in through documented config (git model: `help.autoCorrect`, value `immediate` or a deciseconds delay), prints a stderr warning naming both words, and runs only when exactly one candidate exists. Rationale: git documents auto-run only for the case of "exactly one valid command similar to the error" ([help.adoc](https://raw.githubusercontent.com/git/git/master/Documentation/config/help.adoc)), and the measured warning text lets a log reader see what ran. Verify: with the config on, a two-candidate typo (`git stat`) does not run; with it off the typo does not run.
11. **DISC-11 (SHOULD).** A suggestion contains at most 3 candidates and states them as names, not sentences with questions. Rationale: the measured tools print 1 to 3 (1b note 4); a longer list is noise and the first name is what users take. Verify: count candidate names in `<cli> <typo> 2>&1` (git prints one per tab-indented line; clap prints one quoted list after `tip:`); the count is at most 3. (Wording is UX-TEXT's.)
12. **DISC-12 (MUST).** Every flag documented as applying to every command works both before and after the subcommand. Rationale: [clig.dev](https://clig.dev/) "If possible, make arguments, flags and subcommands order-independent."; ocx help says `--format` "Applies to every command" yet `ocx version --format json` exits 64, and agents copy command lines from docs. Verify: run `<cli> <flag> [value] <sub> --help` and `<cli> <sub> <flag> [value] --help`, both exit 0. clap: `Arg::global(true)` ([clap arg.rs](https://github.com/clap-rs/clap/blob/master/clap_builder/src/builder/arg.rs)). Fail: `ocx version --format json`, `docker version --debug`, `git status -C`.
13. **DISC-13 (MUST).** No flag changes meaning by position. Rationale: a user who learns `-g` before the subcommand gets a different, silent behaviour after it; no sampled guideline endorses it, and clig.dev asks for order-independence. Verify: `<cli> --help | grep -nE 'Before the subcommand|after the subcommand'` is empty. Fail today: ocx `-g` (`ocx --help` line 52). If kept for compatibility, ask the owner (see below).
14. **DISC-14 (MUST).** Top-level `--help` lists the completion command, and the install docs give one line per supported shell. Rationale: completion that cannot be found is not offered; measured, docker and uv do not list it and ocx points to the wrong group (`self`), while gh and grim list it. Verify: `<cli> --help | grep -iE 'completion'` matches a command whose name resolves; `<cli> <that command> bash | head -1` exits 0 and prints a script. Fail today: `ocx --help` points to `self`.
15. **DISC-15 (MUST).** The completion command prints only the script on stdout and exits 0; unsupported shell exits with the usage code. Rationale: the output is eval'd or redirected into a profile, so any banner or stderr text corrupts the user's shell; all six measured generators emit 0 bytes on stderr. Verify: `<cli> completions bash 2>&1 >/dev/null | wc -c` is `0`; `<cli> completions nosuchshell; echo $?` equals the usage code (grim: 64).
16. **DISC-16 (SHOULD).** Support bash, zsh, fish, powershell and elvish (clap_complete's native set); name nushell as unsupported or use `clap_complete_nushell`. Rationale: the [clap_complete README](https://raw.githubusercontent.com/clap-rs/clap/master/clap_complete/README.md) says `Shell` covers the natively supported shells and nushell is a separate crate, so the five are free with clap; grim's `possible values` list is exactly these five. Verify: loop `for s in bash zsh fish powershell elvish; do <cli> completions $s | wc -l; done` all greater than 0.
17. **DISC-17 (SHOULD).** Do not write the generated script to a file once and forget it; document an eval-at-startup line (or a regenerate-on-upgrade step) for any dynamic-completion mode. Rationale: [clap_complete's warning](https://raw.githubusercontent.com/clap-rs/clap/master/clap_complete/src/env/mod.rs) about script/binary mismatch ("may result in either invalid completions or no completions being generated"). Verify: install docs contain `eval "$(<cli> ...)"` or `source <(...)` rather than `> file` only; or a post-upgrade note. Pass: uv docs (`eval "$(uv generate-shell-completion bash)"`); weaker: npm docs (`npm completion >> ~/.bashrc`).
18. **DISC-18 (SHOULD).** An installer or first-run flow never edits shell profiles for completion without printing which file it changed and giving an opt-out env var (ocx `OCX_NO_COMPLETION` is an example). Rationale: a profile edit is a change to the user's environment outside the tool's own directory; the user must be able to see and undo it (the uv docs treat completion as a manual user step, [uv install docs](https://docs.astral.sh/uv/getting-started/installation/)). Verify: `grep -n "NO_COMPLETION\|--no-completion" <installer>`; run the installer with HOME in a scratch dir and diff the profile files.
19. **DISC-19 (CONSIDER).** Set `propagate_version(true)` so `<cli> <sub> --version` works; gh and ocx reject it today. Rationale: a user mid-command who types `--version` after the subcommand otherwise gets an error or a wrong suggestion (`grim add --version` suggested `--verify`; [clap](https://raw.githubusercontent.com/clap-rs/clap/master/clap_builder/src/builder/command.rs) documents `propagate_version`). Verify: `<cli> <sub> --version; echo $?` is 0.
20. **DISC-20 (CONSIDER).** Avoid unique-prefix abbreviation of flags in scripts-facing CLIs; measured npm resolved `--sav` to `--version`. Rationale: prefix matching lets a new flag added later change what a script's abbreviated flag means, and here silently swapped an install for a version print; ([clap `infer_subcommands`](https://raw.githubusercontent.com/clap-rs/clap/master/clap_builder/src/builder/command.rs) is opt-in, so the clap default is safe). Verify: `<cli> <cmd> --<prefix-of-two-flags>` exits with a usage error and not a different command's behaviour; `npm --sav; echo $?` reproduces the fail (prints `11.20.0`, exit 0).

## Dated facts

| Fact | URL | Date the source states | Source type |
|---|---|---|---|
| clap current release 4.6.10 | https://raw.githubusercontent.com/clap-rs/clap/master/CHANGELOG.md | 2026-11-24 (changelog heading) | authority (project changelog) |
| clap_complete 4.6.12; dynamic mode behind `unstable-dynamic`; `generator`/`shells` modules deprecated for `aot` | https://docs.rs/clap_complete/latest/clap_complete/ | none on page | authority (docs.rs) |
| clap `Arg::global`, `Command::version`, `disable_version_flag`, `propagate_version`, `infer_subcommands` semantics | https://raw.githubusercontent.com/clap-rs/clap/master/clap_builder/src/builder/command.rs and arg.rs | master branch on 2026-11-27 (undated) | authority (source doc comments) |
| git `help.autoCorrect` values (show default, immediate, deciseconds, never, prompt) | https://raw.githubusercontent.com/git/git/master/Documentation/config/help.adoc | master (undated); git-scm.com manual says latest version 2.56.1 | authority |
| git 2.43.0 installed here treats `prompt` like `never` without a tty | measured on this host, 2026-11-27 | 2026-11-27 | own measurement |
| GNU `--version`: stdout, exit success, first line parseable | https://www.gnu.org/prep/standards/html_node/_002d_002dversion.html | last updated 2026-04-27 | authority (standard) |
| gh completion install lines per shell; package managers may need no extra setup | https://cli.github.com/manual/gh_completion | page footer "© 2026 GitHub, Inc.", no other date (the earlier 2026-01-01 was not reproduced) | authority (the tool's own manual) |
| cargo `-V/--version`, `--list` | https://doc.rust-lang.org/cargo/commands/cargo.html | none on page; cargo 1.96.0 (2026-05-25) measured | authority |
| uv installation docs: manual completion step, `uv generate-shell-completion <shell>` | https://docs.astral.sh/uv/getting-started/installation/ | none on page; uv 0.13.9 measured | authority |
| npm completion: "Enables tab-completion in all npm commands.", `npm completion >> ~/.bashrc` | https://docs.npmjs.com/cli/v11/commands/npm-completion | v11 docs, undated | authority |
| Cobra: automatic suggestions, `SuggestionsMinimumDistance`, `SuggestFor`; `--version` only if Version set | https://raw.githubusercontent.com/spf13/cobra/main/site/content/user_guide.md | main branch, undated | authority |
| clig.dev: suggest, ask, do not force; `-v` ambiguity; order-independence (re-fetched 2026-11-27) | https://clig.dev/ | no date on page | community guideline (independent) |
| gh 2.105.0 released 2026-11-17 | `gh --version` output | 2026-11-17 | own measurement of vendor binary |

No statistic about typo frequency or completion adoption was found in a fetched source; none is claimed.

## What an agent must not decide alone

- Whether to enable git-style auto-run of corrections for a product, even as an opt-in (a safety and support-cost decision; ask).
- Whether to rename or alias an existing flag whose meaning varies by position (ocx `-g`): a breaking change for existing scripts; ask, and give both a deprecation path.
- Whether the installer may edit shell profile files or whether completions are opt-in (user-trust decision).
- Which exit code a usage error returns (pinned elsewhere in the stream/exit contract; do not change from this rule).
- Whether to ship a separate plugin namespace (`<cli>-<name>` dispatch) and the registry URL it advertises; the plugin hint carries a brand and supply-chain stance.
- Any change to the version string's format that scripts or package managers may parse (`ocx version` JSON fields, `grim 0.16.0`).

## AI-agent angle

| What an agent gets wrong | Smallest mechanical check |
|---|---|
| Adds a `version` subcommand and forgets the flag (ocx pattern); or writes `#[command(about)]` without `version` | `<cli> --version; echo $?` equals 0 in the acceptance suite |
| Implements an external-subcommand or plugin fallback that swallows clap's suggester | Test: one-edit typo of each built-in name expects the suggestion text and the usage exit code |
| Writes a hand-rolled "did you mean" that execs the guess | `grep -rnE 'similar|closest' src/` then read whether a spawn follows |
| Puts `--format json` or `--json` after the subcommand in docs and agent prompts, which fails in ocx/docker/git | Run the exact documented command line in CI (a docs-example test) |
| Declares a "global" option on the root without `global = true` and documents it as global | Binary test DISC-12 for each documented global flag |
| Hardcodes `eval "$(cli completion bash)"` into the user's profile or a Dockerfile without checking the shell | DISC-18 check: diff profile files after install |
| Generates completions once into a file in a postinstall script, then leaves them stale after an upgrade | DISC-17: docs and installer use eval-at-start or re-run on upgrade |
| Treats `-V` and `-v` as the same, or reports a version with a trailing newline plus a banner | DISC-1 regex and `wc -l` equals 1 |
| Reads `unknown subcommand` hints as instructions and runs `ocx --global add ocx.sh/ocx/<typo>` | Rule for agents: a suggestion line is never executed without confirmation; extract the nearest-name candidate only |
| Treats `git -c help.autocorrect=immediate` in a script as harmless | grep scripts and CI for `autocorrect` and `immediate` |

## Contested / evolving

- **Auto-run on typo.** For: git ships it as a documented option, including a delay mode of N deciseconds. Against: clig.dev says it "can be dangerous, especially if the resulting action modifies state." Position taken here: show by default, run only with an explicit opt-in, and only when exactly one candidate. git's own default is the same (show). No fetched source argues for auto-run as a default; the claim "some tools auto-run" (devtools.md row 8) is supported only by git's optional mode and the npm behaviour confirmed in 1b note 2 (npm runs `install` for `instal`; npm's abbreviation table was not opened).
- **`-V` vs `-v`.** clig.dev warns `-v` is ambiguous and does not mention `-V`; clap uses `-V` for version and cobra only adds `--version`. git uses `-v`/`--version`, and gh and docker reject `-V`. Position: `--version` is the contract, `-V` is a cheap convenience (SHOULD).
- **Suggestion on flags.** git, gh and docker print only usage or the whole help for unknown flags; cargo, uv, clap-based tools suggest. Whether a Go/cobra CLI should add flag suggestions is a framework limitation, not a UX disagreement; the rule asks for it where the framework supports it.
- **Completion install: automatic or manual.** gh's manual says package-manager installs "may" need no extra setup; uv's docs treat it as a manual step; ocx injects it through its env file on every interactive source and exposes an opt-out. No source states a user preference; ask the owner (see above).
- **Dynamic vs static clap completion.** clap_complete's dynamic mode (`COMPLETE=bash <bin>`) is still gated behind `unstable-dynamic` per docs.rs on 2026-11-27 and warns about version mismatch; static scripts (the measured pattern of ocx and grim) are stable. Trend: dynamic is moving toward the default, but unstable as of today.
- Cross-territory, left alone: error wording and exit-code values (UX-TEXT and stream contracts); the `unexpected argument` error printing a JSON error object on stdout in ocx (stream contract); `ocx` first-run discoverability of `--help` length (help-structure dive).

## Sources

Fetched = opened as a page or raw file on 2026-11-27. Primary = the tool's own project, docs, or the standard.

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://clig.dev/ | Command Line Interface Guidelines | undated | suggest-not-force rule, `-v` ambiguity, order-independence (independent guideline) |
| https://raw.githubusercontent.com/git/git/master/Documentation/config/help.adoc | git `help.autoCorrect` doc (primary) | master, undated | all auto-correct modes in one place |
| https://git-scm.com/docs/git-config | git config manual page (primary); the section was beyond the fetch window | manual for 2.56.1 | version of the latest manual; autocorrect text taken from help.adoc instead |
| https://raw.githubusercontent.com/git/git/master/Documentation/RelNotes/2.46.0.adoc | git 2.46 release notes (primary), no autocorrect note found | 2.46 era | checked for when `prompt` appeared; not found, so no date claimed |
| https://raw.githubusercontent.com/clap-rs/clap/master/clap_builder/src/builder/command.rs | clap `Command` source docs (primary) | 4.6.x | `version`, `disable_version_flag`, `propagate_version`, `infer_subcommands` |
| https://raw.githubusercontent.com/clap-rs/clap/master/clap_builder/src/builder/arg.rs | clap `Arg::global` docs (primary) | 4.6.x | global-flag propagation semantics |
| https://docs.rs/clap/latest/clap/struct.Command.html | clap docs.rs page, fetched, cut off before the relevant methods | 4.6.10 | version check only; method text taken from the source file |
| https://raw.githubusercontent.com/clap-rs/clap/master/CHANGELOG.md | clap changelog (primary) | 4.6.10 on 2026-11-24 | release date, `suggestions` feature history |
| https://docs.rs/clap_complete/latest/clap_complete/ | clap_complete docs (primary) | 4.6.12 | aot vs dynamic, unstable flag |
| https://raw.githubusercontent.com/clap-rs/clap/master/clap_complete/src/env/mod.rs | clap_complete dynamic mode docs (primary) | 4.6.12 | re-source on upgrade warning, per-shell install lines |
| https://raw.githubusercontent.com/clap-rs/clap/master/clap_complete/README.md | clap_complete README (primary) | 4.6.12 | nushell is a separate crate |
| https://raw.githubusercontent.com/clap-rs/clap/master/clap_complete/src/lib.rs | clap_complete quick start (primary) | 4.6.12 | `generate` example, `Shell` enum |
| https://cli.github.com/manual/gh_completion | gh completion manual (primary, vendor) | footer 2026 | per-shell install lines |
| https://doc.rust-lang.org/cargo/commands/cargo.html | cargo command manual (primary) | cargo 1.96.0 era | `--version`, `--list` |
| https://raw.githubusercontent.com/spf13/cobra/main/site/content/user_guide.md | cobra user guide (primary) | main, undated | suggestions, persistent flags, version flag |
| https://www.gnu.org/prep/standards/html_node/_002d_002dversion.html | GNU Coding Standards 4.8.1 (primary) | updated 2026-04-27 | `--version` output standard |
| https://docs.astral.sh/uv/getting-started/installation/ | uv install docs (primary) | undated | completion install, installer does not set it up |
| https://docs.npmjs.com/cli/v11/commands/npm-completion | npm completion docs (primary) | v11 | plumbing mode, install line |
| Local: `/home/mherwig/dev/ocx-sh/ocx/crates/ocx_cli/src/app.rs`, `command.rs`, `app/plugin_dispatch.rs`; `/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/cli-first-run.md` | the fleet source and prior audit (read-only) | measured 2026-11-27 | cause of the ocx findings |
