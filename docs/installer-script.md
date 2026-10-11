# installer-script

A procedure for writing, auditing or reworking a one-line installer, either an `install.sh` run as `curl | sh` or an `install.ps1` run as `irm | iex`, including a generated cargo-dist installer.

```sh
grim add ghcr.io/ocx-sh/lore/installer-script
```

Run it for "write an install.sh", "audit this installer", "does the installer verify the checksum", "installer fails on alpine or busybox wget", "installer killed my PowerShell window" or "truncated download ran half the script". It cites `shell-quality` and `powershell-quality` rule IDs and expects those rules installed.

## What it does

It sets a header and an exit table, then makes the script truncation-safe so a cut download runs nothing. It probes downloaders, verifies integrity before extraction, detects the platform, prompts only when a terminal exists, installs in user space and edits PATH. A behavioural kit then runs the installer against stubs on dash, busybox ash, bash 3.2 and Windows PowerShell 5.1 and 7.

## What agents get wrong by default

Ranked across 18 audited installers, each with one mechanical check. No integrity check, or one that fails open on a missing tool. A header that claims a verification the code lacks. An unprobed `--https-only` or `--secure-protocol` that BusyBox rejects. No exit table. Install steps at top level with no `main`, so a truncated download runs half the script.

## Siblings

`shell-port` for an ordinary script, `shell-diagnose` for a failing one, `shell-integration` for emitters and rc edits. Part of `shell-essentials`.
