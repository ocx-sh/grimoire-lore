---
name: shell-quality-reference
description: Depth files and checks scripts behind the shell-quality rule, loaded on demand. Use when the shell-quality rule routes you to a depth file or a checks script, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files and checks scripts behind the shell-quality rule
  keywords: shell,sh,posix,bash,zsh,ksh,fish,nushell,elvish,shellcheck,shfmt,bats,github-actions,taskfile,gitlab-ci,installer,reference
  claude.user-invocable: "false"
---

# shell-quality-reference

Depth for the `shell-quality` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [ci.md](ci.md) | Workflow `run:` steps, composite actions, Taskfile `cmds`, GitLab `script:` blocks |
| [dialect.md](dialect.md) | sh versus bash, bash floor, `# Kind:` header, pipefail in sh, POSIX.1-2024 |
| [elvish.md](elvish.md) | Elvish modules and `rc.elv` snippets |
| [emit.md](emit.md) | Shell code generated for other shells: quoting, rc and profile edits, hooks, completions |
| [errors.md](errors.md) | `set -e`/`-u`/pipefail by kind, traps, exit codes, signals, error propagation |
| [expansion.md](expansion.md) | Quoting, argument lists, loops, printf, here-docs, `eval`, option parsing |
| [fish.md](fish.md) | Fish functions, completions and `conf.d` snippets |
| [gates.md](gates.md) | ShellCheck, shfmt, `.shellcheckrc`, `.editorconfig`, the gate script, verification cells |
| [installers.md](installers.md) | `install.sh`: truncation guard, integrity, TLS, platform detection, PATH edits, exit table |
| [nushell.md](nushell.md) | Nushell scripts, modules, config and autoload snippets |
| [security.md](security.md) | Credentials, sourcing, PATH, sudo, locks, untrusted data to ssh, git, rm and tar |
| [testing.md](testing.md) | Bats tests, isolation, skip budget, testing across bash and sh versions |
| [userland.md](userland.md) | Portable sed, grep, find, mktemp, date, stat and curl across GNU, BSD, macOS and busybox |
| [zsh.md](zsh.md) | Zsh emulation, word splitting, arrays, options, startup files |

## checks/

Scripts the rule's verification blocks run. Set `CHECKS=.claude/skills/shell-quality-reference/checks` (`$CLAUDE_CONFIG_DIR/skills/shell-quality-reference/checks` when installed globally).
