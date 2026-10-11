---
title: Shell in GitHub Actions run steps and Taskfile cmds
topic: shell-scripting-cross-os-ci-shells (rule family SH-CI; rows M-H-01, M-H-02, M-H-04..M-H-11, M-F-13 CI half)
agent: wave2-ci-run-steps-taskfiles
model: sonnet
date_researched: 2026-10-11
sources_count: 31
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/run-steps-and-taskfiles/
scope: |
  Covers what a GitHub Actions `run:` step and a go-task `cmds:` entry really execute (command line, errexit, pipefail, interpreter), per OS and per shell; script injection and environment-file hygiene in `run:` bodies; composite-action shells; what actionlint, ShellCheck and zizmor do and do not catch; the ubuntu-latest to 26.04 rollout; Taskfile interpreter gaps (mvdan/sh) in task 3.45.4 to 3.54.0.
  Not covered: PowerShell language rules beyond the pointer to PS-ERR (shell-pwsh.md), shell code emitted for other shells, GitLab CI, fenced doc blocks (the non-CI half of M-F-13), any macOS behaviour not read from a primary source (there is no macOS host; those claims say "read only").
  Dated 2026-10-11. Runner facts are from runner-images main at 8197087fc536 (2026-10-09) and actions/runner main at 67f01c276e0a (2026-10-06).
---

