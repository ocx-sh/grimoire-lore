---
title: Destructive and mutating commands - refusal, dry run, typed confirmation and honest reports
summary: The UX-ACT rows for a CLI command that deletes, overwrites or publishes - refuse by default, --dry-run that fails where the real run fails, typed confirmation for T3, change reports, repeat runs and one meaning for --force
---

# Destructive and mutating commands

Owns how a CLI command that changes state behaves when a person, a script or an agent runs it. Rows UX-ACT-12 to 17. The tier scale (T0 reversible, T1 lossy, T2 external, T3 catastrophic), the action inventory and the `Consequence:` help line are the `ux-quality-reference` skill's `actions.md`; this file uses the tiers and does not redefine them. Approval of agent tool calls is `ux-agent-interfaces`. Exit-code classes and the error envelope are the language CLI-contract rules'. The wording and layout of a rendered error is `terminal-output.md` (a sibling file of this skill).

Contents: [Dates and versions](#dates-and-versions) · [Variables](#variables) ·
[What each tier gets in a CLI](#what-each-tier-gets-in-a-cli) · [Rows](#rows) ·
[Checks](#checks) · [Examples](#examples) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and versions

Measured 2026-11-27 with git 2.43.0, cargo 1.96.0, uv 0.13.9 and two other CLIs, in a throwaway HOME. 81 runs of the network mutators of the two measured CLIs, against a local `registry:2` with stdin closed and no controlling terminal, never prompted or hung (slowest 3.028 s). `unverified: no pty harness`, so TTY prompt paths are unmeasured. A registry that accepts and then stalls, or answers 429 or 503, and authenticated registries were not run.

| Fact | Source and date | Re-check |
|---|---|---|
| clig.dev mild, moderate and severe tiers, `--confirm=NAME`, dry run, idempotency | clig.dev, undated | every 12 months |
| git refuses `clean` without `-f` or `-n`; `Would remove d/` | git-clean, git 2.45.0 | every 12 months: grep each tool's `--help` for `--dry-run`, `--yes`, `--force` and `--confirm` |
| gh needs `--accept-cascading-deletion-of-private-forks` on top of `--yes` | gh repo delete manual, current | with the row above |
| kubectl server dry-run runs every stage except storage | Kubernetes API concepts, v1.37 | with the row above |
| Terraform `-detailed-exitcode` (0 none, 1 error, 2 changes); apply finishes a partial run; `-input=false` fails rather than prompting | terraform plan and apply, v1.17.x, re-fetched 2026-11-27 | with the row above |
| AWS EC2: same-token retry succeeds, mismatch is `IdempotentParameterMismatch`, `TerminateInstances` idempotent | AWS EC2 idempotency page, undated | every 12 months |
| npm `--dry-run` is "NOT honored by other network related commands" | npm publish docs, v11.21.3 | every 12 months |

**Pinned conventions** (house conventions with no external source, fixed so that the check is binary; each overridable once by an adopter): the `Try: ` and `Override: ` refusal lines, the `would VERB TARGET` and `nothing to do` dry-run lines, the `unchanged`, `already absent` and `kept` words, and the `Confirm with:` or `See also:` help line.

## Variables

`BIN` is the binary, `CHECKS` the `.claude/skills/ux-cli/checks` directory. Run every check in a throwaway `HOME` and project directory. `before.txt` and `after.txt` hold `find . -type f -exec sha256sum {} +` output sorted (`shasum -a 256` on macOS). The matrix reads an inventory TSV with one row per action: arguments, tab, tier, and optionally a tab and the arguments that hit a refusal in the throwaway tree. Provide the refusal column only for commands whose refusal state is local.

## What each tier gets in a CLI

A CLI refuses without a flag and does not prompt. A T1 or T2 command behaves the same on a TTY and without one: it refuses, names the safe next step, then names the override flag. A prompt may be added on a TTY as a convenience, never in place of the refusal. The language CLI-09 rule (TTY gate plus `--yes` and `--no-input`) applies from the moment a command gains a prompt. A command that never prompts needs neither flag. With identical behaviour a script never hangs, and an agent and a person read the same contract.

| Tier | CLI treatment, person or script |
|---|---|
| T0 | No prompt. Prints what changed. `--dry-run` optional. |
| T1 | Refuses by default. The safe step, then `--force` with its consequence. `--dry-run` required. |
| T2 | As T1, plus an explicit target argument and a dry run that prints the remote destination. |
| T3 | As T2, plus the typed name or `--confirm=NAME`. `--yes` or `--force` alone never suffices. One extra named flag per extra consequence. |

## Rows

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-ACT-12 | A T1 or T2 command refuses by default, on a TTY and without one, unless its override flag is passed. The refusal exits nonzero with a code from the CLI's pinned table, at once and without reading stdin. Its message has this layout on stderr (house convention): a first line naming the conflicting state, then a line starting `Try: ` with the safe next step, then a line starting `Override: ` with the flag and what it loses. A TTY prompt may be offered on top of the refusal, never instead of it. The refusal needs no `--yes` or `--no-input`. | An agent waits forever on a prompt, and a hint that offers only `--force` turns a conflict into an overwrite: one measured `release` command names `--force` as the only remedy for a tag conflict, and moving a published tag is T2. The fixed labels make "safe step first" a line-order check. One measured `update` exited 65 on a locally edited artifact but had already re-pinned its lock file. | `cli_matrix.py --only act --inventory inventory.tsv`, with the refusal column set: nonzero and not a hang, one `Try: ` line before one `Override: ` line, the `Try: ` line free of override flags, files unchanged. See block UX-ACT-12. | MUST |
| UX-ACT-13 | MUST: every T1 or T2 or T3 command has `--dry-run`, which runs the same validation path, writes nothing, and describes each planned change. Where the real run would refuse (a conflict, a locally modified target), the dry run refuses too, with the same exit code. SHOULD (house convention): it prints one `would VERB TARGET` line per planned change (the absolute path or the full remote reference), prints `nothing to do` when the plan is empty, and exits 0 whether or not work is pending. A preview that signals pending work through its exit code does so only behind its own named flag, and its help documents that code. | kubectl server dry-run runs every stage except storage, so the preview cannot disagree with the real run. clig.dev defines `--dry-run` as "do not run the command, but describe the changes that would occur". The line format follows `git clean -n`; `nothing to do` and exit 0 have no source. Terraform's `-detailed-exitcode` is the sourced alternative for the empty-plan signal. One measured `release --dry-run` skipped the tag-conflict check: the real run exited 65, the dry run exited 0 and showed a plan that would fail. | `cli_matrix.py --only act`: `--dry-run` listed in help, files unchanged, two runs equal, stdout non-empty on exit 0, and the dry run's exit code equals the real run's on the refusal row. Hand check: see block UX-ACT-13. | MUST |
| UX-ACT-14 | A T3 command takes the target name typed on a TTY and `--confirm=NAME` without one. A mismatched value exits nonzero and changes nothing. `--yes` or `--force` alone never satisfies it, and each further consequence needs its own named flag. | clig.dev's severe tier. gh needs `--accept-cascading-deletion-of-private-forks` on top of `--yes`. A typed name stops an accident by a person or script, and an agent can type it as easily as `--yes`. No measured CLI has a T3 command. | See block UX-ACT-14: both runs exit nonzero and the status command shows the state unchanged. | MUST |
| UX-ACT-15 | Every mutating command prints one line per changed item to the result stream (`created X`, `removed X`, `set K to V`). When nothing changed, it says so (`unchanged X`, `already absent X`, `nothing to remove`). It never reports a change that did not happen: a change word (`added`, `updated`, `pushed`, `installed`, `removed`, `created`) names only a change this run made, a run that keeps existing state says `unchanged` or `kept`, and a refused run prints no change word for the work it refused. Each mutator names, in its help, a read-only command that shows the end state. | Exit 0 with empty output cannot be told apart from a silent failure, and agents trust the exit code. Measured 2026-11-27: one `add` run 2 prints `added` beside a warning that it kept the pin; a refused `update` (exit 65) prints Action `updated`; an identical `release` repeat prints `Pushed true`; one `remove` run 1 prints only a table header. | The matrix checks a dry run's change words and empty stdout. The two-run check: see block UX-ACT-15. | MUST |
| UX-ACT-16 | For a command or subcommand that has not yet shipped: repeating a request with the same intent exits 0 and reports that it is already done, and a remover whose target is missing succeeds with `already absent NAME`. A target that exists in a conflicting state exits nonzero and names the conflict and the override flag. A conflict of content, the same version with a different digest, is named in the output as `differs` or `different digest`, never only as `skipped`, even where the command documents a skip-existing default. SHOULD: a command that already ships a nonzero repeat exit code from the CLI's pinned table keeps it until the owner changes it; a run interrupted part-way completes when re-run. | Agents retry. AWS treats a same-token retry as success and `TerminateInstances` as idempotent; clig.dev asks for idempotency "where possible". Counter-evidence: git's removers fail on repeat and kubectl makes success opt-in (`--ignore-not-found`), so existing commands stay SHOULD. A failing second removal invites a caller to ignore the exit code, which hides every error. Terraform does not roll back a partial apply, and a re-run finishes it. One measured `publish` exits 0 with `skipped` and the old digest for changed content, with no word for the difference. | The binary test: closed stdin, `setsid`, two runs, with the run-2 assertion, for every inventory row added in the diff. See block UX-ACT-16. For existing rows the same test reports the run-2 code as a warning. | MUST for new commands; SHOULD for existing commands and interrupted runs |
| UX-ACT-17 | In one CLI, `--force` means only "override a protective refusal" (overwrite, bypass a guard). Where a command prompts, skipping the prompt is `--yes` (the language CLI-09 rule). A command that never prompts has no `--yes`, and `--force` never takes that role. Bypassing a consent or trust record has its own named flag. The help line for `--force` names what is lost. SHOULD: a refusal that says what `--force` also authorizes uses the words of that flag's help line, so the two can be matched. | An agent that adds `--force` to clear a refusal must not silently grant consent as well. Between tools `--force` is overloaded (git, docker, kubectl). Inside one CLI it must not be. One measured `update` refusal says `--force` "also authorizes update's prune and reap deletions", and the flag's help line contains neither word. | `cli_matrix.py --only act` fails a `--force` help line that mentions consent, trust, hooks or prompts. Words: see block UX-ACT-17. | MUST; SHOULD for the wording clause |

## Checks

```sh
# UX-ACT-12: nonzero and not 124 (124 means it hung); then an empty diff; then one hit each, Try first; then 0
find . -type f -exec sha256sum {} + | sort > before.txt
timeout 5 setsid -w "$BIN" subcommand args </dev/null 2>err; echo $?
find . -type f -exec sha256sum {} + | sort > after.txt; diff before.txt after.txt
grep -n '^Try: ' err
grep -n '^Override: ' err
grep '^Try: ' err | grep -c -E -e '--force' -e '--yes'
# UX-ACT-13: empty diff, and non-empty stdout when work is pending
"$BIN" subcommand args --dry-run
# UX-ACT-13 conflict: create the refusing state first (same version with changed content, or a locally edited install), then both print the same nonzero code
"$BIN" subcommand args --dry-run; echo $?
"$BIN" subcommand args; echo $?
# UX-ACT-13 SHOULD: at least one line when work is pending, and exactly "nothing to do" with exit 0 when the plan is empty
"$BIN" subcommand args --dry-run | grep -c -E -e '^would '
# UX-ACT-14: both exit nonzero, and the status command shows the state unchanged
"$BIN" subcommand name --yes </dev/null; echo $?
"$BIN" subcommand name --confirm=wrong </dev/null; echo $?
# UX-ACT-15: run 1 prints a past-tense verb line; run 2 matches the first command and the second prints 0; so does any nonzero run
"$BIN" subcommand args 2>&1 | grep -c -i -E -e 'unchanged|already|absent|nothing|kept'
"$BIN" subcommand args 2>&1 | grep -c -w -E -e 'added|updated|pushed|installed|removed|created'
"$BIN" subcommand --help | grep -c -E -e 'Confirm with:|See also:'
# UX-ACT-16: change the artifact, repeat with the same version; a new command exits nonzero
"$BIN" subcommand args 2>&1 | grep -c -i -E -e 'differs|different digest'
# UX-ACT-17: read each line; none may mention consent, trust, hooks or prompts (prints 0)
"$BIN" subcommand --help | awk '/--force/ {print; getline; print}'
"$BIN" subcommand --help | awk '/--force/ {print; getline; print}' | grep -c -i -E -e 'consent|trust|hook|prompt'
# UX-ACT-17 SHOULD: WORD is each effect word after "authorizes" in the refusal; prints at least 1
"$BIN" subcommand --help | awk '/--force/ {print; getline; print}' | grep -c -i -F -e WORD
```

A `--dry-run` that has a no-write guard still needs a hash comparison: a preview that touches a lock file is a write. UX-ACT-15 on an empty store: one measured `clean` prints only a table header, which is a finding. UX-ACT-16 SHOULD, interrupted runs: kill a run mid-way in a fixture; the next run exits 0.

**Ask the owner.** The tier of a contested action (`clean --force` T1, a tag-moving `release --force` T2, or T3 if the owner says so). Changing a published repeat exit code (`init` 0 then 64, `remove` of a missing target 79). Adding a prompt or a refusal to a command that runs unattended today, removing an existing confirmation, or repurposing `--force`. Whether to adopt the `Try: ` and `Override: ` layout in an existing CLI.

## Examples

A refusal that passes UX-ACT-12: nonzero exit at once, the conflict named first, the safe step before the override, and the override's consequence stated (it follows UX-TEXT-05's error line):

```text
error: version 1.4.0 already exists with a different digest
Try: mytool publish 1.4.1
Override: mytool publish 1.4.0 --force moves the tag for everyone who pulls 1.4.0
```

The same refusal that fails it, because the only remedy is the override:

```text
error: version 1.4.0 already exists; rerun with --force to move it
```

A dry run that passes UX-ACT-13 and 15, in both the pending and the empty case, and exits 0 either way:

```text
would remove /home/u/.cache/mytool/node-24.1.0
would remove /home/u/.cache/mytool/node-24.2.0
```

```text
nothing to do
```

Run 1 and run 2 of a new `add` command (UX-ACT-15 and 16): the second run exits 0, says so, and prints no change word.

```text
added node@24
```

```text
unchanged node@24 (already added)
```

## What Agents Get Wrong Here

- **Clearing the obstacle instead of reading it.** An agent adds `--force`, `--yes` or `-f` after a refusal, or follows a hint that names one. It supplies `--confirm=NAME` itself, which turns a T3 safeguard into a formality. Run `--dry-run` first, show it, and add the flag only after a person approves the exact command.
- **Trusting the exit code.** Exit 0 with empty output is read as done. A removal that fails on the second run gets its exit code ignored by the caller, which also hides real errors. `--dry-run` is assumed to exist and to behave the same everywhere (npm, kubectl `--dry-run=client` or `server`): look in `--help` before use.
- **Trusting the tool's own report.** `added` for a kept pin, `updated` after a refused run that moved the lock, `skipped` with exit 0 when the registry holds different content. Compare the tree before and after, and read the change word as a claim to check.
- **Trusting a dry run that skips the check the real run fails.** A plan that cannot run is approved. The dry run must refuse where the real run refuses, with the same code.
- **Prompting instead of refusing.** A prompt hangs a script and an agent. Refuse, name the safe step, then name the override.
- **A hint that offers only the override.** The first remedy is the safe step (a new version number), and the override line states its consequence.
- **Giving `--force` a second meaning,** such as skipping a prompt, granting consent or arming hooks. Consent has its own flag.
