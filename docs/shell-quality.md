# shell-quality

Standards for writing and reviewing shell: the gate, the floor-first rule, a table of script kinds, and fourteen depth files routed to by task.

```sh
grim add ghcr.io/ocx-sh/lore/shell-quality
```

Loads on `**/*.sh`, `**/*.bash`, `**/*.bats`, `**/*.zsh`, `**/*.ksh`, `**/*.fish`, `**/*.nu`, `**/*.elv`, `**/.shellcheckrc`, GitHub workflows and actions, Taskfiles and GitLab CI files. The index is 198 lines and always present. A depth file is read only when the work calls for it. It ships beside `powershell-quality` in `shell-essentials`, and that rule owns `.ps1`, `.psm1` and `.psd1`.

## It starts by reading the floor

Shell fails by dialect. `set -o pipefail` aborts dash. `declare -A` and `mapfile` do not exist on the macOS system bash 3.2. An empty array under `set -u` is an unbound variable before bash 4.4. An unmatched glob is an error in zsh.

So the first rule is not about code. Read the floor the script must run on (SH-CORE-04), then pick the script kind from the table: an installer, an rc file or an emitter is `#!/bin/sh`, a tool or CI script is bash 3.2.57 or newer, a library has no shebang and a gate uses `set -u` without `-e`.

## What is in it

The index carries the gate block (`bash scripts/shell-gate.sh`), the script-kind table, the core rows, a table of six tells, four waiver tokens that each require a reason, and the routing table from task to depth file. Fourteen depth files cover dialect, errors, expansion, security, CI, installers, userland, testing, gates, multi-shell emitters, zsh, fish, nushell and elvish.

Every rule carries an ID, a rationale, a runnable verification and a severity. Thirty scripts sit in a `checks/` directory the rules name by path. The index tells adopters to copy them to `scripts/`.

## What it does not cover

No restatement of the shells or their manuals, which the model already knows. It names traps, not maps. Once a depth file is read, that file does not point at another.

It never loads on dotfiles such as `.bashrc`, on `Makefile`, `Dockerfile` or `.editorconfig`, or on extensionless `bin/*` files. The routing table sends those tasks to the right depth file by keyword.

## Siblings

`powershell-quality` owns PowerShell. `code-docs` covers header comments. The four skills `shell-integration`, `installer-script`, `shell-port` and `shell-diagnose` cite this set's rule IDs by number and never restate them. Bundled as `shell-essentials`.
