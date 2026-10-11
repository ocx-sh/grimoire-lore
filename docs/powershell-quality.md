# powershell-quality

Standards for writing and reviewing PowerShell: the gate wrapper, the target by script kind, a set of tells, and six depth files routed to by task.

```sh
grim add ghcr.io/ocx-sh/lore/powershell-quality
```

Loads on `**/*.ps1`, `**/*.psm1` and `**/*.psd1`. The index is 161 lines and always present. A depth file is read only when the work calls for it. It ships beside `shell-quality` in `shell-essentials`.

## It starts with the target

PowerShell 5.1 and 7 are different languages in practice. An installer run by `irm | iex` or `powershell -File` targets 5.1, where `&&` is a parse error. Repo, dev, CI and Pester scripts target 7.6. Modules are dual-edition. PS-CORE-02 is a table that fixes the target by script kind so no file guesses.

## What is in it

Three index rows: run the gate wrapper (exit 0, 1 or 2, with a 5.1 parser gate on a 5.1 host), the target table, and the tell set agents produce by default. Six depth files cover compatibility, encoding, errors, gates (including Pester), native commands and security. Nineteen scripts sit in a `checks/` directory the rules name by path, and the index tells adopters to copy them to `scripts/`.

Every rule carries an ID, a rationale, a runnable verification and a severity.

## What it does not cover

No restatement of the language or its cmdlets. It does not load on `.ps1xml`, workflows or Taskfiles, which `shell-quality` reaches. The depth files never point at each other.

## Siblings

`shell-quality` owns every other shell. `installer-script` covers `install.ps1`, and `shell-diagnose` covers a failing PowerShell step. Bundled as `shell-essentials`.
