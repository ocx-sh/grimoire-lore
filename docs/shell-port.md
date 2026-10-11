# shell-port

A procedure for porting a shell script to a target matrix: bash 3.2 through 5.3 (the macOS system bash), or POSIX sh on dash, busybox ash and `bash --posix`.

```sh
grim add ghcr.io/ocx-sh/lore/shell-port
```

Run it for "make this work on macOS", "works on Linux but not on my Mac", `bad substitution`, `declare: -A: invalid option`, `mapfile: command not found`, `unbound variable` on an empty array, "make this POSIX sh" or `Illegal option -o pipefail`. It cites `shell-quality` rule IDs and expects that rule installed.

## What it does

It reads the floor and chooses the target, then runs a baseline on every leg before any edit. A static pass applies the bash 4 denylist, fixes go by class, and the acceptance run repeats until the output is byte-identical on every leg. A second static pass closes it. It ends in a receipt, or pins the floor with a guard when the port is not worth its cost.

## What agents get wrong by default

Ranked by how often a port goes wrong. A green ShellCheck taken as proof that bash 3.2 works. "Exit 0 on every version" accepted when bash 4.4 exits 0 with a wrong value. `declare -A` guarded by an `if` and kept, so 3.2 builds an indexed array. `mapfile` swapped for `readarray`, which needs the same bash 4.0. Each has one check in the skill.

## Siblings

`shell-diagnose` when the cause is unknown, `shell-integration` for emitted shell, `installer-script` for an installer pair. Not for PowerShell. Part of `shell-essentials`.