# Shell in GitHub Actions run steps and Taskfile cmds

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  - [1. What a run step executes, per shell and OS](#1-what-a-run-step-executes-per-shell-and-os)
  - [2. Pipefail: step, job and workflow defaults; composite actions](#2-pipefail-step-job-and-workflow-defaults-composite-actions)
  - [3. sh on the Ubuntu runners and the ubuntu-latest 26.04 rollout](#3-sh-on-the-ubuntu-runners-and-the-ubuntu-latest-2604-rollout)
  - [4. PowerShell steps](#4-powershell-steps)
  - [5. Windows runners: shell bash is Git Bash](#5-windows-runners-shell-bash-is-git-bash)
  - [6. macOS runners: bash 3.2.57](#6-macos-runners-bash-3257)
  - [7. Script injection through the template expansion](#7-script-injection-through-the-template-expansion)
  - [8. Environment files: GITHUB_ENV, GITHUB_OUTPUT, GITHUB_PATH](#8-environment-files-github_env-github_output-github_path)
  - [9. Composite actions](#9-composite-actions)
  - [10. The price of pipefail: SIGPIPE and grep -q](#10-the-price-of-pipefail-sigpipe-and-grep--q)
  - [11. actionlint, ShellCheck and zizmor as the gate](#11-actionlint-shellcheck-and-zizmor-as-the-gate)
  - [12. Taskfile cmds: the interpreter is mvdan/sh, not bash](#12-taskfile-cmds-the-interpreter-is-mvdansh-not-bash)
  - [13. Linting Taskfile cmds](#13-linting-taskfile-cmds)
  - [14. Inline run block or script file](#14-inline-run-block-or-script-file)
  - [15. Fleet defects found (reported, not fixed)](#15-fleet-defects-found-reported-not-fixed)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Verification runs](#verification-runs)
- [Exemplar evidence](#exemplar-evidence)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- A `run:` step with no `shell:` runs `bash -e {0}` on Linux and macOS: errexit only, no pipefail, so `false | true` exits 0. Measured under act 0.2.89 and a `bash -e` emulation; the command line comes from the [workflow-syntax shell table](https://github.com/github/docs/blob/main/data/reusables/actions/supported-shells.md).
- `shell: bash` runs `bash --noprofile --norc -e -o pipefail {0}` ([ScriptHandlerHelpers.cs:18](https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/ScriptHandlerHelpers.cs)). `defaults.run.shell: bash` at workflow or job level goes through the same branch ([ScriptHandler.cs:73-79](https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/ScriptHandler.cs)), so it adds pipefail too; measured under act (pipefail `on`, pipeline exits 1).
- Job defaults are skipped inside composite actions (`ExecutionContext.ScopeName` is non-empty, ScriptHandler.cs:75), so every composite `run:` needs its own `shell:`; the docs also require it ([metadata-syntax](https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/metadata-syntax.md)).
- A workflow without `defaults.run.shell` is the fleet norm: 482 first-party `run:` steps have no `shell:` and 22 of them hold a pipeline with no `pipefail` (reproduced here with a multi-line grep; the audit counted 22 as well).
- `sh -e {0}` is dash on Ubuntu runners. `set -o pipefail` inside it exits 2 on dash 0.5.12-6ubuntu5 (ubuntu-24.04) and works on 0.5.12-12ubuntu3 (ubuntu-26.04): the same workflow changes behaviour when `ubuntu-latest` flips.
- Dated rollout note: `ubuntu-latest` moves to Ubuntu 26.04 in waves from 2026-10-19, complete by 2026-11-19 ([runner-images#14748](https://github.com/actions/runner-images/issues/14748)). 26.04 ships bash 5.3.9, dash 0.5.12-12ubuntu3, ShellCheck 0.11.0-2, pwsh 7.6.6; in the plain ubuntu:26.04 container `ls`, `sort`, `date`, `readlink`, `stat` are uutils 0.10.0 and `ls --version | grep -q GNU` stops matching.
- Any `${{ }}` of an outsider-controlled value in a `run:` body is code, not data. Proven here with canary files under act: `github.event.issue.title`, `inputs.*` (the www-setup shape), and a PowerShell double-quoted `"$(...)"` all executed the payload; the `env:` twins stayed inert.
- actionlint 1.7.12 flags `github.event.issue.title` but is silent on `inputs.*` and on `${{ env.X }}`; zizmor 1.30.1 flags `inputs.*` (all 6 www-setup sites) but is silent on `${{ env.X }}` carrying an untrusted value. A grep for `${{ ... }}` on non-key lines catches all three.
- The T2 injection in www-setup is 6 sites, not 2: `test-installers.yml:206,207,239,241,269,271` at a251c3631047. The pwsh sites `"${{ inputs.release_tag }}"` execute a `$(...)` payload (evaluated twice: once in the `if`, once in the `+=`).
- Multiline `GITHUB_ENV`/`GITHUB_OUTPUT` values end at the first line equal to the delimiter ([FileCommandManager.cs:392-430](https://github.com/actions/runner/blob/main/src/Runner.Worker/FileCommandManager.cs)); a fixed `EOF` plus attacker text injects entries (shown with a port of the parser). Use a random delimiter; a one-line `NAME=value` form must never receive a value with a newline.
- Windows PowerShell 5.1 `>>` writes UTF-16LE with a BOM (first bytes `ff fe`), and the runner reads environment files as UTF-8: use `Out-File -Encoding utf8 -Append` under `shell: powershell`, plain `>>` only under `pwsh` (measured on 5.1.26100.9444, 7.4.7, 7.6.6).
- Git Bash rewrites Unix-looking arguments for native executables: `cmd /c` loses its flag, `/tmp/x` becomes `C:/Users/.../Temp/x`, `--prefix=/usr/local` becomes `--prefix=C:/Program Files/Git/usr/local`. Write `cmd //c`, or set `MSYS_NO_PATHCONV=1` (measured on Git Bash 5.2.15; the runner has 5.3.15).
- Task cmds run under mvdan/sh, errexit on, pipefail off. `set: [pipefail]` works at Taskfile, task and cmd level; a separate `set -o pipefail` cmd does not carry into the next cmd (each cmd item is a fresh interpreter). Measured on task 3.45.4, 3.51.1, 3.53.1, 3.54.0.
- The mvdan/sh panic is triggered by an unquoted subscript containing `-` on an associative array (`m[x-y]=v`, `${m[x-y]}`, `declare -A m=([x-y]=v)`), not by quoting alone: `m["x-y"]=v` and `${m["x-y"]}` work. It still panics on task 3.54.0 (mvdan/sh 3.14.1).
- `printf -v`, `PIPESTATUS` and `BASH_VERSION` fail silently in task cmds (no error, wrong value); `read -p` works (the audit's "breaks" is wrong: EOF gives rc 1 and errexit, as in bash). `status:` commands ignore `set: [pipefail]` ([go-task#2469](https://github.com/go-task/task/issues/2469), still open, reproduced on 3.54.0).
- actionlint belongs in the gate with `SHELLCHECK_OPTS='--severity=warning'` (ocx already does, `ocx/taskfiles/ci.taskfile.yml:17-25`), plus zizmor `--min-severity high` or the grep for the injection classes it misses. It does not lint composite `action.yml` and skips ShellCheck for a path-qualified template such as `/bin/bash -eo pipefail {0}`.

## Findings

### 1. What a run step executes, per shell and OS

Exact command lines, from the [supported-shells table](https://github.com/github/docs/blob/main/data/reusables/actions/supported-shells.md) and the runner source ([ScriptHandlerHelpers.cs:15-20, 62-65](https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/ScriptHandlerHelpers.cs), [ScriptHandler.cs:92-117](https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/ScriptHandler.cs)):

```
shell: (unset), Linux/macOS   bash -e {0}          (bash found on PATH, else sh -e {0})   errexit only
shell: (unset), Windows       pwsh -command ". '{0}'"  (falls back to powershell)         EAP=Stop prepended, LASTEXITCODE epilogue
shell: bash,   all OS         bash --noprofile --norc -e -o pipefail {0}                   errexit + pipefail
shell: sh,     Linux/macOS    sh -e {0}                                                    errexit only (dash on Ubuntu)
shell: pwsh / powershell      pwsh|powershell -command ". '{0}'"                           "$ErrorActionPreference = 'stop'" prepended;
                                                                                          "if ((Test-Path -LiteralPath variable:\LASTEXITCODE)) { exit $LASTEXITCODE }" appended
shell: cmd,    Windows        %ComSpec% /D /E:ON /V:OFF /S /C "CALL "{0}""                 no fail-fast; docs: "no way to fully opt into fail-fast"
shell: python                 python {0}
shell: <template>             first word = command, must contain {0}; ParseShellOptionString splits on the first space
```

Rules that follow:

- A custom template must contain `{0}`; otherwise the runner throws `Invalid shell option. Shell must be a valid built-in (bash, sh, cmd, powershell, pwsh) or a format string containing '{0}'` (ScriptHandler.cs:245).
- A custom template replaces the whole argument list: `shell: bash -euo pipefail {0}` drops `--noprofile --norc`, so a profile is read on a self-hosted runner. Measured under act: `bash -euo pipefail {0}` fails an unset variable with `UNDEFINED_VAR: unbound variable` (`fixtures/.../wf/.github/workflows/nounset.yml`).
- The `pwsh` epilogue exits with `$LASTEXITCODE` only if the variable exists, and `$ErrorActionPreference='stop'` does not govern native exit codes (section 4).
- `run:` is limited to 21,000 characters ([workflow-syntax](https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/workflow-syntax.md), `jobs.<job_id>.steps[*].run`). Each `run:` is a new process: no state crosses steps except through `$GITHUB_ENV`, `$GITHUB_PATH`, `$GITHUB_OUTPUT`.

### 2. Pipefail: step, job and workflow defaults; composite actions

Question: does `defaults.run.shell: bash` at workflow level add pipefail? Yes. The step branch and the defaults branch share one code path: `shell` is read from the step inputs, then from `JobDefaults["run"]["shell"]` (ScriptHandler.cs:73-79), then split by `ParseShellOptionString` and, with no explicit args, mapped through `GetScriptArgumentsFormat("bash")` which is `--noprofile --norc -e -o pipefail {0}` (ScriptHandler.cs:101-116, ScriptHandlerHelpers.cs:18). The docs reuse one table for step and default level.

Measured (act 0.2.89 host mode, bash 5.x; act is not the GitHub runner, so the command lines above are the authority and the runs show bash behaviour):

```
$ bash run-a.sh        (fixtures/run-steps-and-taskfiles/run-a.sh)
##### act: pipeline-default       options=ehB pipefail  off   REACHED-after-pipeline   Job succeeded  act-exit=0
##### act: pipeline-bash          options=ehB pipefail  on                              Job failed     act-exit=1
##### act: pipeline-defaults-run  options=ehB pipefail  on                              Job failed     act-exit=1
##### emulation: bash -e {0}                                         REACHED-after-pipeline  -> exit 0
##### emulation: bash --noprofile --norc -eo pipefail {0}                                    -> exit 1
```

Composite actions: the defaults lookup is guarded by `string.IsNullOrEmpty(ExecutionContext.ScopeName)` (ScriptHandler.cs:75, :173), so a workflow-level `defaults.run.shell` does not reach steps inside a composite action. `shell:` is "Required if `run` is set" there ([metadata-syntax](https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/metadata-syntax.md), `runs.steps[*].shell`).

Fleet: 4 jobs use `defaults.run.shell` (all `bash`, none workflow-level) and 90 blocks set `shell: bash` ([fleet-shell-shape.md](../shell-audit/fleet-shell-shape.md), Axis 6). Re-measured with a multi-line grep (check-shell.sh, section Verification V1): 482 first-party steps have no `shell:` in a file with no `defaults.run.shell`, and 22 of those contain a bare pipeline with no `pipefail` (ocx 6, e2e-mirror 4, arcana 2, creeptd-ng 2, rules_ocx 2, one each in ocx-indexbot, grimoire, ocx-sdk-python, www-setup, ocx-mcp, ocx-website).

### 3. sh on the Ubuntu runners and the ubuntu-latest 26.04 rollout

Dated rollout note (read 2026-10-11): [runner-images#14748](https://github.com/actions/runner-images/issues/14748), opened 2026-09-17, last updated 2026-10-10: "rolled out over a period of several weeks beginning October 19, 2026 ... complete the migration by November 19, 2026" for the x64 `ubuntu-latest` label. Mitigations named: pin `ubuntu-24.04`, or test with `ubuntu-26.04`.

What the shell layer sees (README lines at runner-images@8197087fc536, [Ubuntu2404](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md) and [Ubuntu2604](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md)):

```
                 ubuntu-24.04            ubuntu-26.04
bash             5.2.21(1)               5.3.9(1)         (README :17 / :17)
dash             0.5.12-6ubuntu5         0.5.12-12ubuntu3 (README :21 / :21)
shellcheck       0.9.0-1                 0.11.0-2         (README :311 / :295)
coreutils pkg    9.4-3ubuntu6.3          9.5-1ubuntu2+0.0.0~ubuntu25 (README :267 / :257)
pwsh             7.6.6                   7.6.6
```

Measured in containers (`fixtures/.../run-m04.sh`, docker ubuntu:24.04 and ubuntu:26.04, 2026-10-11):

```
ubuntu:24.04  bash=5.2.21 dash=0.5.12-6ubuntu5
  sh -e {0}, body "set -o pipefail; false | true"   -> "set: Illegal option -o pipefail"  exit 2
  sh -e {0}, body "false | true; echo REACHED"      -> REACHED  exit 0
ubuntu:26.04  bash=5.3.9 dash=0.5.12-12ubuntu3
  sh -e {0}, body "set -o pipefail; false | true"   -> exit 1   (pipefail accepted and effective)
  sh -e {0}, body "false | true; echo REACHED"      -> REACHED  exit 0   (sh -e alone still has no pipefail)
  ls/sort/date/readlink/stat/mktemp/install/tee/wc/head/tr/cut/sha256sum/env  -> "uutils coreutils 0.10.0"
  cp/mv/rm -> GNU coreutils 9.7
  ls --version | grep -q GNU   -> "GNU NOT detected"      (24.04: "GNU detected")
  readlink -f, date -d, stat -c, mktemp -d, sort -V, ls --time-style   -> all ok on both
```

Whether the runner image (not the container) resolves `/usr/bin/ls` to uutils is unverified: the toolset lists `coreutils` only (`toolset-2604.json:161`) and the README package string is `9.5-1ubuntu2+0.0.0~ubuntu25`. Do not sniff GNU by `--version`; test the feature. ShellCheck 0.9.0 to 0.11.0 matters when actionlint uses the runner's `shellcheck`: 0.11.0 turned SC2002 off by default and added SC2327-SC2332, SC3062 ([CHANGELOG](https://github.com/koalaman/shellcheck/blob/master/CHANGELOG.md)). Unreleased ShellCheck (master) adds SC2337, "warn about `grep -q` in pipelines under pipefail" (section 10).

Consequences for the fleet: 22 default-shell pipelines are unaffected by the dash change (they run bash). The only `shell: sh` hit, `e2e-mirror/.github/workflows/mirror-signing.yml:140`, is a matrix key for an Alpine container, not a GitHub `shell:`.

### 4. PowerShell steps

The built-in `pwsh`/`powershell` wrapper prepends `$ErrorActionPreference = 'stop'` and appends the `LASTEXITCODE` epilogue ([workflow-syntax, Exit codes](https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/workflow-syntax.md)). A failing native command mid-script does not stop the step. Re-measured with the runner prelude (`fixtures/.../pwsh/gh_pwsh.ps1`, `matrix.sh pwsh`):

```
== pwsh 7.4 LTS (7.4.7)      1:continued-after-failing-native (LASTEXITCODE=3)
                             2:stopped-by-NativeCommandUseErrorActionPreference: Program "sh" ended with non-zero exit code: 3.
== pwsh 7.6.6                1:continued-after-failing-native (LASTEXITCODE=3)
                             2:stopped-by-NativeCommandUseErrorActionPreference: ... exit code: 3 (0x03).
== Windows PowerShell 5.1 (5.1.26100.9444)   1:continued-after-failing-native (LASTEXITCODE=3)
                             2:NOT-STOPPED
```

`$PSNativeCommandUseErrorActionPreference = $true` stops the script on 7.4.7 and 7.6.6 and does nothing on 5.1 ([about_Preference_Variables, 7.4](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_preference_variables)). This file only points at it: the pwsh native-call rule lives in the PS-ERR family (shell-pwsh.md, row M-H-03); a CI reviewer asks "does a pwsh step with two or more native calls carry the variable or a per-call `$LASTEXITCODE` check", and a 5.1 step (`shell: powershell`) can only use the per-call check.

A `pwsh` step is never linted by actionlint (it runs ShellCheck only for `bash` and `sh`, [checks.md](https://github.com/rhysd/actionlint/blob/main/docs/checks.md)), and ShellCheck does not understand PowerShell, so a PowerShell body in a `shell: bash` step or a POSIX body in a default-`pwsh` Windows step is not caught by the gate. Fleet: 26 Windows blocks have no `shell:`; the audit read all 26 and found no POSIX-in-pwsh breakage ([fleet-shell-shape.md](../shell-audit/fleet-shell-shape.md), Axis 6).

### 5. Windows runners: shell bash is Git Bash

- `windows-2025` and `windows-2022` list `Bash 5.3.15(2)-release` ([Windows2025-Readme.md:17](https://github.com/actions/runner-images/blob/main/images/windows/Windows2025-Readme.md)), shells `gitbash.exe -> C:\Program Files\Git\bin\bash.exe`, `msys2bash.cmd -> C:\msys64\usr\bin\bash.exe`, `wslbash.exe -> C:\Windows\System32\bash.exe` (:141-143), Git 2.56.0.windows.1 (:67). `shell: bash` selects the first `bash` found by `WhichUtil.Which` (ScriptHandler.cs:109); whether `C:\Windows\System32\bash.exe` can shadow Git Bash is unverified (the docs say Git for Windows' bash is used).
- The local host's Git Bash is 5.2.15 (older than the runner's 5.3.15); every number below is from 5.2.15 on `matrix.sh`-style staging under `C:\Users\ecom\shell-wintest`. The conversion rules are Git for Windows/MSYS2 behaviour, not bash-version behaviour ([MSYS2 filesystem paths](https://www.msys2.org/docs/filesystem-paths/)).

```
$ bash.exe pathconv-default.sh     (fixtures/.../gitbash/pathconv-default.sh, out/pathconv.out)
bash=5.2.15(1)-release MSYSTEM=MINGW64
cmd //c echo /tmp/x               -> C:/Users/ecom/AppData/Local/Temp/x
cmd //c echo --prefix=/usr/local  -> "--prefix=C:/Program Files/Git/usr/local"
cmd //c echo //server/share       -> //server/share            (leading // is left alone)
FOO=/tmp/x cmd //c "echo %FOO%"   -> C:/Users/ecom/AppData/Local/Temp/x     (env values are converted too)
cmd /c echo hi                    -> starts an interactive "Microsoft Windows [Version ...]" cmd: "/c" was rewritten
MSYS_NO_PATHCONV=1 cmd /c echo /tmp/x   -> /tmp/x
MSYS_NO_PATHCONV=1 FOO=/tmp/x cmd /c "echo %FOO%"   -> /tmp/x
pwd -> /c/Users/ecom/shell-wintest ; cygpath -w "$PWD" -> C:\Users\ecom\shell-wintest
```

The two documented knobs are `MSYS2_ARG_CONV_EXCL` (argument prefixes, `*` for all) and `MSYS2_ENV_CONV_EXCL` (MSYS2 docs); Git for Windows also honours `MSYS_NO_PATHCONV=1`, which worked above (the MSYS2 page does not name it). `MSYS2_ARG_CONV_EXCL='*'` worked as well (`cmd /c echo /tmp/x -> /tmp/x`).

- GNU userland is on PATH only inside a `shell: bash` step: Git is installed with `/o:PathOption=CmdTools` ([Install-Git.ps1:34](https://github.com/actions/runner-images/blob/main/images/windows/scripts/build/Install-Git.ps1)), so in `pwsh`/`cmd` steps `sort` and `find` resolve to the Windows tools ([platform-matrix.md](../shell-audit/platform-matrix.md), 2.1). The host Git Bash resolves `sort find grep sed awk` to `/usr/bin/*`.
- `grep -P`, `flock` and symlinks are not safe under Git Bash (platform-matrix.md, rows for Git Bash).
- `$GITHUB_PATH` entries are read with `File.ReadAllLines(..., Encoding.UTF8)` and added verbatim (FileCommandManager.cs:138-150): write Windows-style paths from a Git Bash step with `cygpath -w`, because `/c/foo` is not a Windows path to the runner.

### 6. macOS runners: bash 3.2.57

[macos-26-arm64 README:16](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md) lists `Bash 3.2.57(1)-release`; the same version is in all six macOS readmes and no Homebrew bash or GNU coreutils/sed is installed (only `gnu-tar` as `gtar`, README :59), and the login shell is forced to `/bin/bash` (platform-matrix.md Axis 2). Everything about BSD userland on those runners is read only (there is no macOS host here).

What a Linux-only CI misses (`fixtures/.../b32/feat.sh`, `matrix.sh bash`, 2026-10-11; list is features whose probe FAILED):

```
bash 3.2: mapfile readarray ${x,,} ${x^^} &>> |& [[ -v ]] ${a[-1]} local -n printf '%(%s)T' wait -n $EPOCHREALTIME
          case ;& coproc set -u+empty "${a[@]}" ${v@Q} globstar inherit_errexit lastpipe EPOCHSECONDS declare -g
bash 4.0: [[ -v ]] ${a[-1]} local -n printf '%(%s)T' wait -n $EPOCHREALTIME set -u+empty array ${v@Q} inherit_errexit lastpipe EPOCHSECONDS declare -g
bash 4.2: local -n wait -n $EPOCHREALTIME set -u+empty array ${v@Q} inherit_errexit EPOCHSECONDS
bash 4.4: $EPOCHREALTIME EPOCHSECONDS
bash 5.0 to 5.3: none failed
```

`declare -A` does not appear in the 3.2 list because a failing `declare -A` is a silent misparse, not a syntax error:

```
== bash 3.2   line 1: declare: -A: invalid option ... count=1 alpha=2 beta=2 (expect count=2 alpha=1 beta=2)   -> exit 0
== bash 4.0   count=2 alpha=1 beta=2   -> exit 0
bash 3.2 -e (the default GitHub step shell) on the same script: exit 2
```

So under the default `bash -e {0}` a macOS runner fails loudly at the `declare`; a script without `-e` (a local run, a `sh` step, a script file without `set -e`) computes wrong data. First-party workflow bodies use `declare -A`/`mapfile` only in `ubuntu-latest` jobs (`ocx/.github/workflows/oci-publish.yml:124-125,225`, `scan-binaries.yml:102,105`, `grimoire/.github/workflows/publish-ocx.yml:130`), so no live macOS break exists; the check exists for the day a `macos-*` leg is added. Fleet macOS legs are few (4 `macos-latest`, 1 `macos-26` jobs).

### 7. Script injection through the template expansion

Mechanism ([secure-use](https://github.com/github/docs/blob/main/content/actions/reference/security/secure-use.md), [Security Lab, 2021-08-04](https://securitylab.github.com/resources/github-actions-untrusted-input/)): `${{ }}` is substituted before the temporary script file is written, so the value becomes shell source. The fix is an intermediate environment variable, read as `"${VAR}"` (shell) or `$env:VAR` (PowerShell). The Security Lab list of attacker-controlled contexts (issue/PR title and body, comment body, commit message, author name and email, `head.ref`, `head.label`, `head.repo.default_branch`, `github.head_ref`, `pages.*.page_name`) is the list actionlint implements, extended by `review_comment.body` ([checks.md, "Script injection by potentially untrusted inputs"](https://github.com/rhysd/actionlint/blob/main/docs/checks.md)). Branch names are enough: `zzz";echo${IFS}"hello";#` is a valid ref name.

Proof by execution (`fixtures/.../run-b.sh`, act 0.2.89 host mode; a canary file is created only if the payload ran):

```
##### act issues: inject          (run: echo "issue=${{ github.event.issue.title }}")   RESULT: payload EXECUTED
##### act issues: inject-env      (env: TITLE: ...; run: echo "issue=${TITLE}")          RESULT: payload inert
##### act workflow_dispatch: inject-input      (the www-setup shape, inputs.release_tag) RESULT: payload EXECUTED
##### act workflow_dispatch: inject-input-env                                            RESULT: payload inert
##### act workflow_dispatch: inject-pwsh       ("${{ inputs.release_tag }}" in pwsh)     RESULT: payload EXECUTED
##### act workflow_dispatch: inject-pwsh-env                                             RESULT: payload inert
##### act issues: inject-envctx    (env: TITLE: <untrusted>; run: echo "issue=${{ env.TITLE }}")   canary created
```

Tool coverage on the same plants (V4, V5, V7):

```
                                  actionlint 1.7.12   zizmor 1.30.1 (--min-severity high)   grep (check-inject.sh / env. grep)
github.event.issue.title in run   FLAGS (exit 1)      FLAGS (exit 14)                        FLAGS
inputs.release_tag in run (sh)    silent (exit 0)     FLAGS (exit 14)                        FLAGS
"${{ inputs.release_tag }}" pwsh  silent (exit 0)     FLAGS (exit 14)                        FLAGS
${{ env.TITLE }} with env: untrusted   silent (exit 0)   silent (exit 0)                     FLAGS (env. grep)
env: indirection twins            silent              silent (exit 0)                        silent
```

zizmor's own remediation text says `${{ env.VARNAME }}` "is still a template expansion"; use `${VARNAME}` ([audits, template-injection](https://docs.zizmor.sh/audits/)). Under a `persona` of `pedantic` or `auditor` zizmor flags every template expansion in a code context; the default persona does not.

Chase: `www-setup@a251c3631047:.github/workflows/test-installers.yml` (workflow_dispatch input `release_tag`, free text; `on: pull_request` also present, line 6):

```
206:  if [ -n "${{ inputs.release_tag }}" ]; then
207:    args="--version $(echo '${{ inputs.release_tag }}' | sed 's/^v//')"
239:  if ("${{ inputs.release_tag }}") {              (pwsh, job windows)
241:    $a += "${{ inputs.release_tag }}".TrimStart('v')
269:  if ("${{ inputs.release_tag }}") {              (pwsh, job install-ps1-unix)
271:    $a += "${{ inputs.release_tag }}".TrimStart('v')
```

- 6 sites, matching the audit's "T2 true positives = 6"; zizmor 1.30.1 reports exactly 6 `error[template-injection]` at 206:24, 207:41, 239:20, 241:24 (and 269/271), run with `--offline --min-severity high` (read-only on the repo). The earlier note names only 206-207.
- Reach: the injectable context is a dispatch input, so the actor needs write access; the job runs with the repository's default token on `ubuntu-latest`/`macos-26`/Windows. Severity is low (maintainer-only), the class is real. A tag such as `v1'; touch X; echo '` ends the quote at 207 (reproduced in `inject-input.yml`: canary created); `v1$(New-Item ...)` runs inside the pwsh double quotes at 239/241, evaluated twice because the expression appears twice.
- Why the fleet's own gate missed it: `www-setup/.github/workflows/verify.yml:103-109` runs actionlint 1.7.12, which does not treat `inputs.*` as untrusted (table above). Fix for the owner (not applied): `env: RELEASE_TAG: ${{ inputs.release_tag }}` and `"${RELEASE_TAG#v}"` / `$env:RELEASE_TAG`.
- `www-setup@a251c3631047:.github/workflows/update-dist.yml:27` `echo "... ${{ github.event.client_payload.version }}"` is a T1 shape (a `"` in the payload ends the string); `repository_dispatch` needs a write token and the block only echoes, so low. Same fix.
- No other fleet T1/T2 site: the check-inject.sh sweep over 140 workflow directories (first-party plus vendored) listed 7 `with:` lines in `notify-discord.yml` copies (non-shell action input; safe per the Security Lab, which says the value is passed as an argument), 3 in vendored `uv`, and the 7 above. Four more hits are `${{ env.BUILD_MANIFEST_NAME }}` in generated `release.yml` `with:` paths (`ocx/.github/workflows/release.yml:172,238`), not shell.
- Exemplars show the class is common: `direnv@28a73d1df3f3:.github/workflows/update-gomod2nix.yml:29` `git push origin HEAD:${{ github.head_ref }}`; `actions__runner-images@8197087fc536:.github/workflows/create_pull_request.yml:19-21` `git checkout ${{ github.event.client_payload.ReleaseBranchName }}`; `nvm@b1b3a0038c06:.github/workflows/nvm-install-test.yml:29-30`; `fzf@25adb674537b:.github/workflows/release.yml:36` `v='${{ inputs.version }}'`; `k3s@82a6ddcd820b:.github/workflows/release.yml:173,279` `TAG=${{ github.ref_name }}`.

### 8. Environment files: GITHUB_ENV, GITHUB_OUTPUT, GITHUB_PATH

Parser, from [FileCommandManager.cs:390-430](https://github.com/actions/runner/blob/main/src/Runner.Worker/FileCommandManager.cs): each non-empty line is `NAME=VALUE` if `=` comes before any `<<`; `NAME<<DELIM` starts a block that ends at the first line exactly equal to `DELIM` (`string.Equals(tempLine, delimiter, Ordinal)`). Unterminated, missing final newline, or a bare line with neither `=` nor `<<` throws. The docs warn: "Make sure the delimiter you're using won't occur on a line of its own within the value. If the value is completely arbitrary then you shouldn't use this format. Write the value to a file instead." ([workflow-commands](https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/workflow-commands.md), "Multiline strings"); the docs' own bash example uses a fixed `EOF`, the pwsh one uses `(New-Guid).Guid`.

A port of the parser (`fixtures/.../envf/envfile_parse.py`, labelled emulation, not the runner) on an attacker value `line1 / EOF / INJECTED=pwned / OTHER<<EOF / x`:

```
fixed delimiter EOF            -> JSON = 'line1' ; INJECTED = 'pwned' ; OTHER = 'x'          (two extra variables set)
NAME=VALUE with newline value  -> title = 'x' ; INJECTED = 'pwned'
random delimiter (ghadelim_...) -> JSON = 'line1\nEOF\nINJECTED=pwned\nOTHER<<EOF\nx'         (value intact)
printf '%s' (no trailing \n) before the closing delimiter -> Invalid value. Matching delimiter not found
```

`$GITHUB_PATH`: each line is a directory prepended to PATH, no trimming, UTF-8 (FileCommandManager.cs:127-157); a path read from untrusted data can prepend an attacker directory. `::set-env` is refused unless `ACTIONS_ALLOW_UNSECURE_COMMANDS` is true; `::set-output`/`::save-state` still work with a deprecation issue ([ActionCommandManager.cs:236-390](https://github.com/actions/runner/blob/main/src/Runner.Worker/ActionCommandManager.cs)); write `echo "name=value" >> "$GITHUB_OUTPUT"`.

Encoding on Windows PowerShell 5.1 (`fixtures/.../pwsh/envenc.ps1`, `matrix.sh pwsh`): the docs prescribe `Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append` for `shell: powershell` and `>>` for `pwsh` (the "PowerShell Core versions 6 and higher use UTF-8 by default" note). Measured:

```
== pwsh 7.4.7 / 7.6.6                "MY_VAR=hello" >> $f   first bytes 4d 59 5f 56 41 52 ("MY_VAR")  len 13
== Windows PowerShell 5.1.26100.9444  "MY_VAR=hello" >> $f   first bytes ff fe 4d 00 59 00 (UTF-16LE + BOM)  len 30
```

The runner reads these files as UTF-8, so a plain `>>` under `shell: powershell` writes a file the runner cannot parse.

Fleet: 6 `GITHUB_ENV`, 6 `GITHUB_PATH`, 71 `GITHUB_OUTPUT` lines. Fixed `EOF` delimiters: `setup-ocx@25fa771f8572:.github/workflows/release.yml:30-36` (`echo 'content<<EOF'; cat "$OUTPUT"; echo EOF` with git-cliff output, i.e. commit-message text; a commit-message line `EOF` would end the block early and the next lines parse as outputs) and the cargo-dist generated `release.yml:161,213,228` in ocx and grimoire (`echo "paths<<EOF"`, build-file paths; generated, policed by `dist generate --check`, exempt).

### 9. Composite actions

actionlint 1.7.12 does not lint `action.yml`: it reports `"jobs" section is missing in workflow`, `unexpected key "runs" for "workflow" section` (V10 shows the output), so neither ShellCheck nor the untrusted-input check reaches composite `run:` bodies. A multi-line grep reaches them (V10). In composites the injection surface is `${{ inputs.* }}`, which is attacker-reachable through the caller. Fleet: 16 composite files, 25 `shell:` values (24 `bash`, 1 `pwsh`), 0 `run` steps without `shell:`, 0 `inputs.*` interpolated into a run body; `ocx/.github/actions/bazel-cache-rc/action.yml:68-76` is the model (`env:` indirection with a comment saying why, `shell: bash`, `set -euo pipefail`). Which value: `bash` unless the step is Windows-only PowerShell; `shell: bash` on a Windows runner is Git Bash (section 5).

### 10. The price of pipefail: SIGPIPE and grep -q

Adding `shell: bash` (or `defaults.run.shell: bash`) turns pipefail on, which exposes the early-exit consumers. `producer | grep -q pat` fails with status 141 when `grep -q` exits at the first match and the producer writes again. Measured on every bash 3.2 to 5.3: `set -o pipefail; yes | grep -q y; echo $?` prints 141 (`out/sigpipe.txt`). ShellCheck 0.11.0 stays silent on it (`SC2337` is unreleased, CHANGELOG "Git" section).

Fleet instance (latent fail-open): `grimoire-indexer@19fe2dcb5dc1:.github/workflows/release.yml:48-55`:

```
run: |
  set -euo pipefail
  if npm publish --dry-run 2>&1 | tee /dev/stderr | grep -q "auto-corrected"; then
    echo "::error::npm would rewrite package.json ..."; exit 1
  fi
```

Reproducer of the shape (`fixtures/.../failopen.sh`, bash 5.0 to 5.3): the producer prints the match, sleeps, prints more; the pipeline status is 141, the `if` is false and the guard stays silent although the text was printed. Whether npm's real output arrives after grep exits is timing dependent, so the guard is race-prone, not always off. Fix for the owner: capture first (`out="$(npm publish --dry-run 2>&1)"; grep -q ... <<<"$out"`). When a workflow moves from the default shell to `shell: bash`, audit each `| grep -q` and `| head`.

### 11. actionlint, ShellCheck and zizmor as the gate

What actionlint 1.7.12 does for `run:` ([checks.md, shellcheck integration](https://github.com/rhysd/actionlint/blob/main/docs/checks.md)): runs ShellCheck only when the shell is `bash` or `sh` (default `bash` on Linux/macOS, `pwsh` on Windows), replaces `${{ }}` with underscores, disables SC1091, SC2050, SC2194, SC2154, SC2157, SC2043 because they conflict with the expression syntax, and assumes `bash` when the shell cannot be determined statically. It validates the shell name (`shell: dash` is rejected: available names are `bash`, `pwsh`, `python`, `sh`; `powershell` is rejected on Linux/macOS).

Measured here (`fixtures/.../al/`, actionlint 1.7.12 with ShellCheck 0.11.0 on PATH):

```
default shell, unquoted $f              -> SC2086:info                       (exit 1)
shell: sh, [[ ]] and arrays             -> SC3010, SC3030, SC2034            (dialect follows the shell)
shell: pwsh and default-pwsh Windows    -> not linted (exit 0)
shell: dash                             -> shell name "dash" is invalid
shell: bash -euo pipefail {0}           -> linted as bash (SC2086 reported)
shell: /bin/bash -euo pipefail {0}      -> NOT linted: exit 0, no output          <- silent bypass
-shellcheck= (empty)                    -> ShellCheck integration off
SHELLCHECK_OPTS='-S warning'            -> SC2086 (info) dropped, SC2034/SC3010/SC3030 (warning) kept
```

Homebrew states the same trap in a comment (`Homebrew__install@8ab1549dfa11:.github/workflows/actionlint.yml:86-87`). actionlint has no rule for a missing `shell:` or a missing pipefail, so it cannot replace the CI-01 grep.

Fleet gate state: `ocx/taskfiles/ci.taskfile.yml:17-25` runs `actionlint` with `SHELLCHECK_OPTS: '--severity=warning'` (the same floor as `shellcheck -S warning` in `ocx/taskfiles/shell.taskfile.yml:38`), `.github/actionlint.yaml` ignores the cargo-dist `release.yml`; `www-setup/.github/workflows/verify.yml:103-109` pins `raven-actions/actionlint` with `version: 1.7.12`. Running actionlint 1.7.12 over the 25 first-party repos with workflows (default severity) produced 20 findings: 18 ShellCheck (SC2086 x8, SC2129 x5, SC2035 x4, SC2116 x1; all info/style), 1 `[expression]` (`grimoire/.github/workflows/release.yml:230` property `output` is not defined: a real typo candidate), 1 `[action]` (`oras-www` checkout@v3 too old). The default severity is noisy; at `--severity=warning` those 18 vanish, so the gate floor is clean today. Exemplar `k3s-io__k3s@82a6ddcd820b:.github/workflows/actionlint.yaml:19-20` sets `shellcheck: false`, which is the opposite choice.

Decision: yes, actionlint is part of the gate, with the warning floor, plus a second tool or grep for what it misses. zizmor 1.30.1 finds the `inputs.*` class (6/6 at www-setup) and exits 14 on a high finding with `--min-severity high`, exit 0 on the `env:` twins; it needs no network with `--offline` but cannot see the `${{ env.X }}` class. A zizmor audit on the shell-quality gate is a SHOULD (new tool, owner decision); the grep in SH-CI-03/04 is the MUST because it ran red on every plant.

### 12. Taskfile cmds: the interpreter is mvdan/sh, not bash

Task embeds [mvdan/sh](https://github.com/mvdan/sh); the docs say "not all options are available in the shell interpreter library" ([guide, set and shopt](https://github.com/go-task/task/blob/v3.53.1/website/src/latest/docs/guide.md)). Versions measured (all four binaries run the same `Taskfile.yml`, `fixtures/.../tf/`, `run-c.sh`, out/taskfile-runs.txt):

```
task 3.45.4  (2025-era)   mvdan.cc/sh/v3 (not read)
task 3.51.1               mvdan.cc/sh/v3 v3.13.2-0.20260510185049-f5c6e2779117
task 3.53.1               mvdan.cc/sh/v3 v3.13.2-0.20260817215856-d6550df7ed8d   (go.mod at tag v3.53.1)
task 3.54.0 (2026-10-01)  mvdan.cc/sh/v3 v3.14.1                                 (go.mod at tag v3.54.0)
```

Defaults and options (3.53.1 unless a version is named; 3.51.1 and 3.54.0 identical except where noted):

```
errexit        ON   "false; echo x" fails the task (rc 201)
pipefail       OFF  "false | cat; echo ..." continues
set: [pipefail] at Taskfile / task / cmd level      WORKS (rc 201 on a failing pipeline)
set -o pipefail inside the same cmd                  WORKS
set -o pipefail as its OWN cmd item                  does NOT carry: next cmd "REACHED"  (each cmd item is a fresh interpreter;
                                                     x=1, export Y=2, cd, set +e are all lost between items; one multi-line cmd shares state)
shopt: [pipefail]  3.45.4: panic "index out of range [-1]" (go-task#2429);  3.51.1/3.53.1: 'shopt: invalid option name "pipefail"';
                   3.54.0: load-time 'invalid option name: "pipefail"'.   pipefail belongs in set:
status: with set: [pipefail]   NOT applied: "Task is up to date" (go-task#2469, open; reproduced on 3.53.1 and 3.54.0);
                   a status command with "set -o pipefail;" inline is applied
printf -v v "%s" hi          silently wrong:  prints "-vprintf-v=[]"  (rc 0, no -v support)
PIPESTATUS                   unset  (PIPESTATUS=[unset])
BASH_VERSION, BASH_SOURCE    unset
read -r -p "x" v <<<"abc"    works (v=abc) but prints the prompt although stdin is not a terminal; bash prints no prompt there
read -r -p "x" v </dev/null  rc 1 -> errexit fails the task (same as bash on EOF); the audit's "read -p breaks" is wrong
works: arrays, <<<, [[ ]], declare -A with plain keys, mapfile, ${x,,}, local in functions, trap EXIT, $((..)), echo -e, $'..', set -euo pipefail
```

The panic, pinned (`Taskfile.assoc.yml`, 3.53.1; identical message on 3.45.4, 3.51.1, 3.54.0): `panic: interface conversion: syntax.ArithmExpr is *syntax.BinaryArithm, not *syntax.Word`. Trigger: a `-` inside an unquoted associative-array subscript. Matrix:

```
PANIC   declare -A m; m[x-y]=v                       PANIC   declare -A m=([x-y]=v)   and   declare -A m=(["x-y"]=v)
PANIC   echo "${m[x-y]}"   (unquoted read)           ok      m["x-y"]=v   m['x-y']=v   ${m["x-y"]}   ${m['x-y']}   k=x-y; m[$k]=v
ok      m[a/b]=v  m[a+b]=v  m[a*b]=v                 error   m[a.b]=v -> "floating point arithmetic is a zsh feature";  m["a b"]=v; ${m[a b]} -> "not a valid arithmetic operator"
```

Fixes: quote every subscript (`m["$k"]`, `${m["x-y"]}`), build keys with underscores, or use a `case` (what `ocx-mirror@71bb1c2953ba:taskfiles/release.taskfile.yml:196-197` does). The comment there still holds on the newest task. The newer mvdan/sh changelog (3.14.0, 2026-08-28) lists "Allow pound signs in associative array keys like `${args[cmd,#]}`" and many arithmetic fixes but not this case ([CHANGELOG](https://github.com/mvdan/sh/blob/master/CHANGELOG.md)); 3.14.1 (2026-09-06) is only syntax/pattern fixes.

Windows: task 3.48.0 on the Windows host (`winget`) behaves the same for the table above (`printf -v` -> `-vprintf-v=[]`, `BASH_VERSION` unset, `declare -A m; m[x86_64-linux]=v` panics), and external commands resolve against the Windows PATH: `uname` fails with `"uname": executable file not found in $PATH`. A Taskfile cmd that calls `uname`, `sed`, `readlink` therefore needs a `platforms:` restriction or a Windows alternative.

Fleet (audit Axis 6 plus a re-count): 99 files / 954 cmds, 4 files with `set:`/`shopt:`; bash-only constructs are 4 sites in 2 files and all run on mvdan: `ocx-mirror@71bb1c2953ba:taskfiles/release.taskfile.yml:55` (`<<<`), `:119,:121` (arrays), `ocx@5de9d777eb7d:taskfiles/satellite.taskfile.yml:183` (`local`). Idiom in use: `set -euo pipefail` as the first line of a multi-line cmd (`ocx-mirror/.../release.taskfile.yml:40,117`) and a commented `set -o pipefail;` before `cargo nextest ... | tee` (`ocx@5de9d777eb7d:taskfiles/rust.taskfile.yml:388-395`).

### 13. Linting Taskfile cmds

There is no actionlint for Taskfiles and the fleet's shell gate takes `git ls-files '*.sh'` only (`ocx/taskfiles/shell.taskfile.yml:38`). A 25-line extractor (`fixtures/.../tflint/extract.py`: PyYAML, `cmds`/`cmd`/`status`, `{{ }}` replaced by `TMPL`, each cmd wrapped in a subshell) feeding `shellcheck -s bash -S warning` with the same exclusions as actionlint (`-e SC1091,SC2050,SC2194,SC2154,SC2157,SC2043`) is red on the plant (SC2045) and green on the twin. Over 70 first-party Taskfiles it reports 4 SC2046 (unquoted `$(find ...)`) at `ocx-website@5afea4982580:Taskfile.yml:106-108` and `grimoire@4650ad830375:taskfiles/bench.taskfile.yml` (`set -- $(echo ... | tr '|' ' ')`, deliberate splitting) and one SC2034 artifact of the placeholder (`grimoire-indexer/taskfiles/release.taskfile.yml`). Without the exclusions the template placeholder produces 14 false SC2194/SC2050/SC2157/SC2043 hits. The dialect is `bash` because mvdan/sh parses bash; it is not the same interpreter, so ShellCheck-clean does not mean it runs on task (the Taskfile constructs grep in V17 covers that gap).

### 14. Inline run block or script file

Fleet distribution (first-party, 583 `run:` blocks parsed with PyYAML; `fixtures/.../runlen.py`): 396 are one line, 136 are 2-9 lines, 32 are 10-19, 11 are 20-39, 8 are 40 or more (`ocx/.github/workflows/oci-publish.yml` 204 lines, `e2e-mirror/.github/workflows/mirror-signing.yml` 180, `ocx-mirror/.../oci-publish.yml` 124, `grimoire/.../publish-ocx.yml` 81). The multi-line grep V15 finds 40 blocks of 10+ body lines.

What a script file buys: ShellCheck and shfmt run on `*.sh` in the fleet gate (`shellcheck -S warning`, `shfmt -d -i 4 -ci`), local reproduction without act, `bash -n`, the dialect the shebang declares, and no 21,000-character ceiling. What it costs: the checkout must precede it and `${{ }}` values must be passed as env or arguments (which is the injection fix anyway). Trigger to extract: 10 or more lines, any function, trap, `case`, loop with more than one command, a `mapfile`/`declare -A`, or any block you would want to run locally. Keep inline: one to nine lines of glue (`gh`, `echo "x=y" >> "$GITHUB_OUTPUT"`, a single tool call).

### 15. Fleet defects found (reported, not fixed)

- `www-setup@a251c3631047:.github/workflows/test-installers.yml:206,207,239,241,269,271` T2 injection (section 7). Reproducer: `inj/.github/workflows/inject-input.yml` and `inject-pwsh.yml` with `run-b.sh`.
- `www-setup@a251c3631047:.github/workflows/update-dist.yml:27` T1 echo (low).
- `grimoire-indexer@19fe2dcb5dc1:.github/workflows/release.yml:51` SIGPIPE fail-open (section 10). Reproducer: `failopen.sh`.
- `setup-ocx@25fa771f8572:.github/workflows/release.yml:30-36` fixed `EOF` delimiter with commit-derived text (section 8). Reproducer: `envf/run-envfile.sh`.
- `grimoire@4650ad830375:.github/workflows/release.yml:230` actionlint `[expression]` "property output is not defined" (a typo for `outputs` is likely; not tested).
- 22 default-shell pipelines without pipefail (section 2) are advisory until the owner decides whether to set `defaults.run.shell: bash` fleet-wide.

## Normative guidance candidates

Verification shape: every grep names a directory operand; output is the violation (empty output means pass); judge a pipeline by its output, not its exit code (a final `xargs -r` exits 123 when its grep finds nothing). "RUN" says whether the verification was run against a planted violation and its twin; the transcripts are in Verification runs.

1. **SH-CI-01 (MUST) Declare the shell.** Every workflow that has a `run:` step sets `defaults.run.shell: bash` (workflow or job level) or gives every `run:` step its own `shell:`. Rationale: the default is `bash -e {0}` with no pipefail, so `a | b` hides a failing `a` and the choice changes silently. Verify (output is a violating step):
   `grep -rLZ -Pz -e '\n[ ]*defaults:[ ]*\n[ ]*run:[ ]*\n[ ]*shell:' --include='*.yml' --include='*.yaml' .github/workflows | xargs -r -0 grep -Pzo -e '(?ms)^[ ]*-[ ](?=(?:(?!\n[ ]*-[ ]).)*?\brun:)(?!(?:(?!\n[ ]*-[ ]).)*?\bshell:)(?:(?!\n[ ]*-[ ]).)*'`.
   Narrow variant (steps with a bare pipeline and no pipefail) is `fixtures/.../check-shell.sh <dir> pipeline`. RUN: yes, V1 (plants `wf/pipeline-default`, `plants/bad`; twins `wf/pipeline-bash`, `wf/pipeline-defaults-run`, `plants/good`). Fleet: 482 steps, 22 pipelines (matches the audit).
2. **SH-CI-02 (MUST) Use `shell: bash` for anything with `set -o pipefail`, `[[ ]]`, arrays, `$'..'`; never write `set -o pipefail` under `shell: sh`.** Rationale: `sh` is dash; `set -o pipefail` exits 2 on 0.5.12-6ubuntu5 (ubuntu-24.04) and works on 0.5.12-12ubuntu3 (ubuntu-26.04), and ShellCheck's `sh` dialect (SC3010, SC3030) is the only guard. Verify: `grep -rn -e 'shell: sh$' --include='*.yml' --include='*.yaml' .github/workflows` lists each `sh` step to review (a matrix key named `shell: sh`, as in e2e-mirror, is a false positive), and actionlint reports SC3xxx for those bodies. RUN: yes, V13 and `run-m04.sh` (docker ubuntu:24.04 exit 2, ubuntu:26.04 exit 1).
3. **SH-CI-03 (MUST) No attacker-reachable `${{ }}` in a `run:`/`script:` body; route it through `env:` and read `"${VAR}"` / `$env:VAR`.** The set: `github.event.*.{title,body,message,name,email,ref,label,default_branch}`, `github.event.pages.*`, `github.event.client_payload.*`, `github.head_ref`, `github.ref_name`, and `inputs.*` / `github.event.inputs.*`. Rationale: the expansion happens before the script exists, so the value is code (canary files created under act). Verify: actionlint (covers the first group only) and zizmor `--min-severity high` (covers `inputs.*`), plus this grep, one per family, K = the non-key-line prefix:
   `grep -rPn -e '^(?!\s*(?:-\s+)?(?!run:)[A-Za-z_][A-Za-z0-9_.-]*:\s).*\$\{\{[^}]*\binputs\.' --include='*.yml' --include='*.yaml' .github/workflows`
   `grep -rPn -e '^(?!\s*(?:-\s+)?(?!run:)[A-Za-z_][A-Za-z0-9_.-]*:\s).*\$\{\{[^}]*github\.head_ref\b' --include='*.yml' --include='*.yaml' .github/workflows`
   `grep -rPn -e '^(?!\s*(?:-\s+)?(?!run:)[A-Za-z_][A-Za-z0-9_.-]*:\s).*\$\{\{[^}]*github\.event\.[A-Za-z0-9_.*]*\.title\b' --include='*.yml' --include='*.yaml' .github/workflows`
   (the same with `body`, `message`, `name`, `email`, `ref`, `label`, `default_branch`, `github\.event\.pages\.`, `github\.event\.client_payload\.`, `github\.ref_name`; `fixtures/.../check-inject.sh` runs all 13). A hit inside a `with:` block of a non-shell action is not a violation (7 `notify-discord.yml` lines in the fleet). RUN: yes, V3/V4/V5 and `run-b.sh` (plants `inject`, `inject-input`, `inject-pwsh`; twins `-env`). Fleet: 6 true sites in www-setup plus 1 echo.
4. **SH-CI-04 (MUST) Never `${{ env.X }}` inside a run body; use `${X}` / `$env:X`.** Rationale: it is still a template expansion, and neither actionlint 1.7.12 nor zizmor 1.30.1 flags it; the canary was created. Verify: `grep -rPn -e '^(?!\s*(?:-\s+)?(?!run:)[A-Za-z_][A-Za-z0-9_.-]*:\s).*\$\{\{\s*env\.' --include='*.yml' --include='*.yaml' .github/workflows` (a `with:` hit is not a violation; fleet has 4 such, all generated `release.yml`). RUN: yes, V7.
5. **SH-CI-05 (MUST) Multiline `$GITHUB_ENV`/`$GITHUB_OUTPUT` values use a random delimiter; a one-line `name=value` never receives a value that may contain a newline; arbitrary data goes to a file.** Rationale: the runner ends the block at the first line equal to the delimiter; a fixed `EOF` plus attacker text sets extra variables (parser port: `INJECTED=pwned`). Verify: `grep -rnE -e "echo ['\"][A-Za-z_][A-Za-z0-9_]*<<EOF" --include='*.yml' --include='*.yaml' .github/workflows`; generated cargo-dist files are exempt. Safe form: `delim="ghadelim_$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')"`, and end the value with a newline before the closing delimiter. RUN: yes, V8 (grep) and `envf/run-envfile.sh` (parser port).
6. **SH-CI-06 (MUST) Under `shell: powershell` (5.1) write `$GITHUB_ENV`/`$GITHUB_PATH` with `Out-File -Encoding utf8 -Append`; plain `>>` only under `pwsh`.** Rationale: 5.1 `>>` writes UTF-16LE with a BOM, the runner reads UTF-8. Verify: `grep -rnE -e '>> *[$]env:GITHUB_(ENV|PATH|OUTPUT)' --include='*.yml' --include='*.yaml' .github/workflows` and read the step's `shell:` (reading heuristic on top of the list). RUN: yes for the encoding fact (`envenc.ps1`, three PowerShell versions); the grep is a list to review, not a pass/fail.
7. **SH-CI-07 (MUST) Every `run:` step in a composite `action.yml` carries `shell:` (`bash` by default) and takes `inputs.*` through `env:`.** Rationale: job defaults are skipped inside composites (ScriptHandler.cs:75) and actionlint does not lint `action.yml`. Verify: `grep -rPzo --include='action.yml' --include='action.yaml' -e '(?ms)^[ ]*-[ ](?=(?:(?!\n[ ]*-[ ]).)*?\brun:)(?!(?:(?!\n[ ]*-[ ]).)*?\bshell:)(?:(?!\n[ ]*-[ ]).)*' .` and the inputs form of SH-CI-03 run against `action.yml`. RUN: yes, V10 (`bad`, `mixed` red; `good` green). Fleet: 16 composites, 0 violations.
8. **SH-CI-08 (MUST) pwsh steps: a native command's failure needs `$PSNativeCommandUseErrorActionPreference = $true` (7.4+) or a per-call `$LASTEXITCODE` check; see PS-ERR (shell-pwsh.md).** Rationale: `$ErrorActionPreference='stop'` does not cover native exit codes (5.1, 7.4.7, 7.6.6). Verify: named reading heuristic (a pwsh `run:` with two or more native calls and neither guard); the fact is RUN: `gh_pwsh.ps1` on three PowerShell versions (V22).
9. **SH-CI-09 (SHOULD) When enabling pipefail, rewrite `producer | grep -q` and `producer | head`: capture first, test after.** Rationale: 141 from SIGPIPE under pipefail turns a guard into a silent pass. Verify: `grep -rPn -e ' \x7c +grep -[A-Za-z]*q' --include='*.yml' --include='*.yaml' .github/workflows`; unreleased ShellCheck SC2337 will cover it. RUN: yes, V11 and `sigpipe.sh`/`failopen.sh` (bash 3.2 to 5.3 all 141). Fleet hit: `grimoire-indexer/.../release.yml:51`.
10. **SH-CI-10 (MUST) A `run:` body on a `macos-*` runner uses bash 3.2.57 syntax (no `declare -A`, `mapfile`, `readarray`, `${x,,}`, `${x^^}`, `&>>`, `wait -n`, `$EPOCHREALTIME`), or the job installs a newer bash and calls it by path.** Rationale: macOS runners ship 3.2.57 and no GNU userland; Linux CI cannot see it. Verify: `grep -rnE -e 'declare -A' -e 'mapfile' -e 'readarray' -e '[$][{][A-Za-z_]+,,[}]' -e '[$][{][A-Za-z_]+\^\^[}]' -e '&>>' --include='*.yml' --include='*.yaml' .github/workflows`, keep only hits whose job has `runs-on` containing `macos`. RUN: yes, V12 (grep) and `b32/feat.sh` on bash 3.2 to 5.3; BSD userland claims are unverified (no macOS host).
11. **SH-CI-11 (MUST) Under `shell: bash` on Windows runners: `cmd //c` (or `MSYS_NO_PATHCONV=1`), `cygpath -w` for paths handed to native tools, no reliance on MSYS tools from pwsh/cmd steps.** Rationale: Git Bash 5.3.15 rewrites Unix-looking arguments; `cmd /c` loses its flag. Verify: `grep -rnE -e '(^|[ ;(])cmd /[cCkK] ' --include='*.yml' --include='*.yaml' .github/workflows` (then keep hits in a bash step). RUN: yes, V20 (grep) and `gitbash/pathconv-default.sh` on Git Bash 5.2.15 (runner version 5.3.15 unverified).
12. **SH-CI-12 (MUST) Task: set pipefail with `set: [pipefail]` (Taskfile, task or cmd level) or `set -o pipefail;` in the same cmd; never in a separate cmd item; never `shopt: [pipefail]`; put `set -o pipefail;` inside a `status:` command too.** Rationale: each cmd item is its own interpreter; `shopt: pipefail` panics on task 3.45.4 and errors on 3.51.1+; `status:` ignores `set:` (go-task#2469). Verify: `grep -rn -e 'shopt:' --include='Taskfile*.yml' --include='*.taskfile.yml' .` (every `shopt:` list is reviewed; `pipefail` in it is a defect) and the Taskfile run `fixtures/.../run-c.sh <task>`. RUN: yes, V16 on four task versions.
13. **SH-CI-13 (MUST) No `printf -v`, `PIPESTATUS`, `BASH_VERSION`/`BASH_SOURCE`, or unquoted `-` inside an associative-array subscript in task cmds; quote subscripts or use `case`.** Rationale: mvdan/sh gives silently wrong values for the first three and panics on the last (task 3.45.4 to 3.54.0). Verify: `grep -rnE -e 'printf[[:space:]]+-v' -e PIPESTATUS -e BASH_VERSION -e BASH_SOURCE --include='Taskfile*.yml' --include='*.taskfile.yml' .` and `grep -rnE -e '[A-Za-z_]+\[[A-Za-z0-9_]*-[A-Za-z0-9_-]*\]' --include='Taskfile*.yml' --include='*.taskfile.yml' .` (hits inside a function that is not run by task are false positives). RUN: yes, V17 (plant `Taskfile.bad.yml`, twin `Taskfile.good.yml`) and V16 (the panic itself).
14. **SH-CI-14 (SHOULD) Lint task cmds with ShellCheck through an extractor, bash dialect, warning floor, actionlint's exclusion list.** Rationale: the fleet gate sees only `*.sh`. Verify: `bash fixtures/.../tflint/run-tflint.sh Taskfile.yml` (exit 1 means findings). RUN: yes, V18 (plant SC2045, twin clean; fleet finds 4 SC2046).
15. **SH-CI-15 (MUST) The shell gate runs actionlint with `SHELLCHECK_OPTS='--severity=warning'`; a second check covers what actionlint misses (SH-CI-03/04 greps or zizmor `--min-severity high`).** Rationale: actionlint 1.7.12 is silent on `inputs.*`, on `${{ env.X }}`, on pwsh bodies and on composites. Verify: `actionlint` exit code in CI; the greps above. RUN: yes, V4/V5.
16. **SH-CI-16 (MUST NOT) Use a path-qualified shell template (`shell: /bin/bash -eo pipefail {0}`).** Rationale: actionlint 1.7.12 skips ShellCheck for it silently. Write `bash -eo pipefail {0}`. A custom template must contain `{0}` and drops `--noprofile --norc`. Verify: `grep -rnE -e 'shell: */' --include='*.yml' --include='*.yaml' .github/workflows`. RUN: yes, V14.
17. **SH-CI-17 (SHOULD) Move a `run:` block into a script file at 10 or more lines, or on any function, trap, `case`, multi-command loop, `mapfile`/`declare -A`; keep 1-9 lines of glue inline.** Rationale: ShellCheck, shfmt, local reproduction, the 21,000-character ceiling. Verify: `grep -rPzo --include='*.yml' --include='*.yaml' -e '(?m)^([ ]*)(?:-[ ]+)?run:[ ]*[|>][-+]?[ ]*\n(?:\1[ ]{2,}[^\n]*\n){10,}' .github/workflows` (output is each long block). RUN: yes, V15. Fleet: 40 blocks.
18. **SH-CI-18 (SHOULD) Dated note: until 2026-11-19, a workflow on `ubuntu-latest` must be correct on both ubuntu-24.04 and ubuntu-26.04 (bash 5.2.21 vs 5.3.9, dash without vs with pipefail, GNU vs uutils coreutils, ShellCheck 0.9.0 vs 0.11.0); pin `ubuntu-24.04` or add an `ubuntu-26.04` leg for shell-heavy jobs; test features, never `--version | grep GNU`.** Verify: `grep -rn -e 'ubuntu-latest' --include='*.yml' --include='*.yaml' .github/workflows` lists the exposed jobs. RUN: yes for the facts (`run-m04.sh`, `u26/probe.sh`); the grep is a list. Remove the note after the migration completes.
19. **SH-CI-19 (SHOULD) A step that adds `-u` uses `shell: bash -euo pipefail {0}`; do not stack `set -euo pipefail` as the first line of a `shell: bash` step that already has errexit and pipefail.** Rationale: `shell: bash` already gives `-e -o pipefail`; only `-u` is new, and `bash -euo pipefail {0}` fails an unset variable (measured under act). Verify: reading heuristic; `grep -rn -e 'set -euo pipefail' --include='*.yml' .github/workflows` shows the repetition. RUN: partial (the `-u` behaviour yes, `nounset.yml`).
20. **SH-CI-20 (MUST) Taskfile cmds that call GNU/POSIX tools carry `platforms:` or a Windows alternative.** Rationale: task on Windows runs mvdan/sh but resolves externals from the Windows PATH (`uname` not found on task 3.48.0). Verify: reading heuristic. RUN: yes for the fact (Windows host, `tf/Taskfile.yml`); no for a grep.

## Verification runs

All under `/home/mherwig/.cache/research-lang/shell-tools/fixtures/run-steps-and-taskfiles/` (FX). Master transcript `out/verify-all.txt` (`bash verify-all.sh`), other transcripts in `out/`. Tools: act 0.2.89 (host mode, `-P ubuntu-latest=-self-hosted`), actionlint 1.7.12, ShellCheck 0.11.0 and pwsh 7.6.6 from `run.sh`, zizmor 1.30.1, task 3.53.1 / 3.51.1 / 3.54.0 / 3.45.4 (and 3.48.0 on Windows), bash 3.2 to 5.3 and dash from `matrix.sh`, docker ubuntu:24.04 and 26.04. For `grep` checks "exit 0 + output" is red and "exit 1 + empty" is green; pipelines end in `xargs -r` and are judged by output (exit 123 and empty is green).

```
V1  CI-01 explicit shell     (FX/check-shell.sh, wf/ and plants/)
    plant wf/pipeline-default          exit=0   lines=5   "- name: default shell (bash -e {0}, no pipefail)"     RED
    twin  wf/pipeline-bash             exit=123 lines=0                                                       green
    twin  wf/pipeline-defaults-run     exit=0   lines=0                                                       green (file excluded by defaults.run.shell)
    plant plants/bad (any step)        exit=0   lines=4   bad/.github/workflows/pipe.yml: steps without shell RED
    twin  plants/good                  exit=123 lines=0                                                       green
    plant plants/bad (pipeline)        exit=0   lines=3   "- name: default shell pipeline"                   RED
    twin  plants/good (pipeline)       exit=123 lines=0                                                       green
V2  act pipelines (run-a.sh)           pipeline-default: pipefail off, REACHED, act-exit=0 | pipeline-bash: pipefail on, act-exit=1 | pipeline-defaults-run: pipefail on, act-exit=1
V3  CI-03 check-inject.sh (13 single-pattern greps; exit is the last grep, judge by lines)
    plant inj/inject          lines=1  11:  run: echo "issue=${{ github.event.issue.title }}"                  RED
    twin  inj/inject-env      lines=0                                                                          green
    plant inj/inject-input    lines=2  16: if [ -n "${{ inputs.release_tag }}" ]; then  (and :17)             RED
    twin  inj/inject-input-env lines=0                                                                         green
    plant inj/inject-pwsh     lines=1  16: if ("${{ inputs.release_tag }}") { $a += "${{ inputs.release_tag }}".TrimStart('v') }   RED
    twin  inj/inject-pwsh-env lines=0                                                                          green
V4  actionlint 1.7.12          inject exit=1 (potentially untrusted)  RED | inject-env 0 | inject-input 0 (MISSED) | inject-input-env 0 |
                               inject-pwsh 0 (MISSED) | inject-pwsh-env 0 | inject-envctx 0 (MISSED)
V5  zizmor 1.30.1 --min-severity high    inject 14 RED | inject-env 0 | inject-input 14 RED | inject-input-env 0 | inject-pwsh 14 RED | inject-pwsh-env 0 |
                               inject-envctx 0 (MISSED)         www-setup test-installers.yml: 6 x error[template-injection]
V6  run-b.sh (act, canary files)  inject EXECUTED / inject-env inert | inject-input EXECUTED / -env inert | inject-pwsh EXECUTED / -env inert | inject-envctx EXECUTED
V7  CI-04 env. context grep    plant inj/inject-envctx exit=0 lines=1 "13: run: echo \"issue=${{ env.TITLE }}\""  RED | twin inj/inject-env exit=1 lines=0 green
V8  CI-05 EOF grep             plant plants/bad exit=0 lines=1 "echo 'BODY<<EOF' >> \"$GITHUB_ENV\""  RED | twin plants/good exit=1 lines=0 green
    envf/run-envfile.sh (port of FileCommandManager.cs)
      fixed EOF            -> JSON='line1' INJECTED='pwned' OTHER='x'  exit 0    RED
      newline in name=value -> title='x' INJECTED='pwned'              exit 0    RED
      random delimiter      -> JSON intact                              exit 0    green
V9  pwsh/envenc.ps1 (matrix.sh pwsh): 7.4.7 and 7.6.6 first bytes 4d 59 5f 56 41 52 len 13 ; Windows PowerShell 5.1.26100.9444 first bytes ff fe 4d 00 59 00 len 30
V10 CI-07 composite             bad exit=0 lines=1 RED | mixed exit=0 lines=4 RED (the middle step) | good exit=1 lines=0 green
    actionlint on composite/bad/action.yml: exit 1 '"jobs" section is missing in workflow' (it does not lint action.yml)
V11 CI-09 grep -q               plant plants/bad exit=0 lines=1 (:24 npm publish ... | grep -q "auto-corrected") RED | twin plants/good exit=1 lines=0 green
    sigpipe.sh   bash 3.2 4.0 4.2 4.4 5.0 5.1 5.2 5.3: "rc=141" on all eight
    failopen.sh  bash 5.0-5.3: "GUARD SILENT (pipeline status 141) although the text was printed"
V12 CI-10 bash 4 grep          plant plants/bad exit=0 lines=3 (declare -A, mapfile, ${TAG,,}) RED | twin plants/good exit=1 lines=0 green
    b32/feat.sh  bash 3.2: 20 FAIL lines (list in section 6) ; bash 4.4: $EPOCHREALTIME, EPOCHSECONDS ; bash 5.0-5.3: none
    b32/assoc32.sh bash 3.2: count=1 alpha=2 beta=2 exit 0 (silent) ; bash -e on 3.2: exit 2
V13 CI-02 shell: sh grep       plant plants/bad exit=0 lines=1 (:8 shell: sh) RED | twin plants/good exit=1 lines=0 green
    run-m04.sh   ubuntu:24.04 dash 0.5.12-6ubuntu5 "set: Illegal option -o pipefail" exit 2 ; ubuntu:26.04 dash 0.5.12-12ubuntu3 exit 1
V14 CI-16 path template         plant plants/bad exit=0 lines=1 (:13 shell: /bin/bash -eo pipefail {0}) RED | twin plants/good exit=1 lines=0 green
    actionlint al/lint-custom-path.yml (shell: /bin/bash -euo pipefail {0}): exit 0, no output  -> ShellCheck skipped
    actionlint al/lint-custom.yml      (shell: bash -euo pipefail {0}):       exit 1, SC2086   -> ShellCheck ran
V15 CI-17 10+ line block        plant plants/bad exit=0 lines=12 RED | twin plants/good exit=1 lines=0 green (fleet: 40 blocks)
V16 Taskfile runs (run-c.sh <task>, tf/Taskfile.yml; out/taskfile-runs.txt, out/taskfile-assoc.txt)
    task 3.53.1: errexit-default rc=201 | pipefail-default rc=0 (ignored) | pipefail-in-cmd rc=201 | pipefail-set-global rc=201 | pipefail-set-cmd rc=201 |
                 pipefail-shopt rc=201 'invalid option name "pipefail"' | pipefail-status rc=0 (up to date) | printf-v rc=0 "-vprintf-v=[]" |
                 pipestatus "PIPESTATUS=[unset]" | bash-version "BASH_VERSION=[unset]" | read-p-eof rc=201 | read-p-data v=[abc] |
                 assoc-plain ok | assoc-dash-key rc=2 PANIC | assoc-dash-quoted rc=2 PANIC | case-workaround ok
    task 3.45.4: pipefail-shopt rc=2 PANIC "index out of range [-1]" ; assoc-dash-key PANIC
    task 3.51.1: pipefail-shopt rc=201 error ; assoc-dash-key PANIC
    task 3.54.0: pipefail-shopt rc=201 'invalid option name: "pipefail"' ; assoc-dash-key PANIC ; pipefail-status still "up to date"
    Taskfile.assoc.yml (3.53.1): lit-dash PANIC | compound PANIC | compound-q PANIC | read-dash PANIC | lit-dash-q ok | var-key ok | read-dash-dq ok | read-dash-sq ok
V17 CI-13 Taskfile constructs  plant plants/Taskfile.bad.yml exit=0 lines=3 (printf -v, PIPESTATUS, BASH_VERSION) RED | twin Taskfile.good.yml exit=1 lines=0 green
    assoc dash subscript       plant exit=0 lines=1 (:8 m[x86_64-linux]=amd64 ...) RED | twin exit=1 lines=0 green
V18 CI-14 tflint/run-tflint.sh plant bad.yml exit=1 "bad.yml(stream):8:10: error: Iterating over ls output is fragile. Use globs. [SC2045]" RED
                               twin good.yml exit=0 lines=0 green
V19 gitbash/pathconv-default.sh on Git Bash 5.2.15 (Windows host): see section 5 (out/pathconv.out)
V20 CI-11 cmd flag grep        plant plants/bad exit=0 lines=1 (:53 run: cmd /c echo hi) RED | twin plants/good exit=1 lines=0 green
V21 u26/probe.sh ubuntu:26.04  ls/sort/date/readlink/stat/... "uutils coreutils 0.10.0", "GNU NOT detected" ; ubuntu:24.04 "GNU detected"
V22 pwsh/gh_pwsh.ps1           7.4.7 and 7.6.6: NativeCommandUseErrorActionPreference stops ; 5.1: NOT-STOPPED
V23 al/ (actionlint+ShellCheck) lint-bad.yml exit=1: SC2086, SC2034, SC3010, SC3030, shell name "dash" invalid ; lint-good.yml exit=0 ;
                               SHELLCHECK_OPTS='-S warning' drops SC2086
```

No verification failed to go red where red was expected. The expected misses are recorded as such: actionlint on `inputs.*`, pwsh `inputs.*` and `${{ env.X }}`; zizmor on `${{ env.X }}`. Limits: act host mode is not the GitHub runner (it proves bash behaviour and substitution, not the runner's argv; argv comes from runner source); the environment-file demo is a port of the runner's parser, not the runner; Git Bash numbers are 5.2.15, the runner has 5.3.15; the ubuntu-26.04 results are from the docker image, not the runner image.

## Exemplar evidence

Corpus SHAs from `shell-audit/scratch/exemplar-shas.md`; counts from check-shell.sh and check-inject.sh run over each exemplar's `.github/workflows`.

- **SH-CI-01 satisfy:** `Homebrew__install@8ab1549dfa11:.github/workflows/actionlint.yml:11-13` and `stale-issues-and-prs.yml:17-19` set `defaults.run.shell: bash -xeuo pipefail {0}`; `PowerShell__PowerShell`, `dahlbyk__posh-git`, `dotnet__install-scripts` have 0 steps without `shell:`; `actions__runner-images@8197087fc536:.github/workflows/ubuntu2404.yml:10-12` sets `defaults.run.shell: pwsh` (13 workflows). **Violate:** `starship__starship@d4d0459c5c24` 55 steps without shell (4 pipelines after discounting step names); `jdx__mise@19e8c8f0d03d` 178 steps, 23 pipelines; `rust-lang__rustup@61271d00a979` 146 steps, 10 pipelines; `k3s-io__k3s@82a6ddcd820b` 77 steps, 9; `acmesh-official__acme.sh@807da6498377` 169 steps, 9; `nvm-sh__nvm@b1b3a0038c06` 58 steps, 7. The default-shell majority is the norm even in expert shell projects; Homebrew is the counter-example.
- **SH-CI-03 violate:** `direnv@28a73d1df3f3:.github/workflows/update-gomod2nix.yml:29` (`HEAD:${{ github.head_ref }}`), `actions__runner-images@8197087fc536:.github/workflows/create_pull_request.yml:19-21` and `merge_pull_request.yml:21-23` (`client_payload.ReleaseBranchName`), `nvm-install-test.yml:29-30`, `fzf release.yml:36`, `k3s release.yml:173,279`, `conda@66d82122dc63:.github/workflows/build.yml:48` (`github.event.label.name` inside a script), `pyenv@d28b75076714:.github/workflows/publish_binary.yml:42`. **Satisfy:** `pyenv publish_binary.yml:27` passes `VERSION: ${{ inputs.version }}` through `env:`. Exemplar scanning aid: `jdx__mise@19e8c8f0d03d:.github/workflows/zizmor.yml:1-17` runs zizmor in CI.
- **SH-CI-15:** `Homebrew__install` runs actionlint with ShellCheck and comments on the path-template trap (`actionlint.yml:86-87`); `k3s-io__k3s@82a6ddcd820b:.github/workflows/actionlint.yaml:19-20` runs actionlint with `shellcheck: false` (contradicts the candidate).
- **SH-CI-05:** the docs' fixed-`EOF` example is itself the violating shape; fleet `setup-ocx@25fa771f8572:.github/workflows/release.yml:30-36`; the pwsh docs example uses a GUID delimiter (satisfies).
- **SH-CI-07 satisfy:** fleet `ocx@5de9d777eb7d:.github/actions/bazel-cache-rc/action.yml:68-76`; `ocx-mirror` copy; 16 composites with 0 missing `shell:`.
- **SH-CI-12/13 satisfy:** `ocx@5de9d777eb7d:taskfiles/rust.taskfile.yml:388-395` (`set -o pipefail;` before `cargo nextest ... | tee`, with a comment on why), `ocx-mirror@71bb1c2953ba:taskfiles/release.taskfile.yml:40,117` (`set -euo pipefail`), `:196-197` (`case` instead of `declare -A`, with the panic named). **Contradict the audit's phrase** "`read -p` breaks": it does not.
- **SH-CI-15 satisfy:** `ocx@5de9d777eb7d:taskfiles/ci.taskfile.yml:17-25` (`SHELLCHECK_OPTS: '--severity=warning'`), `.github/actionlint.yaml`; `www-setup@a251c3631047:.github/workflows/verify.yml:103-109` (actionlint 1.7.12) but then misses `inputs.*`.
- **SH-CI-10:** no `macos-*` leg uses a bash 4+ feature in the fleet (all hits are `ubuntu-latest`); exemplars with macOS legs were not audited for this.

## AI-agent angle

What an LLM characteristically gets wrong in this area, and the smallest check:

- **Interpolates `${{ github.event.* }}` / `${{ inputs.* }}` straight into `run:`** because every tutorial does. Check: the SH-CI-03 greps plus actionlint and zizmor. Also writes `${{ env.X }}` believing it is safe: SH-CI-04 grep.
- **Assumes `run:` has pipefail.** Writes `curl ... | tar -x` or `cmd | grep` with no `shell:` and no `set -o pipefail`. Check: SH-CI-01.
- **Cargo-cults `set -euo pipefail` as line 1 of a `shell: bash` step** (already has `-e -o pipefail`) and then misses that `grep -q` in a pipeline now fails with 141. Check: SH-CI-09 grep.
- **Writes `set -o pipefail` under `shell: sh`** because "it works on my machine" (bash or dash 0.5.12-12). Check: SH-CI-02, `shell: sh` list; dash 0.5.12-6ubuntu5 exits 2.
- **Uses `echo "::set-output name=x::y"` and `::set-env`** from 2020-era training data. `::set-env` is refused, `::set-output` warns. Check: `grep -rn -e '::set-output' -e '::set-env' -e '::add-path' --include='*.yml' .github/workflows`.
- **Writes a fixed `EOF` delimiter for multiline outputs**, or `echo "x=$VAL" >> $GITHUB_OUTPUT` for a value that may contain newlines. Check: SH-CI-05.
- **Uses `>>` for `GITHUB_ENV` under `shell: powershell`** (5.1 writes UTF-16). Check: SH-CI-06 list.
- **Uses `cmd /c` or `/tmp` paths under Git Bash**, expecting POSIX behaviour. Check: SH-CI-11 grep.
- **Puts bash-4 code (`declare -A`, `mapfile`, `${x,,}`) in a macOS job** or a script that runs on the developer's macOS. Check: SH-CI-10.
- **Writes a custom `shell:` with a path (`/bin/bash -e {0}`) or without `{0}`.** Check: SH-CI-16 grep; the runner rejects the missing `{0}`.
- **Adds `shell: bash` to a composite step and forgets it on the next**, or assumes `defaults.run.shell` covers composites. Check: SH-CI-07.
- **Writes Taskfile cmds as if they ran under bash** (`printf -v`, `${PIPESTATUS[@]}`, `BASH_VERSION` guards, `declare -A m; m[x-y]=v`, `shopt -s pipefail`, `set -o pipefail` as its own list item). Check: SH-CI-12/13 greps and the task run.
- **Assumes `uname`, `sed`, `readlink` exist in a Taskfile on Windows.** Check: SH-CI-20 reading heuristic.
- **Sniffs GNU with `--version | grep GNU`** (breaks on uutils in ubuntu-26.04 containers). Check: `grep -rn -e '--version | grep' --include='*.sh' --include='*.yml' .`.
- **Hallucinates flags/shell names**: `shell: dash`, `shell: zsh`, `shell: fish`, `shell: nu` (actionlint: "shell name is invalid"; the runner needs a template with `{0}` for any of them).
- **PowerShell 7-only syntax (`&&`, `||`, ternary, `??`) in a `shell: powershell` step** (5.1). Check: the PS rules family; actionlint does not lint pwsh.

## Contested / evolving

- **Workflow-level `defaults.run.shell: bash` vs per-step `shell: bash` (2026-10).** Homebrew uses a workflow default template; the fleet uses per-step in 90 blocks and a job default in 4 jobs. Trend: default at workflow level, per-step override for pwsh on Windows. Caveat: a workflow default also applies to Windows jobs (Git Bash) and does not reach composite steps.
- **`bash -euo pipefail {0}` (adds nounset) vs plain `bash`.** Homebrew chose `-xeuo`; the runner default omits `-u`. `-u` catches typos and hits unset `GITHUB_*` expansions in rare cases; contested, no data here beyond the act run.
- **actionlint vs zizmor.** actionlint is the lint (syntax, expressions, ShellCheck on `run:`); zizmor is the security auditor (template injection, permissions, pinning). Neither covers `${{ env.X }}`. Trend (as of 2026-10): mise and others run zizmor in CI; fleet runs actionlint only. Owner decision.
- **Env vs action input for untrusted data.** The Security Lab (2021) and secure-use both recommend an action input or an intermediate env var; for inline scripts the env var is preferred ([secure-use](https://github.com/github/docs/blob/main/content/actions/reference/security/secure-use.md)). Stable since 2021.
- **ubuntu-latest 26.04 (2026-10-19 to 2026-11-19).** Whether the runner image's coreutils are uutils is unverified; moves quickly in the next five weeks.
- **mvdan/sh in task: panic fix.** No upstream fix for the unquoted `-` subscript as of task 3.54.0 / mvdan 3.14.1; mvdan fixes such panics quickly (go-task#2429 was fixed within hours on 2025-09-20), so re-run `Taskfile.assoc.yml` on each task bump.
- **ShellCheck SC2337 (grep -q under pipefail)** is in master, not in the 0.11.0 release the runner ships; SC3040 will accept `pipefail` as POSIX.1-2024 in the next release (CHANGELOG "Git"), which will change the `sh`-dialect advice for the 26.04 dash.
- **`::set-output`**: deprecation warning only, behind a server-side flag (`DistributedTask.DeprecateStepOutputCommands`, ActionCommandManager.cs:317); removal date unknown.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/github/docs/blob/main/data/reusables/actions/supported-shells.md | GitHub docs: table of `shell:` values and the command run internally (primary) | read 2026-10-11, docs main be38ec5d78e2 | the per-OS command lines |
| https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/workflow-syntax.md | GitHub docs: workflow syntax, exit codes, 21,000-character `run:` limit, `defaults.run.shell` (primary) | 2026-10-11 | pwsh prepend/append, bash pipefail wording |
| https://github.com/github/docs/blob/main/content/actions/reference/security/secure-use.md | GitHub docs: secure use, script injection, intermediate env var (primary) | 2026-10-11 | the official remediation |
| https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/workflow-commands.md | GitHub docs: workflow commands, env files, multiline delimiter warning (primary) | 2026-10-11 | GITHUB_ENV/PATH/OUTPUT rules, PS 5.1 vs 6 encoding |
| https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/metadata-syntax.md | GitHub docs: action metadata, `runs.steps[*].shell` required (primary) | 2026-10-11 | composite shell requirement |
| https://securitylab.github.com/resources/github-actions-untrusted-input/ | GitHub Security Lab, "Keeping your GitHub Actions and workflows secure Part 2: Untrusted input" | 2021-08-04 | the untrusted-context list, branch-name and email payloads |
| https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/ScriptHandlerHelpers.cs | runner source: default arg formats, pwsh prepend/append (primary) | main 67f01c276e0a, 2026-10-06 | exact `bash`/`sh`/`pwsh` argument strings |
| https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/ScriptHandler.cs | runner source: shell selection, job defaults, composite ScopeName guard, `{0}` check (primary) | 2026-10-06 | defaults.run.shell shares the step path; composites skip defaults |
| https://github.com/actions/runner/blob/main/src/Runner.Worker/FileCommandManager.cs | runner source: GITHUB_ENV/OUTPUT/PATH parsing (primary) | 2026-10-06 | the delimiter rule that makes `EOF` injectable |
| https://github.com/actions/runner/blob/main/src/Runner.Worker/ActionCommandManager.cs | runner source: `::set-env`, `::set-output`, `::add-path` handling (primary) | 2026-10-06 | what is still accepted |
| https://github.com/actions/runner-images/issues/14748 | runner-images announcement: ubuntu-latest to Ubuntu 26.04 | opened 2026-09-17, updated 2026-10-10 | rollout dates and mitigations |
| https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md | runner image README: Ubuntu 26.04 (bash 5.3.9, dash 0.5.12-12ubuntu3, ShellCheck 0.11.0-2) | image 20260927.149.1 | what the new default contains |
| https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md | runner image README: Ubuntu 24.04 (bash 5.2.21, dash 0.5.12-6ubuntu5, ShellCheck 0.9.0-1) | read 2026-10-11 | the before side of the diff |
| https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md | runner image README: macOS 26 (bash 3.2.57, gnu-tar only) | image 20260907.0351.1 | macOS shell facts |
| https://github.com/actions/runner-images/blob/main/images/windows/Windows2025-Readme.md | runner image README: Windows Server 2025 (Git Bash 5.3.15, Git 2.56.0, shells table) | image 20261004.281.1 | `shell: bash` target and version |
| https://github.com/go-task/task/issues/2469 | go-task issue: `pipefail` not applied to `status:` | opened 2025-10-21, open | still reproduces on 3.54.0 |
| https://github.com/go-task/task/issues/2429 | go-task issue: panic with `pipefail` in `shopt:` (mvdan/sh `index out of range [-1]`) | opened 2025-09-20, closed 2026-02-08 | root cause and fix history |
| https://github.com/mvdan/sh/blob/master/CHANGELOG.md | mvdan/sh changelog 3.2.x to 3.14.1 (primary) | 3.14.1 is 2026-09-06 | what the embedded interpreter supports (`read -p` in 3.4.0, pipefail+errexit in 3.7.0) |
| https://github.com/go-task/task/blob/v3.53.1/website/src/latest/docs/guide.md | task docs: `set` and `shopt`, interpreter caveat (primary) | task 3.53.1 | documents `set:`/`shopt:` and the caveat |
| https://github.com/go-task/task/blob/v3.53.1/website/src/latest/docs/reference/schema.md | task docs: `set` options (includes pipefail) and `shopt` options (expand_aliases, globstar, nullglob) (primary) | task 3.53.1 | valid option names |
| https://github.com/go-task/task/blob/v3.54.0/go.mod | task go.mod pinning mvdan.cc/sh/v3 v3.14.1 | 2026-10-01 | interpreter version per task release |
| https://github.com/rhysd/actionlint/blob/main/docs/checks.md | actionlint docs: shellcheck integration, untrusted-input list, shell-name check (primary) | v1.7.12, 2026-03-30 | which shells get ShellCheck, which SC codes are disabled |
| https://github.com/rhysd/actionlint/blob/main/docs/usage.md | actionlint usage: `-shellcheck`, Docker image, pre-installed ShellCheck | v1.7.12 | CI wiring |
| https://docs.zizmor.sh/audits/ | zizmor audit docs: template-injection, remediation (`${VAR}` not `${{ env.VAR }}`) (primary) | zizmor 1.30.1 | covers `inputs.*`, notes the env trap |
| https://docs.zizmor.sh/usage/ | zizmor usage: exit codes, personas, offline mode (primary) | zizmor 1.30.1 | gate wiring |
| https://www.msys2.org/docs/filesystem-paths/ | MSYS2 docs: automatic path conversion, `MSYS2_ARG_CONV_EXCL`, `MSYS2_ENV_CONV_EXCL` (primary) | read 2026-10-11 | Git Bash argument rewriting |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_preference_variables | PowerShell docs: `$PSNativeCommandUseErrorActionPreference` (primary, source: MicrosoftDocs/PowerShell-Docs reference/7.4) | PowerShell 7.4 | the native-failure switch |
| https://github.com/koalaman/shellcheck/blob/master/CHANGELOG.md | ShellCheck changelog: 0.10.0, 0.11.0, unreleased SC2337, SC3040 (primary) | 0.11.0 is 2025-08-03 | version-specific checks |
| https://github.com/koalaman/shellcheck/wiki/SC2086 | ShellCheck wiki: SC2086 quoting (primary; local clone koalaman__shellcheck.wiki@0b4dfe7bf9dc) | 2026-10-10 | the check actionlint reports most |
| https://github.com/nektos/act/releases/tag/v0.2.89 | act 0.2.89: local runner used for host-mode runs | 2026-06-01 | the emulator, with its limits |
| https://github.com/Homebrew/install/blob/8ab1549dfa1189fd4d818a2116592d8f0ee06d8c/.github/workflows/actionlint.yml | exemplar: `defaults.run.shell: bash -xeuo pipefail {0}` and the path-template comment | 8ab1549dfa11 | an expert project's convention |
