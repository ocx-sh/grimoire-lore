---
name: ux-cli
description: Interaction standards for command-line tools and terminal UIs - bare invocation and help layout, --version output, unknown-command suggestions, global flag position, shell completion offers, the installer's last line, first-run messages for a missing config, colour and animation per stream, TUI parity and linear mode, terminal error wording, and --dry-run, --force and typed confirmation on destructive commands. Use when writing or reviewing a CLI's help text, usage or error message, version flag, typo suggestion, progress spinner, NO_COLOR or CLICOLOR handling, install script output, or a command that deletes, overwrites or publishes. Not for exit-code tables, stdout and stderr routing or signal handling, which the language rule sets own, and not for JSON output read by scripts or agents, which is ux-agent-interfaces.
license: Apache-2.0
metadata:
  summary: What a CLI owes a first-time human and an agent above the stream and exit-code contracts - help, version, typos, first run, colour and animation, error shape and destructive commands - with a binary check that runs the CLI itself
  keywords: cli,help,usage,version,typo,did-you-mean,completion,installer,first-run,no-color,spinner,tui,accessibility,error-message,dry-run,force,confirmation,idempotent
  claude.user-invocable: "false"
  grim.requires.skills.ux-quality-reference: "./ux-quality-reference:0"
---

# ux-cli

A command-line tool has two kinds of first-time reader: a person who has never run it, and an agent that copies whatever it prints. This skill covers what the tool prints and does above the language CLI-contract rules, and it checks the claims by running the binary, never by reading the source.

The language rule sets keep: exit-code tables, stdout and stderr routing, TTY detection, the colour decision order, prompts and `--yes`, and signals. This skill owns: help layout, `--version`, typo suggestions, global-flag position, the completion generator, the installer's last line, first-run messages, colour and animation choices, TUI parity, the shape of a rendered error, and how a destructive command refuses, previews and reports. Machine output for scripts and agents is `ux-agent-interfaces`. The shared tier scale (T0 to T3) and error-wording rows are in the `ux-quality-reference` skill, which this skill requires.

