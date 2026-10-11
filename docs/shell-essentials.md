# shell-essentials

The OCX Shell set in one install: two rules, four skills and the shared code-comment pair.

```sh
grim add ghcr.io/ocx-sh/lore/shell-essentials
```

| Artifact | Kind | What it gives you |
|---|---|---|
| `shell-quality` | rule | The gate, the floor-first rule, the script-kind table and fourteen depth files for sh, bash, zsh, ksh, fish, nushell, elvish and shell in CI |
| `powershell-quality` | rule | The gate wrapper, the target by script kind and six depth files for PowerShell 5.1 and 7 |
| `shell-integration` | skill | Builds and audits code that writes shell code or edits startup files, proven by a round-trip harness |
| `installer-script` | skill | Writes and audits `curl \| sh` and `irm \| iex` installers, proven by a behavioural kit |
| `shell-port` | skill | Ports a script to bash 3.2 through 5.3 or to dash, ash and `bash --posix`, to byte-identical output |
| `shell-diagnose` | skill | Routes a failing script by exit code, first stderr line and interpreter identity to one measurement |
| `code-docs` | rule | The guard floor and length caps for comments. Shared by every language set |
| `code-docs-cleanup` | skill | A guard-first procedure for shortening existing comments |

## The premise

Shell fails by dialect and the failure is quiet. `pipefail` aborts dash. Bash 3.2 has no associative arrays. An empty array is unbound before bash 4.4. A PowerShell 5.1 parser rejects `&&`. A truncated `curl | sh` runs half a script.

So the set trusts a command run on the interpreter over any page that describes it. It states the interpreter and the version every claim was watched on, measured 2026-10-11 across dash, busybox, bash 3.2 to 5.3, zsh, fish, nushell, elvish and PowerShell 5.1 to 7.6.

## Why two rules and not one

The globs differ, which is the only thing that justifies a second rule file. A `.sh` edit is not a `.ps1` edit, and loading PowerShell encoding depth while you touch a bash function is pure cost. Dotfiles, `Makefile` and `Dockerfile` are never globbed, and the index routes those tasks by keyword.

## Why four skills

Each runs at a different trigger and none runs on every edit: once per emitter, per installer, per port and per incident. They carry no rules of their own and cite rule IDs from the two rules, so install the bundle rather than a skill alone.

## What is not in it

Make, Dockerfile and `.editorconfig` prose. README and changelog text belongs to `docs-quality`.

The bundle names its members without a tag. It says these eight belong together. Your `grimoire.lock` is what freezes them.
