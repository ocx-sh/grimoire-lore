# shell-diagnose

A symptom-routed diagnosis skill for a shell script, CI step or PowerShell installer that is already failing. It starts from the exit code, the first stderr line and the interpreter identity.

```sh
grim add ghcr.io/ocx-sh/lore/shell-diagnose
```

Run it for `Permission denied`, `bad interpreter`, `required file not found`, `Illegal option -o pipefail`, `[[: not found`, `unbound variable`, `no matches found`, a PowerShell parse error, "works locally but fails in CI" or an exit status above 128. It cites `shell-quality` rule IDs and expects that rule installed.

## The route

Three facts pick the section: exit code, first stderr line and which interpreter actually ran. Sections cover exit 126, 127 and 2 on a file that exists, dialect and pipefail, bash 3.2 and empty arrays, statuses above 128, zsh, PowerShell, nushell, and hosts, CI and installers. Each ends in one measurement that names the cause.

## What is distinctive

Consent comes first, so no signal or probe with a cost is sent without it. A never-edit-the-check section lists the edits that change the measurement and not the defect, such as raising a timeout or adding `|| true`. It stops only when the cause is named as a mechanism, the command and its output are pasted and the fix was watched to clear the symptom.

## Siblings

`shell-port` for a bash 3.2 port, `shell-integration` for emitters, `installer-script` for installers. Part of `shell-essentials`.