Contents: [Procedure](#procedure) · [Before you start](#before-you-start) ·
[Non-negotiables](#non-negotiables) · [The matrix](#the-matrix) ·
[Where the depth is](#where-the-depth-is) · [Pinned defaults](#pinned-defaults) ·
[Ask the owner](#ask-the-owner) · [What agents get wrong here](#what-agents-get-wrong-here) ·
[Siblings](#siblings)

## Procedure

Run the steps in order. Stop when every row you touched has a pass, a finding or a named `did not run`.

1. **Classify the change.** Input: the diff or request. Output: the list of surfaces it touches (help text, version, typo path, installer output, colour or animation, TUI, error text, a mutating command). Done when each surface maps to one file in [Where the depth is](#where-the-depth-is). Read only those files.
2. **Name the binary and the headline command.** Build the CLI (a debug build is enough). Find the declared headline command in the README Quick Start. If none is declared, propose the first Quick Start command and ask the owner (see Ask the owner). Done when `BIN` runs and the headline is named.
3. **Run the matrix.** Command below. Done when it exits 0, or you hold its findings and its `did not run:` line.
4. **Run the blocks the matrix does not cover.** Each row's verification names its block in the routed file. Done when every MUST row you touched has a result.
5. **Report.** One line per finding as `path: ID SEVERITY: message`, then `ran:` and `did not run:`. Mark a finding no script produced `unverified: reading heuristic`. Never report a Linux pass for macOS or Windows.

## Before you start

- `BIN` is the binary (a path, or a quoted command with arguments), `USAGE` its pinned usage exit code (64 in a sysexits-aligned table), and `CHECKS` is `.claude/skills/ux-cli/checks` (`$CLAUDE_CONFIG_DIR/skills/ux-cli/checks` when installed globally).
- Tools: `python3` 3.11 or newer for the matrix (standard library only). Optional: `strace` on Linux for the network gate, `script` for terminal captures.
- Every check runs from an empty temporary directory with an empty `HOME`, stdin from `/dev/null`, `NO_COLOR=1` and `PAGER=cat`. The matrix does this itself.
- Files the project keeps (**pinned** names, defaults an adopter overrides once): `flag-values.tsv` (UX-CLI-12), `decorative-colour.allow` (UX-CLI-22), `no-next-step.txt` (UX-CLI-17), and an action inventory TSV for the matrix (UX-ACT-12 to 17).

## Non-negotiables

Every row blocks a merge within its scope. Each ID resolves to a row with rationale and verification in the file named under [Where the depth is](#where-the-depth-is).

| # | Rule | ID |
|---|---|---|
| 1 | Bare invocation of the root ends on its own with a usage text. It starts no REPL, wizard or prompt, reads no stdin and makes no network call. | UX-CLI-01 |
| 2 | Help works on every command path with no config, credentials, network or project. `-h` is never another flag, and `<path> <valid-flag> -h` still shows help. | UX-CLI-02 |
| 3 | `--version` prints one line `NAME SEMVER` on stdout, exits 0, writes nothing to stderr and makes no network call. | UX-CLI-08 |
| 4 | An unknown command, at the root and under every group, prints 1 to 3 nearest names and exits with the usage code. | UX-CLI-09 |
| 5 | A dispatcher never prints an install hint built from a typo. No framework runs a guessed or prefix-matched command by default. | UX-CLI-10, UX-CLI-11 |
| 6 | Every documented global flag works before and after the subcommand. No short flag changes meaning below the root. | UX-CLI-12 |
| 7 | One completion generator, listed in root help, prints only the script on stdout. An unknown shell exits with the usage code. | UX-CLI-13 |
| 8 | The installer's last non-blank line is the headline command in a form that runs in the current shell. Never pass that line to a shell to test it. | UX-CLI-14 |
| 9 | A missing project or config file message says what was not found, where it looked and the command that creates it. | UX-CLI-15 |
| 10 | Every command line the CLI or installer prints for a user to run is pinned by a test that appends `-h` and expects exit 0. | UX-CLI-16 |
| 11 | Logs, warnings, tracing and parser errors follow the same per-stream colour decision as results. | UX-CLI-20 |
| 12 | Animate only on a TTY with `TERM` not `dumb`, `--quiet` off and the animation opt-out unset. Otherwise print whole lines. | UX-CLI-21 |
| 13 | State colour uses the 16 ANSI slots only. A decorative colour outside them needs an owner-approved allow-list row. | UX-CLI-22 |
| 14 | Every TUI action is reachable as a non-interactive subcommand. | UX-CLI-24 |
| 15 | Never write "accessible", "screen reader compatible" or a WCAG level for a CLI without a recorded test by a screen-reader user. | UX-CLI-26 |
| 16 | One error shape per binary: `error: WHAT`, then `note:` lines, then a last `help:` line. | UX-TEXT-05 |
| 17 | User-facing text carries no timestamp, level tag, module path, raw runtime error or stack trace at default verbosity. | UX-TEXT-07 |
| 18 | Never invent an error code. A code ships with its explain entry and the owner's approval. | UX-TEXT-12 |
| 19 | A T1 or T2 command refuses by default, on a TTY and without one, with a `Try: ` line (safe step) before an `Override: ` line. | UX-ACT-12 |
| 20 | Every T1 and higher command has `--dry-run` that writes nothing and refuses wherever the real run refuses, with the same code. | UX-ACT-13 |
| 21 | A T3 command needs the typed name or `--confirm=NAME`. `--yes` or `--force` alone never suffices. | UX-ACT-14 |
| 22 | A mutator prints one line per changed item, says when nothing changed, and never prints a change word for a change it did not make. | UX-ACT-15 |
| 23 | A new command is safe to repeat: same intent exits 0 and says it is already done, and a content conflict names `differs`. | UX-ACT-16 |
| 24 | Within one CLI `--force` means only "override a protective refusal". Consent has its own flag. | UX-ACT-17 |

SHOULD and CONSIDER rows (UX-CLI-03 to 07, 17 to 19, 23, 25, 27 to 31, UX-TEXT-23) are in the routed files. They never block, and a decline is not re-raised.

## The matrix

`checks/cli_matrix.py` runs the binary under bare invocation, `-h` with an empty `HOME` and no config, `--version`, a typo, a global flag after the subcommand, closed stdin, a pipe, `NO_COLOR`, `CLICOLOR_FORCE`, `TERM=dumb` and a pseudo-terminal, and a repeated `--dry-run` of each inventory command at T1 or above.

```sh
python3 -I "$CHECKS"/cli_matrix.py --bin "$BIN" --usage-code 64 --headline NAME \
  --flag-values flag-values.tsv --log-cmd "command that logs a warning" \
  --anim-cmd "command that shows progress" --anim-optout NAME_NO_ANIMATION \
  --probe probes.txt --decorative-allow decorative-colour.allow --inventory inventory.tsv
python3 -I "$CHECKS"/cli_matrix.py --bin "$BIN" --only net      # Linux, needs strace
python3 -I "$CHECKS"/cli_matrix.py --help
python3 -I "$CHECKS"/cli_matrix.py --self-test
```

| `--only` name | Rows | Needs |
|---|---|---|
| `bare` | UX-CLI-01, 28 | nothing |
| `help` | UX-CLI-02 | `--forwarding` for commands that forward arguments |
| `groups` | UX-CLI-03 | nothing |
| `shape` | UX-CLI-04 to 07 | `--headline` for 04 |
| `version` | UX-CLI-08 | nothing |
| `net` | UX-CLI-08 (network) | Linux and `strace`; it runs a control first |
| `typo` | UX-CLI-09 to 11 | nothing |
| `global` | UX-CLI-12 | `--flag-values` for the position half |
| `completion` | UX-CLI-13 | `--completion-cmd` when not top level |
| `color` | UX-CLI-20 | `--log-cmd` |
| `anim` | UX-CLI-21 | `--anim-cmd`, a POSIX pty |
| `palette` | UX-CLI-22 | `--decorative-allow`, `--probe` |
| `act` | UX-ACT-12 to 17 | `--inventory` (arguments, tab, tier, optional tab and refusal arguments) |

Exit 0 is clean, 1 is findings, 2 is a usage error. A check that lacks its input prints under `did not run:` and is never a pass. `--must-only` exits 1 on MUST findings alone. The matrix runs a T1 or higher command only with `--dry-run`, plus the refusal command the inventory names (which must refuse), in a throwaway copy of the tree. List a refusal command only when its state is local.

## Where the depth is

Read the one file that fits the task. Each opens with its dates and versions.

| You are doing this | Read |
|---|---|
| Writing or reviewing help text, bare invocation, `--version`, typo suggestions, global flags, a completion command or its registration | [references/help-and-recovery.md](references/help-and-recovery.md) (UX-CLI-01 to 13, 28, 30) |
| Writing an installer's output, a missing-config message, a next-step hint, a first-run script or a cargo-dist config | [references/first-run.md](references/first-run.md) (UX-CLI-14 to 19, 31) |
| Choosing colour, a spinner or progress bar, NO_COLOR handling, a TUI, an accessibility statement, an error's printed shape, a log line a user sees, an error code, or punctuation in CLI strings | [references/terminal-output.md](references/terminal-output.md) (UX-CLI-20 to 27, 29, UX-TEXT-05, 07, 12, 23) |
| Writing a command that deletes, overwrites, publishes or mutates state, or its `--dry-run`, `--force` or confirmation | [references/destructive-commands.md](references/destructive-commands.md) (UX-ACT-12 to 17) |

## Pinned defaults

House heuristics with no external source. An adopter overrides each once and says so.

- Root `-h` at most 60 lines; 2 to 5 root example lines; at most 5 examples per leaf in `--help` and 2 in `-h`.
- The first-run budgets: at most 3 commands from the install line to the headline output, and seconds at most 2x the previous release's median of three runs. A breach reports; it blocks only when the owner says so.
- The prefixes `error:`, `note:`, `help:`, `warning:`, `next:`, `Try: `, `Override: `, and the dry-run lines `would VERB TARGET` and `nothing to do`.
- The files `flag-values.tsv`, `decorative-colour.allow`, `no-next-step.txt`.
- The animation opt-out name is the owner's decision, one environment variable plus one config key (for example `MYTOOL_NO_ANIMATION`).

## Ask the owner

Do not decide these. Propose a default and ask.

- The headline command. It is also the installer's last line.
- Any rename or removal for UX-CLI-07 or UX-CLI-12 (`update` against `upgrade`, a position-dependent short flag). Propose a deprecation window.
- Changing an exit code scripts may depend on, or the format of the `--version` string.
- Plugin-hint wording and whether it advertises a registry. Installer policy: profile edits, `-y` defaults. Security wording in an unsigned-install warning.
- Colour policy: whether to honour `FORCE_COLOR`, and each row of `decorative-colour.allow`.
- The name and default of the animation opt-out, and a linear mode for a TUI.
- Any accessibility statement. It needs a human tester who uses a screen reader, and it is a legal and brand decision.
- Whether the first-run gate may block a release.
- The tier of a contested action, a repeat-run exit code of a shipped command, and a macOS or Windows host for the network check.

## What agents get wrong here

Ranked by how many measured defects each mechanism produced.

1. **Trusting a framework default.** `--version` that is not set, a required subcommand that exits 2, an `external_subcommand` that eats the suggester, a flag that is not `global`, a tracing layer that ignores the colour decision. Run the binary.
2. **Writing text that nothing executes.** Help examples, hints and installer last lines go stale. Append `-h` and run them.
3. **Assuming one switch covers another.** `NO_COLOR` is colour only. `--color=never` does not reach logs. `CI` and `TERM=dumb` are separate gates.
4. **Acting on CLI output as an instruction.** A typo hint that names an install command, an installer's last line that deletes the install, a refusal hint that offers only `--force`.
5. **Writing a check that cannot fail.** Run each check once against a known-good and a known-bad binary, and give a gate a control run.

## Siblings

- The language CLI contracts (`cli-contract.md` in each language quality reference skill) keep streams, exit codes, TTY detection, signals and the colour decision order. They point here for help layout, `--version`, typo suggestions, first-run messages, palette and animation choices, error wording and destructive-command confirmations.
- `shell-integration` owns completion registration per shell (SH-EMIT-33 to 39). `installer-script` owns how an installer verifies, extracts and edits PATH; its last line is UX-CLI-14.
- `ux-agent-interfaces` owns JSON output, MCP tools and agent approval. `ux-quality-reference` owns the tier scale, the action inventory and the shared error-wording rows. `ux-review` runs this skill's matrix when it reviews a CLI.
- `code-docs` (SRF) owns what text that renders into help must not contain. UX-CLI-05 and 06 own what it must contain.
