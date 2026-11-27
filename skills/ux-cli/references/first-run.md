---
title: The path from the installer to the first success
summary: The UX-CLI rows for the installer's last line, the missing-config message, text a CLI tells the user to run, next-step lines, warnings on success paths, the first-run script and the cargo-dist success message
---

# The path from the installer to the first success

Owns what a person or agent sees from the end of the install to the first useful result: the installer's last line, the message for a missing project or config file, every command the CLI prints for a user to run, and the first-run measurement. Rows UX-CLI-14 to 19 and 31. How an installer verifies, extracts and edits PATH is the `installer-script` skill's; this file owns only what its last line says. Help layout is `help-and-recovery.md`'s (a sibling file of this skill).

Contents: [Dates and versions](#dates-and-versions) · [Variables](#variables) ·
[The headline command](#the-headline-command) · [Rows](#rows) ·
[UX-CLI-14 check](#ux-cli-14-check) · [Examples](#examples) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and versions

Measured 2026-11-27 in clean containers with a temporary `HOME`, against 12 exemplar CLIs and the installers of two measured CLIs.

| Fact | Source and date | Re-check |
|---|---|---|
| `install-success-msg` is cargo-dist's only installer-output setting (since 0.15.0). It prints before the PATH block in both generated installers. | dist config reference, undated, fetched 2026-11-27; changelog through 0.34.0 (2026-11-01) lists no post-install hook; dist 0.33.0 measured, the shell installer run and the powershell installer read from generated source, not run | each cargo-dist minor, at most every 6 months: search the changelog for `post-install`, `hook` and `success-msg`, then regenerate a scratch installer and check whether the PATH block still prints after the message |
| The location of the generated `env` helper depends on the layout and the dist version | measured on a published 0.17.0-era shell installer, 2026-11-27 | with the row above |
| No independent time-to-first-success benchmark exists. The only numbers are vendor figures (Fern, July 2026; Instruqt, undated). | searched 2026-11-27 | every 12 months: search for a peer-reviewed or independent CLI first-run study and revisit both budgets |
| Exemplar installers' last lines (deno and bun document `--version` or `--help`; one prints a working command by absolute path) | measured 2026-11-27 | every 12 months |

**Pinned defaults**, each overridable once by an adopter: the file names `no-next-step.txt` and `next:` prefix for UX-CLI-17, the first-run budgets of UX-CLI-19 (at most 3 commands, and seconds at most 2x the previous release's median of three runs), and the `help:` and `warning:` prefixes. The budgets are this skill's own, not a standard.

## Variables

`BIN` is the binary, `NAME` its name, `INSTALL` the documented install command, `CHECKS` the `.claude/skills/ux-cli/checks` directory.

## The headline command

Each CLI has one declared headline command, the first thing the product does for a new user. The owner declares it once. It is checked in the help command list (UX-CLI-04), as the first example (UX-CLI-05) and as the installer's last line (UX-CLI-14). With three different definitions in a repository, the three surfaces drift apart, as one measured README and site did. Propose the README Quick Start's first command and ask the owner.

## Rows

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-CLI-14 | The installer's last non-blank success line is the headline command, in a form that runs in the user's current shell. Either the activation is prefixed (`. "$HOME/.mytool/env.sh" && mytool ...`) or the binary is given by absolute path. An activation line, if any, comes before it. No `warn:`, `error:`, uninstall or community line comes after it. A re-run prints the same block, not only "already installed". For a cargo-dist installer, `install-success-msg` is not enough, because the generated script prints its PATH block after that message. A wrapper script or post-install step that the project owns prints the last line. It names the headline command by absolute path, built from the install-dir variable, not by a PATH lookup or a sourced helper. Home: the `installer-script` skill. | No measured installer ends on a command that does the product's job. Only deno's printed command works before PATH is live. One measured installer's last line is `rm -rf` of its install home, so the last command an agent extracts from a successful install deletes it. cargo-dist 0.33.0 prints its PATH block after the success message, so the shell installer's last line is `source $HOME/.cargo/env.fish (fish)` even with a custom message. | Never pass the installer's line to a shell. The five steps in the next section. | MUST |
| UX-CLI-15 | A command that needs a missing project or config file states what was not found, where it looked, and the exact command that creates it, then exits with the pinned not-found code. | 3 of 8 measured tools name the fix. gh's `gh auth login` is the shape to copy. One measured CLI says only `no config found by walking up from the working directory`. | In an empty directory, run each project-scoped verb as `"$BIN" verb </dev/null 2>&1`. Each output contains the documented creating command (`init`). See block UX-CLI-15. | MUST |
| UX-CLI-16 | Every command line that the CLI or its installer prints for a user to run is pinned by a test that appends `-h` and expects exit 0. That covers help examples, error and warning hints, next-step lines, the installer's last line, and pointers in help text ("completions live under ..."). | Text that nothing executes goes stale, and the parse error comes before help, so the test has no side effects. One of 11 measured next-step hints named a command that does not exist, and a unit test pinned the wrong text. | See block UX-CLI-16. Test 2 runs the same check on the UX-CLI-05 examples and on step 3 of the UX-CLI-14 check. | MUST |
| UX-CLI-17 | A state-changing command with one dominant next step ends with one line that names it (for example, `mytool init`, then `next: mytool add REF`). With no dominant next step, it prints nothing extra, and the repository lists that verb as having none. | clig.dev says both "Suggest commands the user should run" and "err on the side of less". One line, only when one step dominates, satisfies both. | The repository keeps `no-next-step.txt`, one verb per line. In a clean directory, run each state-changing verb. Its last stderr line matches `^next: NAME ` and the named command passes UX-CLI-16, or the verb is in the file. A verb that is neither is a finding. | SHOULD |
| UX-CLI-18 | A condition the user must act on, reported on a success path, prints as a result row or as a `warning:`-prefixed human line. It prints once per run, with no timestamp or log formatting at default verbosity. A security-relevant statement, such as an install without signature verification, is a `warning:` line. | One measured CLI's no-client notice is a timestamped `WARN` log line. Another prints its unsigned-install line unprefixed on every install, which trains users to skip the one security line. | See block UX-CLI-18: the first prints `0`, the second starts with `warning:`. | SHOULD |
| UX-CLI-19 | Each CLI repository ships a first-run script that runs the documented install line in a clean container. It records three numbers: commands from the install line to the first headline output, installer seconds, and first-result seconds. CI runs it per release and reports two house-heuristic budgets: at most 3 commands (install, a required activation, the headline), and seconds at most 2x the previous release's median of three runs. A breach is a finding. It fails the build only if the owner has made the gate blocking. | The only published numbers are vendor figures. Both budgets are this skill's own. Seconds from one host vary by network, while command counts and ratios are stable. Measured baselines: 3 commands in about 11 s and about 4 s for two CLIs. | `ls scripts/first-run*` finds the script, the CI step runs, and its output has the three numbers and the two budget results. | SHOULD |
| UX-CLI-31 | A project that ships a cargo-dist installer sets `install-success-msg` to its headline-command line, so the success line is useful when the generated installer runs directly. This does not satisfy UX-CLI-14 on its own. | It costs one config line. Measured with dist 0.33.0: the setting replaces `everything's installed!` in both the shell and powershell installers. The owner sets the text together with the headline command. | See block UX-CLI-31. | SHOULD |

```sh
# UX-CLI-15: run in an empty directory; each output must name the creating command
"$BIN" verb </dev/null 2>&1 | grep -c -F -e "$NAME init"
# UX-CLI-16 test 1: list every command the CLI tells a user to run; replace each placeholder with a fixture,
# append -h, run it, and expect exit 0
git ls-files -z --cached --others --exclude-standard -- ':(glob)src/**/*.rs' \
  | xargs -0 -r grep -h -o -E -e '`mytool [^`]+`' -- | sort -u
# UX-CLI-18: any timestamped line at default verbosity is a finding (0 is the pass)
"$BIN" command 2>&1 | grep -c -E -e '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
"$BIN" command 2>&1 | grep -n -F -e 'without signature verification'
# UX-CLI-31: the config line, then the built installers
git ls-files -z -- dist-workspace.toml dist.toml | xargs -0 -r grep -H -n -F -e 'install-success-msg' --
find target/distrib -name '*-installer.sh' -o -name '*-installer.ps1' | xargs grep -c -F -e "everything's installed" --
```

A wrapper that prints the last line after `sh "$tmp" "$@"` for a cargo-dist installer, measured as the last line for the default directory and for a custom install-dir variable (it carried a `next: ` prefix, which step 2 below rejects, so the printed line has none; that exact text was not run):

```sh
printf '%s/bin/mytool init\n' "${MYTOOL_INSTALL_DIR:-$HOME/.cargo}"
```

## UX-CLI-14 check

Never pass the installer's line to a shell. Run in a clean container with a temporary `HOME`.

1. Capture the combined output of `INSTALL` with the installer's default PATH handling, not `--no-modify-path`: `sh -c "$INSTALL" > out.txt 2>&1`. Repeat with the install-dir variable set to a second temporary directory. The binary path in the last line starts with that directory.
2. The last non-blank line matches the shape below. Print it with the first block.
3. Run only the installed binary, by absolute path, with the words after `NAME` and `-h` appended. It exits 0. This proves the line parses. Whether the headline succeeds (network, project, prompt) is not checked.
4. The last 3 lines have 0 lines that start with `warn`, `error` or `warning`.
5. Run the installer twice and compare the last 3 lines.

```sh
grep -v '^$' out.txt | tail -1
grep -v '^$' out.txt | tail -1 | grep -c -E -e "^ *(\. \"[^\"]+\" && )?(/[^ ]+/)?$NAME [a-z]"
grep -v '^$' out.txt | tail -3 | grep -c -i -E -e '^(warn|error|warning)'
```

On a cargo-dist installer that sets only `install-success-msg`, the first command prints a `source $HOME/.cargo/env...` line and the row fails.

## Examples

An installer ending that fails UX-CLI-14 (a verify command, then a line that deletes the install):

```text
mytool 1.4.0 installed to /home/u/.mytool/bin
Run `mytool about` to verify.
Join our Discord: https://example.com/chat
rm -rf /home/u/.mytool-installer-tmp
```

The ending that passes. The activation comes first, the headline command is last, and it runs before PATH is live:

```text
mytool 1.4.0 installed to /home/u/.mytool/bin
. "/home/u/.mytool/env.sh" && mytool init
```

A missing-config message that passes UX-CLI-15, and one that fails it:

```text
error: no mytool.toml found in /tmp/e or any parent directory
help: run `mytool init` to create one
```

```text
/tmp/e: no config found by walking up from the working directory
```

## What Agents Get Wrong Here

- **Running the installer's last line.** The line is text from a script. For one measured installer it is `rm -rf` of the install home. Match its shape and run only the product binary with `-h` appended.
- **Believing `install-success-msg` ends the installer.** The PATH block prints after it. The project's wrapper prints the last line.
- **Ending on celebration.** `Installation complete!`, a Discord link, an uninstall line or a verify command (`--version`, `about`) as the last line. A verify command proves the install, and only a job command proves the value.
- **Writing text nothing executes.** Help examples, error hints, next-step lines and pointers go stale with no failing test. An agent recommends a command by analogy with other CLIs (`install` for a package manager that has `add`). Append `-h` and run it.
- **Hard-coding seconds.** A budget copied from one CI run breaks on the next network. Use command counts and ratios.
- **Printing a security notice as an info log.** The unsigned-install line is a `warning:` line, once per run, with no timestamp.
- **Reporting nothing.** A state-changing command with one obvious next step prints it. A command with none prints nothing extra, and its verb goes in `no-next-step.txt`.
