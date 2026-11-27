# ux-cli

Interaction standards for command-line tools and terminal UIs. The skill checks
the binary by running it, not by reading its source. It has 24 non-negotiables
and a matrix script that exercises the CLI itself.

```sh
grim add ghcr.io/ocx-sh/lore/ux-essentials
```

Installed by the `ux-essentials` bundle. The `ux-review` skill also pulls it in
when it reviews a CLI. It is a skill and not a rule, because no file glob
reaches a CLI's source reliably. The agent loads it for help text, a version flag, an
error message or a spinner. It also loads for an installer's output, or a
command that deletes, overwrites or publishes.

## Two first-time readers

A person who has never run the tool reads its output. So does an agent, which
copies whatever the tool prints. The skill covers what the tool prints and does
above the language CLI contracts.

That means bare invocation, help layout, `--version` and unknown-command
suggestions. It means global flag position, the completion generator and the
installer's last line. It also covers first-run messages, colour and animation,
TUI parity, the shape of a rendered error, and how a destructive command
refuses.

## What agents get wrong, ranked

The skill ranks failures by how many measured defects each mechanism produced.
First is trusting a framework default. Examples are a `--version` flag that is
not set, a flag that is not global, and a tracing layer that ignores the colour
decision. Then come help examples and installer last lines that nothing
executes, which go stale. Then comes assuming one switch covers another, since
`NO_COLOR` is colour only.

## The matrix

`checks/cli_matrix.py` runs the binary from an empty directory with an empty
`HOME`. It covers bare invocation, help on every path, `--version`, typo
suggestions, global flags, completions, colour, animation, the palette and
destructive-command refusals. A check that lacks its input prints under
`did not run:` and is never a pass.

41 rows across four depth files hold the rationale and verification.

## What it does not cover

Exit-code tables, stdout and stderr routing, TTY detection, the colour decision
order, prompts and signals belong to the language CLI contracts. JSON output
and MCP tools belong to `ux-agent-interfaces`. Completion registration per
shell belongs to `shell-integration`. How an installer verifies and edits PATH
belongs to `installer-script`.

## Siblings

`ux-quality-reference` supplies the action tiers and the shared error-wording
rows, and installs with this skill. `ux-review` runs the matrix when it reviews
a CLI. Bundled as `ux-essentials`.
