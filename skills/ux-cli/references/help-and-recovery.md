---
title: Help, version, typo recovery, global flags and completion
summary: The UX-CLI rows for bare invocation, help layout, the version flag, typo suggestions, global-flag position and the completion generator, with the binary checks that prove them
---

# Help, version, typo recovery, global flags and completion

Owns what a CLI prints when a person runs it with no arguments, with `-h`, with `--version`, with a mistyped command or with a flag in the wrong place. Rows UX-CLI-01 to 13, 28 and 30. The stream, colour, prompt and exit-code contracts are the language CLI-contract rules'. This file starts above them: it assumes `-h` works and asks whether it helps a first-time reader. The first-run path is `first-run.md`'s, terminal output is `terminal-output.md`'s, and destructive commands are `destructive-commands.md`'s (this skill's siblings).

Contents: [Dates and versions](#dates-and-versions) · [Variables](#variables) ·
[Help and invocation](#help-and-invocation) · [Version, typos, global flags](#version-typos-global-flags) ·
[Completion](#completion) · [The network gate off Linux](#the-network-gate-off-linux) ·
[How the matrix reads help](#how-the-matrix-reads-help) · [Examples](#examples) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and versions

Measured 2026-11-27 against git 2.43.0, clap 4.6.x, gh 2.105.0 and 12 exemplar CLIs, unless a row says otherwise.

| Fact | Source and date | Re-check |
|---|---|---|
| clap's `version`, `Arg::global`, `suggestions`, `external_subcommand`, `after_help` and derive behaviour | clap 4.6.10 changelog, 2026-11-24 | each clap minor release, at most every 6 months: re-run the matrix |
| Suggestion wording: git `The most similar command is`, clap `tip: a similar subcommand exists`, cobra `Did you mean this?` | measured: git 2.43.0, clap 4.6.x, gh 2.105.0 | each framework major: run the typo check against a known-good CLI; a drop to 0 matches needs a new alternative |
| Root `-h` median 62 lines over 14 CLIs; headline in the first 6 rows for 9 of 12 | measured 2026-11-27 | every 12 months, on the same exemplars |
| clap_complete dynamic mode sits behind `unstable-dynamic`; `aot` replaces `generator` | clap_complete 4.6.12, docs.rs, fetched 2026-11-27 | every 6 months |
| Completion registration forms, `shell-integration` Step 6 (SH-EMIT-33 to 39) | measured 2026-10-11 | every 6 months |
| git `help.autoCorrect` modes, including `prompt` | git help.adoc, undated; manual 2.56.1 | every 24 months |
| cobra gives a leaf the same help for any extra argument ("subcommands will always accept arbitrary arguments") | cobra args.go, fetched 2026-11-27; cobra v1.10.2, 2025-12-04 | each cobra or gh minor: re-run the parser contract below |
| GNU `--version` page updated 2026-04-27; GNU `--help` page covers the explicit flag only | gnu.org, fetched 2026-11-27 | every 12 months |
| `sandbox-exec` deprecated since 2017 and its profile language undocumented; sandbox denials logged under `com.apple.sandbox.reporting`; Windows event 5157 | man page 2017; Apple DTS forum thread 124284, October 2019; Apple App Sandbox page, undated; Microsoft Learn event 5157, updated 2026-04-27 | every 12 months, or on the first real macOS or Windows run |

clig.dev is an undated community guide. **Pinned defaults** (house heuristics, each overridable once by an adopter): root `-h` at most 60 lines, 2 to 5 root example lines, at most 5 examples per leaf in `--help` and 2 in `-h`.

## Variables

`BIN` is the binary under test. `USAGE` is the CLI's pinned usage exit code (64 in the sysexits-aligned tables). `CHECKS` is `.claude/skills/ux-cli/checks` (`$CLAUDE_CONFIG_DIR/skills/ux-cli/checks` when installed globally). Run every check from an empty temporary directory with `HOME` set to an empty directory, stdin from `/dev/null`, `NO_COLOR=1` and `PAGER=cat`. `cli_matrix.py` does this for you.

## Help and invocation

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-CLI-01 | Bare invocation of the root ends on its own with a usage text. It never starts a REPL, wizard or prompt, never reads stdin, and never touches the network or the project. Exit code and stream: UX-CLI-28. | deno's bare REPL blocks an agent or CI shell that has a pty. 13 of 14 measured CLIs print help instead. | `cli_matrix.py --only bare`: ends within 10 s on closed stdin and within 5 s on a pty, and prints `usage`. Network, Linux: `--only net` (UX-CLI-08 gate). | MUST |
| UX-CLI-02 | Help on every command path needs no config, credentials, network or project. `-h` never names another flag. `<path> <valid-flag> -h` still shows help. A command that forwards trailing arguments shows `--` or `<ARGS>...` in its usage line. | `docker run -h` is `--hostname` (exit 125). `git commit -h` dies outside a repository (exit 128). | `cli_matrix.py --only help --forwarding run,exec`: every path answers `-h`, `--help` and `<first no-value flag> -h` with exit 0 and a `Usage` line on stdout. | MUST |
| UX-CLI-03 | A group with no subcommand and a missing required argument behave alike: help on stderr and the pinned usage exit code. Override clap's default exit 2 for a missing subcommand. | 7 group behaviours across 7 CLIs. One measured CLI mixes 64 and 2 across its groups. | `cli_matrix.py --only groups`. | SHOULD |
| UX-CLI-04 | The declared headline command is within the first 5 rows of the root command list, or under a heading named Common, Main, Basic or Core. A list longer than 12 rows is ordered by workflow through an explicit `display_order`, `subcommand_help_heading` or `help_template`, never by definition order. | 9 of 12 exemplars put it in the first 6 rows. Two measured Rust CLIs list in clap definition order. | `cli_matrix.py --only shape --headline NAME` checks position. The ordering clause is read. | SHOULD |
| UX-CLI-05 | Root `-h` carries an Examples block of 2 to 5 lines, headline task first. Each of the 5 most-used leaves carries an Examples block in `--help` (at most 5) and shows its first example in `-h` (at most 2). All counts are house heuristics. Examples go in `after_help` or `after_long_help`, never in a flag's doc comment. A custom `help_template` keeps `{after-help}`. | Users reach for examples first (clig.dev). 0 of 14 measured root helps lead with them, and two measured CLIs have none. The counts have no source. | `cli_matrix.py --only shape` counts the root block. Leaves and templates: see block UX-CLI-05. | SHOULD |
| UX-CLI-06 | Root `-h` is at most 60 lines and still holds usage, examples and commands. `--help` may be longer. The 60 is a house heuristic. | The median of 14 hand-chosen CLIs is 62 lines. One measured `--help` is 126 lines, with 13 global options before any command. | `cli_matrix.py --only shape`. | SHOULD |
| UX-CLI-07 | Use one verb per meaning at each level. Never ship `update` next to `upgrade`, or two of `remove`, `delete` and `rm`, `create` and `new`, `list` and `ls`, unless their descriptions state the difference. Groups are nouns and leaves are verbs. A group leaf that reuses a top-level name states the difference in its description. | clig.dev names update and upgrade as confusing. Heroku CLI style guide (updated 2025-01-31): topics are nouns, commands are verbs. NN/g heuristic 4 (reviewed 2024-01-30): users should not have to wonder whether different words mean the same thing. | Gate: `cli_matrix.py --only shape` fails on synonym pairs at any level. Review step: the same run prints `REVIEW` for each leaf name that also exists at the top level; read both descriptions. | SHOULD |
| UX-CLI-28 | Bare invocation of the root prints the same text as `-h` on stdout and exits 0. A trailing blank line is tolerated. | The existing choice of the two CLIs measured. 8 of 14 measured CLIs exit 0 and 10 of 14 use stdout. No source states the code: GNU covers only the explicit `--help` flag. | `cli_matrix.py --only bare` (compares non-blank lines of stdout). | SHOULD |

```sh
# UX-CLI-05 leaves: every example line must parse. Run the printed command with -h appended; exit 0 is the pass.
"$BIN" -h | awk '/^(EXAMPLES|Examples):?$/ {f = 1; next} /^[A-Za-z]/ {f = 0} f && NF'
# UX-CLI-05 templates: each hit must also contain {after-help}
git ls-files -z --cached --others --exclude-standard -- ':(glob)src/**/*.rs' \
  | xargs -0 -r grep -H -n -F -e 'help_template' --
```

## Version, typos, global flags

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-CLI-08 | `--version` prints exactly one line, `<name> <semver>[ extra]`, on stdout and exits 0. It writes nothing on stderr and makes no network call or update check. `-V` is the same (SHOULD). A `version` subcommand may exist only in addition to the flag. In clap, put `version` in the root `#[command(...)]`. | Scripts and package managers probe the flag first. GNU 4.8.1 (updated 2026-04-27) wants the name and version on stdout and a successful exit. clap adds `-V` and `--version` only when a version is set. | `cli_matrix.py --only version` for the output. Network: `--only net` on Linux, with its control run. macOS and Windows: see the section below. | MUST |
| UX-CLI-09 | An unknown command, at the top level and under every group, prints 1 to 3 nearest-name candidates and exits with `USAGE`. An unknown flag prints the nearest flag where the framework supports it (SHOULD; cobra has no flag suggester). | clig.dev: "If the user did something wrong and you can guess what they meant, suggest it." docker and one measured CLI give no top-level suggestion. | `cli_matrix.py --only typo --usage-code 64`. For each name at each level it builds a one-edit typo: drop the last letter, or double it when the shortened word is under 2 characters or is itself a name (`ls` becomes `lss`). Each run must match `similar` or `did you mean`, case-insensitive, and exit `USAGE`. | MUST |
| UX-CLI-10 | A plugin or external-subcommand dispatcher runs the nearest-name check against the built-ins before it prints any install hint. It never prints an install command built from raw user input unless that name resolves in the plugin index. | clap's `external_subcommand` swallows clap's suggester. One measured CLI turned a built-in typo into `mytool --global add example.com/mytool/<typo>`, a command a user or agent may run. All 23 of its top-level typos did this. | `cli_matrix.py --only typo` flags any line that holds the typo and an `add`, `install`, `get` or `pull` word. Pin it as an integration test. | MUST |
| UX-CLI-11 | Never run a corrected, guessed or prefix-matched command or flag by default. Keep clap's `infer_subcommands` and `infer_long_args` off. Auto-run may exist only as a documented opt-in, only when exactly one candidate exists, and it prints a stderr warning that names both words. | "Assuming what they meant can be dangerous, especially if the resulting action modifies state" (clig.dev). git's default is to show the suggestion. npm ran `install` for `instal` and resolved `--sav` to `--version`. | `cli_matrix.py --only typo` compares file contents of `HOME` and the working directory before and after each typo. Source: see block UX-CLI-11. | MUST |
| UX-CLI-12 | Every flag documented as global works before and after the subcommand, with the same meaning. No short flag names a different long flag below the root. This is the behavioural test for the language CLI contracts' one-flattened-args rule. | "If possible, make arguments, flags and subcommands order-independent" (clig.dev). Agents copy command lines from docs in either order. One measured CLI rejected four documented globals after all 23 top-level subcommands (92 of 92 runs), and its `-g` meant `--global` at the root and `--group` in 10 command paths. | `cli_matrix.py --only global --flag-values flag-values.tsv`. The project keeps `flag-values.tsv` (**pinned** name): one row per documented global flag, flag, tab, one real value (`--format`, tab, `json`; `--offline`, tab, nothing). Each flag runs before and after each top-level subcommand with `--help`; every run exits 0. The same check prints each short flag whose long name differs from the root's. | MUST |

```sh
# UX-CLI-11: any hit is a finding
git ls-files -z --cached --others --exclude-standard -- ':(glob)src/**/*.rs' \
  | xargs -0 -r grep -H -n -E -e 'infer_subcommands|infer_long_args' --
```

## Completion

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-CLI-13 | Ship one completion generator. It is listed in root `--help` under a name that resolves, and it prints only the script on stdout with exit 0. An unknown shell exits with `USAGE`. Registration in the user's shell: UX-CLI-30. | The output is eval'd or stored, so any extra byte corrupts the shell. All six measured generators write 0 bytes on stderr. docker and uv do not list theirs, and one measured CLI points to the wrong group. | `cli_matrix.py --only completion` (add `--completion-cmd "shell completion"` when the command is not top level). | MUST |
| UX-CLI-30 | The install docs register completions in the form `shell-integration` Step 6 gives per shell (SH-EMIT-33 to 39). A stored script is regenerated on upgrade, or the docs tell the user to re-run the generator after an upgrade. | `shell-integration` is the home for registration. It accepts a stored bash file or an eager `eval` of a captured string, and bans `source <(...)` for bash (SH-EMIT-34). clap_complete warns that a dynamic-mode script mismatches the binary after an upgrade, but that mode sits behind `unstable-dynamic` (4.6.12), so for static scripts the measured risk is that new commands go missing. | Run the `shell-integration` read-back kit (`readback-*.sh` under its `references/completions/`) on each documented form. Review step: see block UX-CLI-30. | SHOULD |

```sh
# UX-CLI-30: the completion section of the install docs needs a hit
git ls-files -z --cached --others --exclude-standard -- ':(glob)docs/**/*.md' ':(glob)README.md' \
  | xargs -0 -r grep -H -n -i -E -e 'upgrade|regenerat|re-run' --
```

## The network gate off Linux

The no-network clause of UX-CLI-08 is gated on Linux only. `cli_matrix.py --only net` runs `strace -f -qq -e trace=connect` over the bare invocation, `--version` and `-V`, and counts `AF_INET` and `AF_INET6` lines. It first runs a control (a Python connect to 192.0.2.1; a curl to the same address counted 1 connect on 2026-11-27) and reports `did not run` when the control sees none, because a 0 from a broken grep proves nothing. It never reports a Linux pass for another platform.

- **macOS, not run.** Both commands run in the same session. In one shell: `log stream --style compact --predicate '((processID == 0) AND (senderImagePath CONTAINS "/Sandbox")) OR (subsystem == "com.apple.sandbox.reporting")' > deny.log`. In another: `sandbox-exec -p '(version 1)(allow default)(deny network*)' "$BIN" --version`. It must exit 0 with the same one line, and `grep -c 'deny(1) network' deny.log` must print `0`. Record the macOS version and the date.
- **Windows, no command here is verified.** Event 5157 (outbound, `Application` equal to the binary path) records an attempted connection. The audit-enable and event-read commands were not fetched.
- **With neither run**, record that the `--version` path has no platform branch: search the modules on that path for `cfg(windows)`, `cfg(target_os` and `cfg(unix)`, and expect no hit.

A dead-proxy test (point `HTTPS_PROXY` at a closed port) was not adopted: a client that ignores proxy variables passes it too, so it cannot yet tell a pass from a fail.

## How the matrix reads help

The matrix reads the clap and cobra layout by shape, not by depth. A line is a command row only inside a block whose heading line is title-case words ending in `Commands:` or all-caps ending in `COMMANDS`, and only when the row is indented by 2 or more spaces and starts with a lowercase name. Prose is never read as a command. A child whose `-h` output equals its parent's is not a command, and the walk raises an alarm at 8 words instead of capping depth. A changed parser passes only when all four hold, measured 2026-11-27: `subs` on `gh attestation download` prints nothing; on `gh pr` it contains `update-branch`; on `cargo` it lists 16 names; and a capped walk and the uncapped walk agree on the path count (gh 244, docker 163). The parser does not read a lowercase `commands:` heading, a one-space indent or a heading-less list (npm, git), so those CLIs are not walked. Self-test: `python3 -I "$CHECKS"/cli_matrix.py --self-test`.

## Examples

A root help that passes UX-CLI-04 to 06 and 28 (the headline command is row 1, examples come last, 18 lines):

```text
mytool 1.4.0
Fetch and run developer tools

Usage: mytool [OPTIONS] <COMMAND>

Commands:
  exec        Run a command in a tool's environment
  add         Add a tool to this project
  config      Read and write settings
  completion  Print a shell completion script
  help        Print this message

Options:
      --format <FORMAT>  Output format
  -h, --help             Print help
  -V, --version          Print version

Examples:
  mytool exec node@24 -- node --version
  mytool add node@24
```

The clap defaults that fail UX-CLI-08, UX-CLI-12 and UX-CLI-03 without a compiler error:

```rust
// wrong: no `version`, so -V and --version do not exist; the flag is not global;
// a required subcommand exits 2 on bare invocation
#[derive(Parser)]
#[command(about = "Fetch and run developer tools")]
struct Cli {
    #[arg(long)]
    format: Option<String>,
    #[command(subcommand)]
    command: Commands,
}

// right: version in the root command, the flag global, the subcommand optional so bare invocation prints help
#[derive(Parser)]
#[command(about = "Fetch and run developer tools", version)]
struct Cli {
    #[arg(long, global = true)]
    format: Option<String>,
    #[command(subcommand)]
    command: Option<Commands>,
}
```

A typo that passes UX-CLI-09 and UX-CLI-10 prints a name and nothing to run:

```text
error: unrecognized subcommand 'instal'

  tip: a similar subcommand exists: 'install'
```

## What Agents Get Wrong Here

- **Trusting a framework default.** An agent writes `#[command(about)]` with no `version` and believes `--version` works. It makes a subcommand required and believes the group exits with the usage code (clap exits 2). It adds `external_subcommand` and loses the suggester. It documents a flag as global and omits `global = true`. Run the binary, not the source.
- **Writing a check that cannot fail.** A case-sensitive `grep 'did you mean'` misses cobra's `Did you mean this?`. A `grep -c` on `--version` passes a multi-line output. A depth cap on a help walk hides a parser loop instead of fixing the parse. A script that opens its input table after `cd` into a temporary directory fails to open a relative path and still exits 0. A network gate with no control run cannot tell 0 connects from a broken grep. Run each check once against a known-good and a known-bad binary.
- **Copying exemplar anti-patterns.** Starting a REPL on bare invocation (deno). Resolving prefixes (npm). Putting `-h` on another flag (`--host`).
- **Acting on a suggestion as an instruction.** A typo hint that names an install command is text built from unvalidated input. Treat every suggestion line as a candidate name, never as a command to run unconfirmed.
- **Adding a name without an inventory of the existing names.** `upgrade` beside `update`; a short flag that means one thing at the root and another below it. List the names first.
