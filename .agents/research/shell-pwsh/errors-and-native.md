---
title: "PowerShell error model and native commands (5.1 and 7.x): native exit codes, stderr, iex delivery, argument passing, streams"
topic: shell-pwsh / errors-and-native (wave 2, W2-9; rows M-Q-01..M-Q-06, M-R-01, M-R-02, M-R-04, M-H-03; rule families PS-ERR and PS-NATIVE)
agent: W2-9 pwsh/errors-and-native
model: sonnet
date_researched: 2026-10-11
sources_count: 24
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/errors-and-native/
scope: |
  Covers how a failing native command (exe) is or is not seen as a failure by a PowerShell script on Windows PowerShell 5.1.26100.9444, PowerShell 7.4.7 and 7.6.6 (Linux, and on the Windows host via portable zips), the exit code a caller sees, the GitHub Actions pwsh wrapper, `exit` under `irm | iex`, native argument passing, `curl`/alias traps, try/catch and `$?`, and which output stream carries what.
  Does not cover: invoking pwsh from sh or sh from pwsh (M-R-03), PS 5.1/7 syntax compatibility and encoding (compat.md), module/Pester testing, PSScriptAnalyzer profile design (only which of its rules do and do not catch these defects). macOS and BSD are not touched (no macOS host); nothing here is "unverified: read only" except where marked.
---

# PowerShell error model and native commands

Research date 2026-10-11. Engines measured: Windows PowerShell **5.1.26100.9444** (Windows 11 host), PowerShell **7.4.7** (docker `mcr.microsoft.com/powershell:lts-7.4-ubuntu-22.04`), **7.6.6** (ocx toolchain, WSL Fedora), and, new in this round, **7.4.7 and 7.6.6 on the Windows host** from the official portable zips unpacked under `C:\Users\ecom\shell-wintest\pwsh-<ver>\` (a scratch staging dir; nothing installed). Wave 1 had only 5.1 on Windows ([plat] §4), so the Windows-7.x column is new evidence. Every fixture path below is relative to the fixture directory above.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [A mid-script native failure is invisible under `$ErrorActionPreference = 'Stop'` (M-Q-01)](#f1)
   2. [`$PSNativeCommandUseErrorActionPreference`: what it does, where it does nothing (M-Q-01, M-H-03)](#f2)
   3. [The one native-call idiom that fails correctly on 5.1 and 7.x (M-Q-01)](#f3)
   4. [Native stderr with `2>&1` / `2>$null` under Stop (M-Q-02)](#f4)
   5. [Which exit code the caller sees (M-Q-05)](#f5)
   6. [The GHA pwsh wrapper: "the last native command wins" (M-H-03)](#f6)
   7. [Fleet chase: pwsh `run:` blocks and `.ps1` files](#f7)
   8. [`exit` inside `irm | iex` (M-Q-03)](#f8)
   9. [Native argument passing: Legacy, Standard, Windows (M-R-01, M-R-04)](#f9)
   10. [`curl`, `wget`, `sort` and other aliases (M-R-02)](#f10)
   11. [try/catch/finally, terminating errors, `$?` (M-Q-04)](#f11)
   12. [Output streams and stray output (M-Q-06)](#f12)
   13. [What PSScriptAnalyzer does and does not catch](#f13)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **`$ErrorActionPreference = 'Stop'` never stops on a native exit code.** A mid-script `cmd /c exit 3` / `sh -c 'exit 3'` falls through to the next statement on 5.1, 7.4.7 and 7.6.6, on Linux and on Windows (fixture `native-mid.ps1`: "reached", exit 0, 5 of 5 engine rows).
- **`$PSNativeCommandUseErrorActionPreference = $true` fixes 7.4+ and silently does nothing on 5.1.** On 5.1 the assignment just creates an ordinary variable; the same script prints "reached" and exits 0 (`native-mid-pref.ps1`). It was experimental in 7.3 (`PSNativeCommandErrorActionPreference`) and mainstream in 7.4 ([What's new 7.3][wn73], [7.4][wn74]), so "7.3+" in the map is wrong: **7.4+**.
- **With the preference on, `if (native) {...}` and `native | Out-Null` throw** under Stop (`NativeCommandExitException`); you can no longer branch on a native exit code without first setting the variable to `$false` in a child scope (7.4.7 and 7.6.6, Linux and Windows).
- **The portable idiom is an explicit check, fail-closed:** `$global:LASTEXITCODE = $null; & $exe @argv; if ($LASTEXITCODE -ne 0) { throw ... }`. It exits non-zero on all five engine rows (`native-mid-fn.ps1`, `native-idiom.ps1`), including "command not found" and a stale `0`.
- **GHA `shell: pwsh` is "last native command wins".** The runner prepends `$ErrorActionPreference = 'stop'` and appends `if (Test-Path variable:\LASTEXITCODE) { exit $LASTEXITCODE }`; a failed `build` followed by a successful `test` gives step exit 0 on all engines (`gha-sim.ps1`), while a failed `build` followed only by cmdlets gives exit 1 by accident.
- **The caller never sees the real code through `-Command` or the GHA wrapper:** both collapse any non-zero to 1 (`exit 7` becomes 1); `-File` preserves it (7) but returns **0** when the script merely ends after a failed native command (`exitcodes.ps1`).
- **`exit` inside an `irm | iex` script kills the host process on 5.1, 7.4.7 and 7.6.6** (Linux and Windows); `return` at script scope, `throw`, and Scoop's `$Global:LASTEXITCODE = n; break` leave the host alive (`iex-exit.ps1`, `ws-repro.ps1`). Detect delivery with `$null -eq $MyInvocation.MyCommand.Path` at script scope ([Scoop][scoop] :743).
- **On 5.1, redirecting native stderr under Stop throws.** `2>&1`, `2>$null`, `*>$null` all raise `RemoteException` the moment the native writes a byte to stderr; 7.2+ does not ([diff][diff]). Wrap the call in a scoped `$ErrorActionPreference = 'Continue'` or do not redirect (`stderr-red.ps1` exit 1 on 5.1 only).
- **After a thrown `RemoteException` on 5.1, `$LASTEXITCODE` is `-1` (or `0`)**, not the program's code (`cases.ps1`); never read it in the `catch`.
- **Native argument passing differs by engine, not by OS:** 5.1 (and 7.x `Legacy`) drops empty strings, strips embedded `"` and mangles a trailing backslash before the closing quote; 7.3+ `Standard`/`Windows` pass `[a][][b]`, `[say "hi"]` intact. `.cmd`/`.bat` (and cmd.exe, find.exe...) keep Legacy parsing in `Windows` mode (`args.ps1`, 5 engine rows).
- **`Start-Process -ArgumentList @('has space')` splits on spaces on every engine, 7.6.6 included, and 5.1 rejects an empty element** (`args-startprocess.ps1`). Use `& $exe @argv` for argv fidelity.
- **Bare `curl` is `Invoke-WebRequest` on 5.1** (`curl -fsSL ...` dies with "parameter name 'fsSL'"); on 7.4.7/7.6.6 (Windows) it resolves to `C:\Windows\system32\curl.exe`. Write `curl.exe` ([deno_install][deno] :26, :46 does).
- **Only `Write-Error` and `[Console]::Error` reach stderr.** `Write-Host`, `Write-Warning`, `Write-Verbose -Verbose` and `Write-Information -InformationAction Continue` all land on **stdout** of a `-File` process (3 engines + Windows 7.6.6, `streams.ps1`); diagnostics belong on `[Console]::Error.WriteLine` as `www-setup/src/install.ps1` does.
- **A function returns everything it emits:** `ArrayList.Add`, `HashSet.Add`, an un-nulled `New-Item` all leak into the return value (`stray.ps1`); `[void]`/`$null =` them.
- **PSScriptAnalyzer 1.25.0 has no rule for any of this.** `native-mid.ps1` yields 0 findings; `Invoke-Expression`, `Write-Host`, empty `catch` and alias use are the only adjacent rules (`run-checks.out` P1/A2/H1). The checks are greps and one workflow lint (`pwsh-run-lint.py`).
- **Fleet exposure is small but real:** of 39 pwsh-executed `run:` blocks in 28 repos (13 explicit + 26 default-shell on Windows legs) exactly **1** has two or more native calls and no guard (`ocx/.github/workflows/shell-activation-deep.yml:158-169`); no fleet `.ps1` sets `$PSNativeCommandUseErrorActionPreference`; `www-setup/src/install.ps1` checks `$LASTEXITCODE` at :485, :517, :638.

## Findings

<a id="f1"></a>
### 1. A mid-script native failure is invisible under Stop (M-Q-01)

Fixture `native-mid.ps1` (plant (a)): `$ErrorActionPreference = 'Stop'`, then `cmd /c exit 3` (Windows) or `sh -c "exit 3"` (Linux), then `Write-Output 'reached'`. Run by `native-mid-all.sh` (`matrix.sh pwsh` plus `winrun.sh` for the Windows 7.x zips):

```
native-mid        pwsh 7.4 LTS (7.4.7, docker)                  reached  exit=0
native-mid        pwsh 7.6.6 (Linux)                            reached  exit=0
native-mid        Windows PowerShell 5.1                        reached  exit=0
native-mid        pwsh 7.4.7 (Windows host, portable zip)       reached  exit=0
native-mid        pwsh 7.6.6 (Windows host, portable zip)       reached  exit=0
```

Why: `$ErrorActionPreference` governs PowerShell error records; a native exit code only sets `$LASTEXITCODE` and `$?` ([about_Automatic_Variables 7.6][av76]: "For native commands (executables), `$?` is set to True when `$LASTEXITCODE` is 0, and set to False when ... any other value"). Nothing turns that into an error unless the preference variable in finding 2 is set and the engine knows it.

Incorrect (red, exit 0, "reached"):

```powershell
$ErrorActionPreference = 'Stop'
tar xf $archive -C $dest        # exit 2 is ignored
Write-Output 'extracted'
```

Correct on all three engines (green, exit 3 and no "reached"; `native-mid-check.ps1`):

```powershell
$ErrorActionPreference = 'Stop'
tar xf $archive -C $dest
if ($LASTEXITCODE -ne 0) { [Console]::Error.WriteLine("tar failed: $LASTEXITCODE"); exit $LASTEXITCODE }
```

Note the twin uses `[Console]::Error.WriteLine`, not `Write-Error`: under Stop, `Write-Error` is itself terminating (finding 11), so the following `exit $LASTEXITCODE` never runs and the process exits 1, not 3 (first draft of the twin, measured).

<a id="f2"></a>
### 2. `$PSNativeCommandUseErrorActionPreference`: what it does, where it does nothing (M-Q-01, M-H-03)

Documentation: "When `$PSNativeCommandUseErrorActionPreference` is `$true`, native commands with non-zero exit codes issue errors according to `$ErrorActionPreference`" ([about_Preference_Variables 7.6][pv76], default `$false` in its table). History: introduced as experimental feature `PSNativeCommandErrorActionPreference` in 7.3 ([What's New 7.3][wn73]), mainstream in 7.4 ([What's New 7.4][wn74]). The variable does not exist on 5.1 (the 5.1 page of [about_Preference_Variables][pv51] lists no `$PSNative*` variable; `Test-Path variable:PSNativeCommandUseErrorActionPreference` is `False` there, `True` on 7.4.7 and 7.6.6; first line of every `native-mid*.ps1` run).

Measured (`cases.ps1`, `native-mid-pref.ps1`; Linux 7.4.7/7.6.6 and Windows 7.4.7/7.6.6 agree, only the message differs: "ended with non-zero exit code: 3." on 7.4.7, "...: 3 (0x03)." on 7.6.6):

| Case (EAP, preference) | 5.1 | 7.4.7 / 7.6.6 |
|---|---|---|
| Stop, `$false`: `NFail` | completed, `LASTEXITCODE=3` | completed, `LASTEXITCODE=3` |
| Stop, `$true`: `NFail` | **completed** (var is inert) | **THREW `NativeCommandExitException`** |
| Stop, `$true`: `NErrFail 2>&1 \| Out-Null` | THREW `RemoteException` (stderr, not the exit code) | THREW `NativeCommandExitException` |
| Continue, `$true`: `NFail; 'after'` | completed (`after`) | non-terminating error printed, `after` runs |
| Stop, `$true`: `if (NFail) {'then'} else {'else'}` | `else` | **THREW** (cannot branch on the code) |
| Stop, `$true`: `NFail \| Out-Null; 'after-pipe'` | `after-pipe` | **THREW** |
| catch details | n/a | `$_.Exception.ExitCode` = 3, type `System.Management.Automation.NativeCommandExitException` |

Consequences:

- It needs Stop (or a `try`) to be terminating. With the default Continue it only writes a non-terminating error, so a `pwsh -File` script without `$ErrorActionPreference = 'Stop'` still exits 0 (`gha-sim.ps1`, "custom -File {0}" column, row "pref=true": exit 0). The GHA wrapper prepends Stop, so there it works (step exit 1).
- For tools whose non-zero code is information (robocopy), scope it off in a child scope; the docs show exactly this ([pv76]): `& { $PSNativeCommandUseErrorActionPreference = $false; robocopy ...; if ($LASTEXITCODE -gt 8) { throw ... } }`. Measured: the scoped `$false` keeps `LASTEXITCODE=3` and does not throw on all three engines (`cases2.ps1`, line "scoped-off").
- Official tests pin the matrix per EAP value ([NativeCommandErrorHandling.Tests.ps1][nceh]:34-86: Stop terminates, Continue and SilentlyContinue emit a non-terminating error, Ignore emits none).
- Adopters use it in 7-only scripts: [mise lint-fix.ps1][mise]:3-4, [oh-my-posh build.ps1][omp]:71-72, [dotnet Get-GitHubAppToken.ps1][dotnet-gh]:43-44, which also does the scoped-off dance for `az` at :75-79 because "Azure CLI can emit non-fatal Python warnings to stderr even when signing succeeds".

Decision (map: "whether 7.x scripts must set it"): **No, not MUST.** It is a 7.4+ convenience that (a) is invisible on 5.1, (b) breaks `if (native)` branching, (c) needs Stop. It is a SHOULD for `shell: pwsh` CI blocks and 7-only tools, never a substitute for the explicit check in anything that can run on 5.1 (installers, `shell: powershell`).

<a id="f3"></a>
### 3. The one native-call idiom that fails correctly on 5.1 and 7.x (M-Q-01)

```powershell
$ErrorActionPreference = 'Stop'
function Invoke-Native {
    param([Parameter(Mandatory)][string]$FilePath,
          [Parameter(ValueFromRemainingArguments)][string[]]$ArgumentList)
    $global:LASTEXITCODE = $null          # a native that never started must not look like success
    & $FilePath @ArgumentList             # no 2>&1 here: see finding 4
    if ($LASTEXITCODE -ne 0) { throw "$FilePath exited with code $LASTEXITCODE" }   # $null -ne 0 is $true
}
Invoke-Native tar xf $archive -C $dest
```

`native-idiom.ps1`, all five engine rows (5.1.26100.9444, 7.4.7 and 7.6.6 on Linux, 7.4.7 and 7.6.6 on Windows):

```
exit 0                          => completed
exit 3                          => THREW RuntimeException: sh exited with code 3        (cmd on Windows)
stderr + exit 0 (no redirect)   => completed
stderr + exit 3 (no redirect)   => THREW RuntimeException: sh exited with code 3
native not found                => THREW CommandNotFoundException
native not found, EAP=Continue  => THREW CommandNotFoundException
stale 0 then not-found, Continue=> THREW CommandNotFoundException
```

Why each line exists:

- `$global:LASTEXITCODE = $null` first: `$LASTEXITCODE` "isn't changed unless ... the script calls a native command" ([about_Automatic_Variables][av76] `$LASTEXITCODE`), and a failing *cmdlet* does not reset it (`cases2.ps1`: after `cmd /c exit 5` then a failed `Get-Item`, `LASTEXITCODE=5` persists on 3 engines). PowerShell's own build script documents the same hazard: "if $ScriptBlock doesn't have a native invocation, $LASTEXITCODE will point to the obsolete value" ([startNativeExecution.ps1][sne]:24-25). With the reset, a stale `0` cannot mask a command that never ran; `$null -ne 0` is true, so the helper fails closed.
- It throws instead of `exit`: a helper may run inside an `irm | iex` script (finding 8). The top level decides the process exit code.
- It preserves nothing about the real code on the way out of `-Command`/GHA (finding 5). Scripts that must return the program's code use the inline form `exit $LASTEXITCODE` and run via `-File`.
- Prior art: PowerShell's own `Start-NativeExecution` ([startNativeExecution.ps1][sne]:7-52) is the same shape (save EAP, set Continue, run, `if ($LASTEXITCODE -ne 0) { throw }`, restore in `finally`); it sets Continue because it optionally captures `2>&1`.

Rejected alternatives: `if (-not $?)` after the native (works on all three engines, `cases2.ps1` inline `$?` = False after exit 3, but the next statement resets it and the code is lost); `-ErrorAction Stop` on a native (the parameter binds to the program's argv, not to PowerShell).

<a id="f4"></a>
### 4. Native stderr with `2>&1` / `2>$null` under Stop (M-Q-02)

Docs ([about_Redirection][redir] covers the native byte-stream side): from 7.2, "error records redirected from native commands, like when using redirection operators (`2>&1`), aren't written to the `$Error` variable and the preference variable `$ErrorActionPreference` doesn't affect the redirected output" ([pv76] near the `$ErrorActionPreference` section; [diff][diff] "Make `$ErrorActionPreference` not affect `stderr` output of native commands"). 5.1 is the other half.

`cases.ps1` and `cases3.ps1`, EAP = Stop, native writes `err` to stderr:

| Form | 5.1.26100.9444 | 7.4.7 / 7.6.6 (Linux and Windows) |
|---|---|---|
| `NErr` (no redirect) | completed (stderr goes to the console) | completed |
| `NErr 2>&1` | **THREW `RemoteException`** | completed |
| `$x = NErr 2>&1` | **THREW** | completed |
| `NErrFail 2>$null` | **THREW** | completed, `LASTEXITCODE=3` |
| `NErrFail *>$null` | **THREW** | completed |
| scoped `$ErrorActionPreference='Continue'` around `$x = NErr 2>&1` | completed | completed |
| redirect inside the child shell (`cmd /c "... 2>&1"`) | completed | completed |

Red/green pair run on the engines (`stderr-red.ps1`, `stderr-twin.ps1`): red exits **1 on 5.1** ("RemoteException") and 0 on both 7.x; the twin (scoped Continue around the redirect, then the exit-code check) exits 0 on all.

```powershell
# incorrect on 5.1 under Stop (also 2>$null):
$list = & tar -tf $archive 2>&1

# correct on 5.1 and 7.x:
$prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
try { $list = & tar -tf $archive 2>&1 } finally { $ErrorActionPreference = $prev }
if ($LASTEXITCODE -ne 0) { throw 'tar failed' }
```

Also measured: when the exception is thrown, `$LASTEXITCODE` is `-1` (NErrFail) or the stale value (`cases.ps1`); the `catch` cannot rely on it. The 5.1 hazard is real in fleet code (finding 7: `www-setup/src/install.ps1:516`, reproduced in `ws-tar-5x.ps1`: on 5.1 the intended `failed to extract - ensure tar is installed` message is replaced by the `RemoteException` text of `tar.exe: Error opening archive...`; on 7.x and Windows 7.6.6 the intended message appears) and in exemplars ([dotnet-install.ps1][dotnet-inst]:135 sets Stop and :973 runs `& tar ... 2>&1`).

<a id="f5"></a>
### 5. Which exit code the caller sees (M-Q-05)

`exitcodes.ps1` spawns the same engine as a child in three modes and records the process exit code. Identical on 5.1, 7.4.7, 7.6.6 (Linux) and 7.6.6 on Windows:

```
child                      -File     . (GHA)   & call
native-fail-LAST           0         0         0       <- script ends after a failed native: 0 everywhere
native-fail-then-ok        0         0         0
native-fail-then-echo      0         0         0
exit7                      7         1         1       <- -Command collapses 7 to 1
throw                      1         1         1
EAPstop+native-fail-mid    0         0         0
check+exit-LASTEXITCODE    3         1         1       <- -File keeps 3, -Command gives 1
check+throw                1         1         1
```

This is the documented contract: `-File`: "When the script file terminates with an `exit` command, the process exit code is set to the numeric argument"; normal termination is 0 ([about_PowerShell_exe 5.1][pse51]:102-110; [about_Pwsh 7.6][pwsh76]:112-120). `-Command`: "The exit code is 0 when `$?` is `$true` or 1 when `$?` is `$false`. If the last command is an external program or a PowerShell script that explicitly sets an exit code other than 0 or 1, that exit code is converted to 1 ... To preserve the specific exit code, add `exit $LASTEXITCODE`" ([pse51]:180-190; [pwsh76]:196-206). The $LASTEXITCODE table in [about_Automatic_Variables][av76] says the same for `pwsh -File` (1 on exception, `exit` value, else 0).

Consequence: a `.ps1` run by `-File` whose last statement is a failing native command **exits 0**. Every script needs an explicit terminal `exit` path (finding 3 plus a top-level `try/catch` that exits 1).

<a id="f6"></a>
### 6. The GHA pwsh wrapper: "the last native command wins" (M-H-03)

Source of truth: `actions/runner` [`ScriptHandlerHelpers.cs`][runner]:16-17 (`["pwsh"] = "-command \". '{0}'\""`, same for `powershell`) and :62-65 (`prepend = "$ErrorActionPreference = 'stop'"`, `append = @"if ((Test-Path -LiteralPath variable:\LASTEXITCODE)) { exit $LASTEXITCODE }"`), and the docs "Exit codes and error action preference" ([workflow-syntax][gha]): "Users can always opt out by not using the built-in shell, and providing a custom shell option like: `pwsh -File {0}`".

`gha-sim.ps1` (plant (b)) builds exactly that file and runs `<engine> -command ". '<file>'"`; the step result is the process exit code. Same on 5.1, 7.4.7, 7.6.6 (Linux) and 7.6.6 (Windows):

```
step body                          GHA wrapper    custom -File {0}
RED  build(fail) then test(ok)     step-exit=0    step-exit=0      <- failure invisible
RED  build(fail) then echo         step-exit=1    step-exit=0      <- caught only because $LASTEXITCODE is stale 3 at the epilogue
TWIN check after each native       step-exit=1    step-exit=3
TWIN pref=true (7.4+ only)         step-exit=1    step-exit=0      <- 5.1 row: step-exit=0 in both columns
TWIN Invoke-Native wrapper         step-exit=1    step-exit=1
```

Reading: (1) the epilogue only sees the *last* native status, so the invisible case is "a failing native followed by any succeeding native"; (2) a failing native followed only by cmdlets fails the step, by accident, with a stale code; and stale-code accident also fails a *successful* step when an earlier native returned non-zero by design (robocopy 1); (3) opting out with `shell: pwsh -File {0}` removes both prelude and epilogue, so the script must set Stop and exit itself (column 3 shows exit 0 even for a failing last native); (4) the step conclusion is boolean, so exact codes do not matter for GHA, but they do for `-File` callers.

Platform-matrix measured the same on 7.6.6 and 5.1 earlier ([plat] §2.3); this run adds 7.4.7, the Windows 7.x zips, and the realistic two-native bodies.

<a id="f7"></a>
### 7. Fleet chase: pwsh `run:` blocks and `.ps1` files

Command: `fleet-chase2.py` (PyYAML over the 28 fleet repos of [fleet] §GitHub workflows; same exclusions; output in `fleet-chase.out`). A block is "pwsh-executed" when `shell: pwsh|powershell` is explicit, or the default shell on a job whose `runs-on` or matrix contains `windows`.

- **39 blocks**: 13 explicit (11 pwsh + 2 powershell, matching [fleet] #11) and 26 default-shell on Windows-capable jobs. 25 of the 26 are single-line invocations (`npm ci`, `cargo build`, `task test:pester`) that mean the same in pwsh; the 26th, `rules_ocx` `bcr-parity` #4 (4 lines, `curl ... arch -x86_64`), is a POSIX body gated to the macOS rosetta leg by `if: matrix.target.rosetta`.
- **Blocks with two or more native lines and no guard**: `pwsh-run-lint.py` reports exactly **one**, `ocx/.github/workflows/shell-activation-deep.yml` job `windows`, step "env.ps1 gate - PowerShell 7 (ocx-installed Core)" (:158-169): `& $ocx --remote package env powershell/powershell --shell=powershell | Out-String | Invoke-Expression` then `& $pwshCmd -NoProfile -File ...`. If the first (ocx) fails, `Invoke-Expression` receives an empty string, `Get-Command pwsh` silently resolves the runner's built-in pwsh, and the last native decides the step: the "install pwsh via ocx" dogfood path would go green untested (reasoned from `gha-sim.ps1` row 1; not reproduced on a runner). The same file's `ocx/.tmp/*` and `ocx-mirror/external/ocx/` copies are worktree/mirror duplicates.
- **No fleet `.ps1` sets `$PSNativeCommandUseErrorActionPreference`** (0 hits in `www-setup/src`, `setup-grimoire/.github`, `grimoire/docs/public`, `ocx/test/manual`). `www-setup/src/install.ps1` does the right thing by hand: `if ($LASTEXITCODE -ne 0) { throw ... }` at :485, :517 and `Err "... failed" 6` at :638.
- **Defect (fleet, reported not fixed): `www-setup/src/install.ps1:182` and `:734`** (`exit $Code` in `Err`, `exit 2` in `Main`) under the documented `irm https://setup.ocx.sh/pwsh | iex` (:22). Reproducer `ws-repro.ps1` (runs a copy with `OCX_INSTALL_DIST_URL=http://203.0.113.1/dist.json`, which trips `Assert-HttpsUrl` before any request; host emulated with `-NoExit` plus stdin): `host-survived=False proc-exit=3` on 5.1.26100.9444, 7.4.7 and 7.6.6 (Linux). Fix shape: finding 8.
- **Hazard (fleet): `www-setup/src/install.ps1:516`** `& tar xf ... 2>$null` under Stop, not in a `try`; also :484, :496 (inside `try`), :654/:675/:909 (`& chmod +x ... 2>$null` in `try`, Windows-unreachable). On 5.1 a tar that writes to stderr throws `RemoteException` (reproduced with a missing archive in `ws-tar-5x.ps1`) instead of reaching the `$LASTEXITCODE` branch: still a failure, wrong diagnostic. Severity low.
- **Stream conformance is good:** `www-setup/src/install.ps1` routes `Say`/`Warn`/`Err` through `[Console]::Error.WriteLine` (:168-182) and uses `Write-Output` only for the `OCX_INSTALL_PRINT_PATH` result (:814, :844, :944); 0 `Write-Host`. `ocx/test/manual/test-windows-activation.ps1` has 25 `Write-Host` (test output, acceptable). `setup-grimoire/.github/scripts/install.ps1` uses `Write-Host "::error::..."` which must reach stdout for the runner to parse it.

<a id="f8"></a>
### 8. `exit` inside `irm | iex` (M-Q-03)

Plant (c) `iex-exit.ps1`. Host = same engine with `-NoExit -Command "<iex line>"` and the "next typed line" on stdin (`'HOST-ALIVE LASTEXITCODE=' + $global:LASTEXITCODE`, then `exit 0`), which reproduces an interactive session (a multi-statement `-Command` string would misreport `break`/`throw` as host death, first draft of the fixture). Result is identical for `Get-Content -Raw f | iex` and `& ([scriptblock]::Create((Get-Content -Raw f)))` on 5.1, 7.4.7, 7.6.6 (Linux) and 7.6.6 (Windows):

```
RED  exit 5                 HOST-KILLED    proc-exit=5   [-]
RED  exit inside function   HOST-KILLED    proc-exit=5   [-]
TWIN return (top level)     host-survived  proc-exit=0   [HOST-ALIVE LASTEXITCODE=5]
TWIN scoop break in fn      host-survived  proc-exit=0   [HOST-ALIVE LASTEXITCODE=5]
TWIN throw                  host-survived  proc-exit=0   [HOST-ALIVE LASTEXITCODE=]
TWIN iex-aware (flag)       host-survived  proc-exit=0   [HOST-ALIVE LASTEXITCODE=5]
TWIN iex-aware (flag)  -File proc-exit=5   (real exit when the same file is run as a file)
```

Incorrect:

```powershell
function Err { param($m, $c = 1) [Console]::Error.WriteLine($m); exit $c }   # kills the caller's shell under irm | iex
```

Correct (Scoop's shape, [install.ps1][scoop]:91-102 and :743; measured as "iex-aware (flag)"):

```powershell
$IsIex = ($null -eq $MyInvocation.MyCommand.Path)          # script scope, before any function; $null when delivered by iex
function Exit-Install { param([int]$Code = 1)
    if ($IsIex) { $Global:LASTEXITCODE = $Code; break } else { exit $Code }
}
```

Notes: (1) the flag must be computed at script scope; inside a function `$MyInvocation.MyCommand` is the function, so `.Path` is always `$null` (first draft of the twin, measured: it always took the `break` branch). (2) Scoop additionally always `exit`s when `$env:CI` is set ([scoop]:96) because in CI the host is disposable and the step needs a real code. (3) `return` at script scope works for the main path; `break` is needed from nested functions. (4) `throw` leaves the host alive but sets no `LASTEXITCODE` and prints a stack trace; acceptable for programming errors, not for contract exits. (5) `exit` inside `try { } finally { }` still runs the `finally` and keeps the code (`trycatch.ps1`, 3 engines: `exit=5 out=[FINALLY-RAN]`).

<a id="f9"></a>
### 9. Native argument passing (M-R-01, M-R-04)

Docs: 7.3 changed native parsing; `$PSNativeCommandArgumentPassing` is `Windows` on Windows, `Standard` elsewhere (default), `Legacy` is the historic mode; in `Windows` mode PowerShell uses Legacy for `cmd.exe`, `cscript.exe`, `find.exe`, `sqlcmd.exe`, `wscript.exe` and `.bat .cmd .js .vbs .wsf` ([pv76] `$PSNativeCommandArgumentPassing`; [about_Parsing][parsing]:343-362). It is mainstream since 7.3 ([wn73]:121). 5.1 has no variable and behaves as Legacy.

`args.ps1` (plant (d)) prints what a native argv printer receives (`argv.sh` on Linux, a csc-compiled `argv.exe` on Windows that prints `Environment.CommandLine` and each parsed arg). 5.1 and the three 7.x column groups, identical on Linux and Windows for 7.x:

| Case | Legacy (5.1; 7.x set to Legacy) | Standard and Windows (7.3+) |
|---|---|---|
| `Show 'a' '' 'b'` | `argc=2 [a] [b]` (empty dropped) | `argc=3 [a] [] [b]` |
| `Show 'has space'` | `argc=1` | `argc=1` |
| `Show 'say "hi"'` | `argc=1 [say hi]` (quotes stripped) | `argc=1 [say "hi"]` |
| `Show 'say "hi there"'` | `argc=2 [say hi] [there]` | `argc=1 [say "hi there"]` |
| `Show 'C:\dir with space\'` | 5.1: `[C:\dir with space"]` (trailing quote corrupted); 7.x Legacy: intact | intact |
| `Show @('x','','y')` (splat) | `argc=2 [x] [y]` | `argc=3 [x] [] [y]` |
| `.cmd` printer (`say "hi"`, `two words`, empty) | `["say "hi""] ["two words"] []` | Standard: `["say \"hi\""] ["two words"] [""]`; **Windows mode: same as Legacy** (Windows 7.4.7 and 7.6.6) |

Guidance that follows:

- Build argv as an array and splat: `$argv = @('xf', $archive, '-C', $dest); & tar @argv`. A single string `'-a -b'` is always one argument (`one-string-2-args`: `argc=1 [-a -b]` on every mode), so string-built command lines are wrong everywhere.
- 5.1-bound scripts must not rely on empty strings, embedded `"` or trailing `\` reaching a native. When unavoidable, guard by mode (`args-workaround.ps1`, all engines): `ConvertTo-NativeArg` returns `'""'` for `''` and doubles backslashes before each `"` and escapes it only when `-not (Test-Path variable:PSNativeCommandArgumentPassing) -or $PSNativeCommandArgumentPassing -eq 'Legacy'`; applied unconditionally it is **wrong on 7** (`[""]` and `[say \"hi\"]` arrive literally). `--flag=value` does not help (`--msg=say "hi"` still loses the quotes on 5.1). Prefer designs that avoid the case: environment variables, stdin, or a file.
- Untrusted input never goes to a `.bat`/`.cmd` ([pv76] warning: "the arguments are passed as raw command-line strings to `cmd.exe`").
- `Start-Process -ArgumentList` is not a substitute (`args-startprocess.ps1`): `@('has space')` arrives as `[has] [space]` on 5.1, 7.4.7 and 7.6.6 (Linux and Windows), `@('a','','b')` becomes `[a] [b]` (5.1 refuses the empty element outright: "Cannot validate argument on parameter 'ArgumentList'. The argument is null or empty"); only a pre-quoted element (`'"has space"'`) survives. Use it only for `-Wait`/`-Verb RunAs`/redirect-to-file needs and pre-quote elements.
- `Invoke-Expression "tar xf $archive"` rebuilds a command line from a string and is both an injection vector and a quoting bug ([PSAvoidUsingInvokeExpression][pssa-iex], default-on Warning).

<a id="f10"></a>
### 10. `curl`, `wget`, `sort` and other aliases (M-R-02)

`aliases.ps1` (`Get-Command <name>`):

| Name | 5.1.26100.9444 (Windows) | 7.4.7 / 7.6.6 on Windows | 7.x on Linux |
|---|---|---|---|
| `curl` | Alias => `Invoke-WebRequest` | Application `C:\Windows\system32\curl.exe` | Application (if installed) |
| `wget` | Alias => `Invoke-WebRequest` | not found | Application (if installed) |
| `sort` | Alias => `Sort-Object` | Alias => `Sort-Object` | Application |
| `diff` | Alias => `Compare-Object` | Alias => `Compare-Object` | Application |
| `cat`, `sleep` | Aliases (`Get-Content`, `Start-Sleep`) | Aliases | Application |
| `find` | Application `find.exe` (Windows text search, not Unix find) | same | Application |
| `tar` | Application `tar.exe` | same | Application |

A typical call `curl -fsSL http://127.0.0.1:9/x -o f` on 5.1 throws `ParameterBindingException: A parameter cannot be found that matches parameter name 'fsSL'`; on 7.x Windows it reaches curl.exe (`curl: (7) Failed to connect`). The 2016 request to drop the aliases was refused because it "would only affect Windows PowerShell" and was a breaking change ([PowerShell#1901][ps1901]); the removal in PowerShell 6+ on Windows is **measured here, not source-confirmed** (no changelog line found in `CHANGELOG/6.0.md`). `curl.exe` ships in `C:\Windows\System32` on the 26100 host; Windows 10 1803+ (not verified here).

Rule consequences: in any `.ps1` or `shell: powershell`/`pwsh` block that can run on 5.1 write `curl.exe`, never `curl`/`wget`; the same for `sort.exe`, `diff.exe` when the intent is the Unix-style exe. Exemplar: [deno_install install.ps1][deno]:26 and :46 call `curl.exe --ssl-revoke-best-effort`, :48 `tar.exe`. PSScriptAnalyzer will not flag it from a Linux pwsh (no alias there): probe `curl -fsSL ... | iex` produced `PSAvoidUsingCmdletAliases` for `iex` only (`run-checks.out`, scratch `pssa.ps1`).

<a id="f11"></a>
### 11. try/catch/finally, terminating errors, `$?` (M-Q-04)

Docs: `try/catch/finally` handles terminating errors, "statement-terminating" (stops the statement, script continues) and "script-terminating" ([about_Try_Catch_Finally 7.6][tcf]:18-37). `trycatch.ps1` (identical on 5.1, 7.4.7, 7.6.6):

| Case | Result |
|---|---|
| non-terminating `Get-Item /nope` in `try`, EAP Continue | **not caught**, continues |
| `Get-Item /nope -ErrorAction Stop` | caught (`ItemNotFoundException`) |
| `throw`, `1/0` | caught |
| non-terminating `Get-Item`, EAP Stop | caught |
| `Write-Error 'e'`, EAP Stop | caught (`WriteErrorException`) and terminates the script outside a `try` |
| native exit 3, EAP Stop | not caught, continues (finding 1) |
| `Get-Item /nope -ErrorAction SilentlyContinue` under EAP Stop | suppressed |
| `$?` after that failed cmdlet | `False` |
| `try { exit 5 } finally { Write-Output FINALLY-RAN }` | `FINALLY-RAN`, process exit 5 |

`$?` changes: 7.0 made `(...)`, `$(...)`, `@(...)` preserve the inner status; 5.1 always yields `True` (`paren: dollar-q after (Write-Error)` = False on 7.4.7/7.6.6, True on 5.1; `cases2.ps1`; [about_Automatic_Variables][av76] note; [diff]:382-386). 7.0 also stopped setting `$?` to False merely because a native wrote to stderr ([diff]:388-392). Inline `$?` after a native non-zero exit is `False` on all three and the next statement resets it to `True`.

Scope hazards not measured here (preference variables and module scope) are out of this row.

<a id="f12"></a>
### 12. Output streams and stray output (M-Q-06)

`streams.ps1` runs a child with `-File` and splits real stdout/stderr (System.Diagnostics.Process): identical on 5.1, 7.4.7, 7.6.6, and 7.6.6 on Windows.

```
Write-Output / Write-Host / Write-Information -InformationAction Continue / Write-Warning / Write-Verbose -Verbose  -> stdout
Write-Information (default preference)                                                                             -> nowhere
Write-Error / [Console]::Error.WriteLine                                                                           -> stderr
[Console]::Out.WriteLine                                                                                           -> stdout
```

So for a CLI-contract-shaped script ([cli-contract.md] CLI-01: result on stdout, logs, warnings and errors on stderr; EXIT-02 limits `exit` to the return path of `main`, which is the shell analogue of PS-ERR-06) only `[Console]::Error.WriteLine` is correct for diagnostics; `Write-Host`/`Write-Warning` pollute stdout even though a function's return value does not include `Write-Host` text (`CAPTURE-count=2`, `in-f-host` was not captured). `Write-Error` under Stop terminates, so it is not a diagnostic helper in a script that continues.

`stray.ps1` (function emits `'result'` plus a stray): `ArrayList.Add` leaks the index (`0,result`), `HashSet.Add` leaks `True`, `New-Item` leaks a `DirectoryInfo`; `List[string].Add`, `Hashtable.Add`, `[void](...)` and `$null = ...` do not. Identical on 3 engines.

Choice: `Write-Output` (or an implicit value) only for the value a function returns; stderr through `[Console]::Error.WriteLine`; `Write-Host` only in interactive-display functions (PSScriptAnalyzer exempts `Show-` verb functions, [AvoidUsingWriteHost][pssa-wh]) and for GHA workflow commands (`::error::`) that must be on stdout.

<a id="f13"></a>
### 13. What PSScriptAnalyzer does and does not catch

PSScriptAnalyzer 1.25.0 on pwsh 7.6.6 (`run.sh pwsh`): `native-mid.ps1`, `native-mid-check.ps1`, `iex-exit.ps1` and `native-idiom.ps1` give 0 findings on the defect (only `PSAvoidUsingPositionalParameters` x4 on the idiom's call sites). Rules that exist and are default-on Warnings: `PSAvoidUsingInvokeExpression`, `PSAvoidUsingWriteHost`, `PSAvoidUsingCmdletAliases`, `PSAvoidUsingEmptyCatchBlock` (`Get-ScriptAnalyzerRule` list in scratch `pssa.ps1`). No rule exists for an unchecked native exit code, `exit` under `iex`, stderr redirection under Stop, bare `curl`, or string argument lists. The only fleet settings file (`www-setup/PSScriptAnalyzerSettings.psd1`) excludes three style rules (`PSUseApprovedVerbs`, `PSUseSingularNouns`, `PSUseShouldProcessForStateChangingFunctions`) and leaves all of the above on.

## Normative guidance candidates

Numbered for the rule files `powershell-quality/errors.md` (PS-ERR) and `powershell-quality/native.md` (PS-NATIVE). "RUN" = verification executed against a plant and its twin; paths are under the fixture directory. All grep checks print the violation (empty output = pass); xargs returns 123 when a stage found nothing, the output is the verdict.

**PS-ERR-01 (MUST).** Every native command whose failure matters is followed by `if ($LASTEXITCODE -ne 0) {...}` or goes through `Invoke-Native` (finding 3); `$ErrorActionPreference = 'Stop'` alone is not an exit-code check.
- Rationale: Stop never stops on a native exit code (5/5 engine rows).
- Verify: `grep -rL --include='*.ps1' -e 'LASTEXITCODE' -e 'Invoke-Native' . | xargs -r grep -l -e '^[[:space:]]*&[[:space:]]' -e '^[[:space:]]*tar[[:space:]]' -e '^[[:space:]]*git[[:space:]]' -e '^[[:space:]]*cargo[[:space:]]' -e '^[[:space:]]*docker[[:space:]]' -e '^[[:space:]]*ocx[[:space:]]' -e '^[[:space:]]*task[[:space:]]'` (add the repo's own tool names as `-e` terms; output = files with a native line and no check; heuristic, over-approximates on `& $scriptblock`). Behavioural: `matrix.sh pwsh native-mid.ps1` must not print `reached` (red: 3 engines, exit 0).
- RUN: yes. `checks/native/red-unchecked.ps1` listed; `twin-checked.ps1` and `twin-fn.ps1` not listed. `native-mid-all.out`: red `reached exit=0` x5, `native-mid-check` exit 3 x5, `native-mid-fn` exit 1 x5.

**PS-ERR-02 (MUST).** The helper that checks natives resets `$global:LASTEXITCODE = $null` before the call and compares `-ne 0` (fail-closed); never read `$LASTEXITCODE` after a cmdlet or in a `catch`.
- Rationale: a failing cmdlet leaves a stale code; a never-started native must not read as 0; after a 5.1 `RemoteException` the code is -1.
- Verify: `matrix.sh pwsh native-idiom.ps1`: every `THREW` line for exit 3 / not found / stale 0 (green on 5 engine rows). Reading heuristic for review: a bare `if ($LASTEXITCODE` with no preceding native on the same code path.
- RUN: yes (`native-idiom.ps1`, `cases2.ps1` stale-code line).

**PS-ERR-03 (MUST NOT).** Do not rely on `$PSNativeCommandUseErrorActionPreference` in any script that can run on 5.1 (installers, `shell: powershell`, `#Requires -Version 5.1`); it is a no-op there that does not even warn.
- Rationale: 5.1 prints `reached`, exit 0 with the variable set (`native-mid-pref.ps1`).
- Verify: `grep -rn --include='*.ps1' -e 'PSNativeCommandUseErrorActionPreference' .` and read each hit: it must sit in a 7-only file (`#Requires -Version 7.4`) or beside an explicit check. Behavioural: `matrix.sh pwsh native-mid-pref.ps1` shows `reached`/exit 0 on the 5.1 row (red) and exit 1 on 7.x.
- RUN: yes (behaviour); the grep is a named reading heuristic.

**PS-ERR-04 (SHOULD).** In `shell: pwsh` (7.x) `run:` blocks with two or more native calls, start with `$PSNativeCommandUseErrorActionPreference = $true` (the runner already prepends Stop), or check each call; never `if (native)` while it is on - scope it to `$false` in `& { ... }` for tools with informational codes (robocopy). In `shell: powershell` blocks (5.1) the checks are mandatory (PS-ERR-01).
- Rationale: GHA is last-native-wins (finding 6); the preference is the one-line fix on 7.
- Verify: `python3 pwsh-run-lint.py <repo-root>` (prints every pwsh/powershell step with 2+ native lines and no `LASTEXITCODE`, preference, `Invoke-Native` or `$?`; output = violation).
- RUN: yes. `checks/wf-red` prints `...ci.yml: job=win step#0 shell=pwsh natives=2 unguarded`; `checks/wf-twin` (preference step and explicit-check step) prints nothing. Fleet: 1 hit (`ocx/.github/workflows/shell-activation-deep.yml` step#4).

**PS-ERR-05 (MUST).** A script run with `-File` ends on an explicit status: a top-level `try { Main } catch { [Console]::Error.WriteLine($_); exit 1 }`, and `exit $LASTEXITCODE` where the last native's code is the result. Callers that need the exact code use `-File`, not `-Command` or the GHA built-in shell (which collapse every non-zero to 1).
- Rationale: `-File` returns 0 after a failed final native; `-Command`/GHA turn 7 into 1.
- Verify: `matrix.sh pwsh exitcodes.ps1` (table rows `native-fail-LAST` = 0/0/0 red; `check+exit-LASTEXITCODE` = 3/1/1); review heuristic: last statement of a `.ps1` entry point is a native call or has no `exit` path.
- RUN: yes (`exitcodes.ps1`, 5.1, 7.4.7, 7.6.6, Windows 7.6.6).

**PS-ERR-06 (MUST NOT).** No `exit` in a script that is delivered by `irm | iex` or `[scriptblock]::Create`. Compute `$IsIex = ($null -eq $MyInvocation.MyCommand.Path)` at script scope; when true use `return` (top level) or `$Global:LASTEXITCODE = $code; break`, else `exit $code`.
- Rationale: `exit` terminates the caller's shell on 5.1, 7.4.7 and 7.6.6.
- Verify: `grep -rl --include='*.ps1' -w -e 'iex' . | xargs -r grep -l -w -e 'irm' -e 'Invoke-RestMethod' | xargs -r grep -L -e 'MyInvocation.MyCommand.Path' | xargs -r grep -l -w -e 'exit'` (output = iex-documented installers that use `exit` and never detect iex delivery). Behavioural: `matrix.sh pwsh iex-exit.ps1`: `RED ... HOST-KILLED` vs `TWIN ... host-survived`.
- RUN: yes. `checks/iex/red-exit.ps1` listed; `twin-flag.ps1`, `twin-return.ps1` (no `exit`) and `not-iex.ps1` (no `iex` mention) not listed. Fleet: `www-setup/src/install.ps1` listed (true positive).

**PS-ERR-07 (MUST NOT).** In a script that can run on 5.1, never redirect a native's stderr inside PowerShell (`2>&1`, `2>$null`, `*>&1`, `*>$null`) while `$ErrorActionPreference` is Stop; scope `Continue` around the call (finding 4) or redirect in the child shell (`cmd /c "x 2>&1"`).
- Rationale: 5.1 throws `RemoteException` on the first stderr byte and loses the exit code (-1).
- Verify: `grep -rl --include='*.ps1' -e "ErrorActionPreference = 'Stop'" . | xargs -r grep -L -e "ErrorActionPreference = 'Continue'" | xargs -r grep -n -H -e '2>&1' -e '2>$null' -e '*>&1' -e '*>$null'` (output = sites to read). Behavioural: `matrix.sh pwsh stderr-red.ps1` exits 1 on the 5.1 row only; `stderr-twin.ps1` exits 0 on all.
- RUN: yes. `checks/stderr/red.ps1:2,3` listed, `twin.ps1` not. Fleet: 10 sites in `www-setup/src/install.ps1` (:247, :262, :484, :496, :516, :654, :675, :840, :909, :913), 8 in `ocx/test/manual/test-windows-activation.ps1` (:105, :123, :151, :211, :228, :248, :255, :257).

**PS-ERR-08 (MUST).** `try/catch` only sees terminating errors: put `-ErrorAction Stop` on each cmdlet inside a `try`, or set `$ErrorActionPreference = 'Stop'` at script top (GHA prepends it); never an empty `catch {}`.
- Rationale: non-terminating errors skip `catch`; natives never enter it (finding 11).
- Verify: PSScriptAnalyzer `Invoke-ScriptAnalyzer -Path . -Recurse -IncludeRule PSAvoidUsingEmptyCatchBlock` (default Warning); behavioural `matrix.sh pwsh trycatch.ps1`.
- RUN: yes (`checks/catch/red.ps1:1 PSAvoidUsingEmptyCatchBlock`, `twin.ps1` clean; `trycatch.ps1` on 3 engines).

**PS-ERR-09 (MUST).** Stream discipline: a function returns data only through `Write-Output`/implicit output; diagnostics go to stderr with `[Console]::Error.WriteLine`; `Write-Host`, `Write-Warning`, `Write-Information` and verbose output land on stdout and must not appear in scripts whose stdout is data; discard method return values with `[void]`/`$null =` (`ArrayList.Add`, `HashSet.Add`, `New-Item`).
- Rationale: finding 12 (stdout/stderr split and return pollution, 4 engine rows).
- Verify: PSScriptAnalyzer `-IncludeRule PSAvoidUsingWriteHost` (default Warning; exempts `Show-` verb functions); stray output is a named reading heuristic: `grep -rn --include='*.ps1' -e '\.Add(' .` then check the receiver type (ArrayList/HashSet return a value, `List[T]`/Hashtable do not).
- RUN: yes for PSSA (`checks/streams/red.ps1:1 PSAvoidUsingWriteHost`; `twin.ps1` clean) and for the behaviour (`streams.ps1`, `stray.ps1`); the `.Add(` grep is a heuristic only.

**PS-ERR-10 (MUST).** Exit-code reports on CI: when a `shell: pwsh`/`powershell` step must fail on an earlier native, use PS-ERR-01/04 and do not rely on the epilogue; `shell: pwsh -File {0}` opt-outs must set `$ErrorActionPreference = 'Stop'` themselves because prelude and epilogue disappear.
- Rationale: finding 6 (custom column exit 0 for a failing last native).
- Verify: `grep -rn -e 'shell: pwsh -File' -e 'shell: powershell -File' --include='*.yml' .github` then read: each such step's script must set Stop and exit explicitly; `python3 pwsh-run-lint.py` does not cover custom shells.
- RUN: partial (behaviour in `gha-sim.ps1` custom column; the grep is a heuristic).

**PS-NATIVE-01 (MUST).** Write `curl.exe` (and `sort.exe`, `diff.exe` when the Unix tool is meant) in `.ps1` and in `pwsh`/`powershell` `run:` blocks that can run on 5.1; never bare `curl` or `wget`.
- Rationale: 5.1 aliases `curl`/`wget` to `Invoke-WebRequest` (parameter binding error on `-fsSL`); 7.x on Windows resolves `curl.exe`.
- Verify: `grep -rnP --include='*.ps1' '(?<![\w./-])curl(?![.\w-])' .` (GNU grep -P; output = bare `curl` tokens; excludes `curl.exe`, `curl.se`, `-curl`); for workflows: `grep -rnP --include='*.yml' -B6 '(?<![\w./-])curl(?![.\w-])' .github/workflows` and keep hits under `shell: pwsh`/`powershell`/Windows default.
- RUN: yes for `.ps1` (`checks/curl/red.ps1:1,2` listed; `twin.ps1` with `curl.exe` and `https://curl.se/` not listed). Fleet `.ps1`: 0 hits in the four PowerShell source dirs.

**PS-NATIVE-02 (MUST).** Build native argument lists as arrays and splat (`& $exe @argv`); never as one string, never via `Invoke-Expression`, never `Start-Process -ArgumentList "<string>"`.
- Rationale: a string is one argument on every mode; `Invoke-Expression` re-parses.
- Verify: `grep -rnP --include='*.ps1' 'Start-Process.*-ArgumentList\s+["\x27]' .` (output = string `-ArgumentList`); PSScriptAnalyzer `-IncludeRule PSAvoidUsingInvokeExpression`.
- RUN: yes (`checks/args/red-sp.ps1:1,2` listed, `red-iex.ps1:1 PSAvoidUsingInvokeExpression`; `twin.ps1` with `& tar @argv` clean).

**PS-NATIVE-03 (MUST NOT).** In 5.1-bound scripts do not pass an empty string, an embedded `"` or a trailing `\` before a closing quote to a native without the mode-guarded `ConvertTo-NativeArg` (finding 9); prefer env vars, stdin or a file. `.cmd`/`.bat` targets never receive untrusted input.
- Rationale: 5.1/Legacy drops, strips and corrupts them; unconditional escaping is wrong on 7.3+.
- Verify: `matrix.sh pwsh args.ps1` (read the Legacy rows: `empty-middle argc=2`, `embedded-dquote [say hi]`; 5.1 `trailing-backslash [C:\dir with space"]`); the call site itself has no grep (named reading heuristic: any `''` or interpolated user text in a native call).
- RUN: yes (`args.ps1` x5 engine rows, `args-workaround.ps1`).

**PS-NATIVE-04 (SHOULD).** Use `Start-Process` only when `-Wait`/elevation/redirect-to-file is needed, and pass pre-quoted elements; for argv fidelity use `&`.
- Rationale: the array form splits on spaces and drops empties on all engines.
- Verify: `grep -rn --include='*.ps1' -e 'Start-Process' .` and read each `-ArgumentList`; `matrix.sh pwsh args-startprocess.ps1`.
- RUN: yes (behaviour: `[has] [space]` on 5.1, 7.4.7, 7.6.6, Windows 7.4.7/7.6.6).

## Verification runs

Harness: `run-checks.sh` (all greps, PSScriptAnalyzer, lint; output saved to `run-checks.out`), `native-mid-all.sh`, and the single scripts below via `~/.cache/research-lang/shell-tools/matrix.sh pwsh <script>` (5.1.26100.9444 on the Windows host, 7.4.7 docker, 7.6.6 Linux) plus `winrun.sh <7.4.7|7.6.6> <script>` (Windows host portable zips). All times bounded by `timeout 300`.

| # | Verification | Fixture | Violation (red) | Compliant twin (green) |
|---|---|---|---|---|
| V1 | native exit ignored under Stop | `native-mid.ps1` vs `native-mid-check.ps1`, `native-mid-fn.ps1` | `reached`, exit 0 on 5/5 rows | exit 3 (check) / exit 1 (fn) on 5/5 rows, no `reached` |
| V2 | preference is inert on 5.1 | `native-mid-pref.ps1` | 5.1: `reached`, exit 0; 7.x: exit 1 | (7.x green, 5.1 stays red: the verification proves the rule) |
| V3 | native idiom, fail-closed | `native-idiom.ps1` | n/a (all `THREW` for failures) | 5/5 rows |
| V4 | stderr under Stop | `stderr-red.ps1` vs `stderr-twin.ps1` | 5.1 exit 1 `RemoteException`; 7.x exit 0 | exit 0 on all |
| V5 | caller exit codes | `exitcodes.ps1` | `native-fail-LAST` 0 (-File), `exit7` 1 (-Command) | `check+exit-LASTEXITCODE` 3 (-File) |
| V6 | GHA wrapper | `gha-sim.ps1` | `build(fail) then test(ok)` step-exit 0 | `check after each native` step-exit 1 |
| V7 | exit under iex | `iex-exit.ps1`, `ws-repro.ps1` | `HOST-KILLED proc-exit=5` (and `proc-exit=3` for the www-setup copy) | `host-survived` |
| V8 | argv fidelity | `args.ps1`, `args-workaround.ps1`, `args-startprocess.ps1` | Legacy rows (see finding 9) | Standard/Windows rows; guarded helper |
| V9 | aliases | `aliases.ps1` | 5.1 `curl` -> `Invoke-WebRequest`, `ParameterBindingException ... 'fsSL'` | 7.x Windows `curl.exe` |
| V10 | streams | `streams.ps1`, `stray.ps1` | `Write-Host`/`Write-Warning` on stdout; `0,result` | stderr via `[Console]::Error`; `[void]` |
| V11 | try/catch | `trycatch.ps1` | non-terminating not caught | `-ErrorAction Stop` caught |
| V12 | greps and lint | `run-checks.sh` | see below | empty |

`run-checks.out`, quoted (trimmed to the verdict lines; each command is printed with its `[rc=N]` in the file):

```
N1  $ grep -rL --include='*.ps1' -e 'LASTEXITCODE' -e 'Invoke-Native' checks/native | xargs -r grep -l -e '^[[:space:]]*&[[:space:]]' -e '^[[:space:]]*tar[[:space:]]' ...
    checks/native/red-unchecked.ps1                          [rc=0]   twins twin-checked.ps1 / twin-fn.ps1 not listed
I1  $ grep -rl --include='*.ps1' -w -e 'iex' checks/iex | xargs -r grep -l -w -e 'irm' -e 'Invoke-RestMethod' | xargs -r grep -L -e 'MyInvocation.MyCommand.Path' | xargs -r grep -l -w -e 'exit'
    checks/iex/red-exit.ps1                                  [rc=0]   twin-flag.ps1, twin-return.ps1, not-iex.ps1 not listed
C1  $ grep -rnP --include='*.ps1' '(?<![\w./-])curl(?![.\w-])' checks/curl
    checks/curl/red.ps1:1:curl -fsSL $url -o $out
    checks/curl/red.ps1:2:$r = curl https://example.invalid/x   [rc=0]   twin.ps1 (curl.exe, curl.se) not listed
A1  $ grep -rnP --include='*.ps1' 'Start-Process.*-ArgumentList\s+["\x27]' checks/args
    checks/args/red-sp.ps1:1 ... :2                          [rc=0]
A2  PSAvoidUsingInvokeExpression: red-iex.ps1:1
S1  $ grep -rl --include='*.ps1' -e "ErrorActionPreference = 'Stop'" checks/stderr | xargs -r grep -L -e "ErrorActionPreference = 'Continue'" | xargs -r grep -n -H -e '2>&1' -e '2>$null' -e '*>&1' -e '*>$null'
    checks/stderr/red.ps1:2:$list = & tar -tf $archive 2>&1
    checks/stderr/red.ps1:3:$null = & git fetch 2>$null        [rc=0]   twin.ps1 not listed
W1  python3 pwsh-run-lint.py checks/wf-red
    checks/wf-red/.github/workflows/ci.yml: job=win step#0 shell=pwsh natives=2 unguarded
    python3 pwsh-run-lint.py checks/wf-twin                   (empty)
H1  PSAvoidUsingWriteHost: red.ps1:1 (checks/streams); twin.ps1 clean
E1  PSAvoidUsingEmptyCatchBlock: checks/catch/red.ps1:1; twin.ps1 clean
P1  findings=0   <- PSScriptAnalyzer on checks/native/red-unchecked.ps1: NO rule fires (NOT red: no rule exists)
```

Not red, reported as such: **P1** (PSScriptAnalyzer cannot see an unchecked native exit; hence PS-ERR-01 is grep plus a behavioural matrix run, not a lint rule); the A1 grep does not see an *array* `-ArgumentList` (PS-NATIVE-04 relies on a reading heuristic plus `args-startprocess.ps1`); N1 is a file-level heuristic (a file that checks one of three natives passes). Windows 7.x claims use the official portable zips; Windows PowerShell 5.1 and 7.x on a different Windows build/runner image were not measured (single host, build 26100).

## Exemplar evidence

| Exemplar | Candidate | Verdict | Evidence |
|---|---|---|---|
| PowerShell/PowerShell@5d871eb5e02c | PS-ERR-01/02 | satisfies | `tools/buildCommon/startNativeExecution.ps1:7-52` (`Start-NativeExecution`: Continue, run, `if ($LASTEXITCODE -ne 0 -and -not $IgnoreExitcode) { throw }`, restore EAP in `finally`; :24-25 comment on stale `$LASTEXITCODE`) |
| PowerShell/PowerShell@5d871eb5e02c | PS-ERR-04 | satisfies | `test/powershell/engine/Basic/NativeCommandErrorHandling.Tests.ps1:34-86` pins Stop/Continue/SilentlyContinue/Ignore behaviour for the preference |
| ScoopInstaller/Install@1e2f334083d6 | PS-ERR-06 | satisfies | `install.ps1:91-102` `Exit-Install` (`$Global:LASTEXITCODE = $ErrorCode; break` under iex, `exit` in CI), :743 `$IS_EXECUTED_FROM_IEX = ($null -eq $MyInvocation.MyCommand.Path)` |
| ScoopInstaller/Install@1e2f334083d6 | PS-ERR-02 | contradicts mildly | `install.ps1:644` sets `$Global:LASTEXITCODE = 0` after a handled failure (resets to zero rather than null; intentional, it clears a stale code for the caller) |
| denoland/deno_install@41d4676f8677 | PS-NATIVE-01 | satisfies | `install.ps1:26` and :46 `curl.exe --ssl-revoke-best-effort`, :48 `tar.exe xf` (no `$LASTEXITCODE` check after either, violating PS-ERR-01) |
| jdx/mise@19e8c8f0d03d | PS-ERR-03/04 | satisfies (7-only) | `xtasks/lint-fix.ps1:3-4` Stop plus preference before `cargo clippy` / `prettier` |
| JanDeDobbeleer/oh-my-posh@b0a8acd4d402 | PS-ERR-04 | satisfies (7-only) | `packages/msix/build.ps1:71-72` |
| dotnet/install-scripts@e5cf1dd2d154 | PS-ERR-04 | satisfies, with scoped-off | `eng/common/Get-GitHubAppToken.ps1:44` preference on; :75-79 saves it, sets `$false` around `az keyvault key sign` ("Azure CLI can emit non-fatal Python warnings to stderr") and restores |
| dotnet/install-scripts@e5cf1dd2d154 | PS-ERR-07 | violates (5.1 hazard) | `src/dotnet-install.ps1:135` `$ErrorActionPreference = "Stop"` and :973 `$tarOutput = & tar -xzf $TarPath -C $OutPath @excludeArgs 2>&1` then `$LASTEXITCODE` check: throws `RemoteException` on 5.1 if tar writes to stderr |
| grimoire-rs fleet: www-setup@a251c3631047 | PS-ERR-06 | **violates** | `src/install.ps1:182` (`Err`: `exit $Code`) and :734 (`exit 2`) under `irm https://setup.ocx.sh/pwsh \| iex` (:22); `ws-repro.ps1`: host killed, proc-exit 3, 3/3 engines |
| www-setup@a251c3631047 | PS-ERR-01 | satisfies | `src/install.ps1:485, :517, :638` explicit `$LASTEXITCODE` checks; no `PSNativeCommandUseErrorActionPreference` (correct for a 5.1-floor installer) |
| www-setup@a251c3631047 | PS-ERR-09 | satisfies | `src/install.ps1:168-182` helpers on `[Console]::Error.WriteLine`; `Write-Output` only at :814, :844, :944 |
| www-setup@a251c3631047 | PS-ERR-07 | violates (5.1 hazard, low) | `src/install.ps1:516` `& tar xf ... 2>$null` under Stop outside `try` (`ws-tar-5x.ps1`); also :247, :262, :484, :496, :654, :675, :840, :909, :913 (all inside `try`) |
| ocx@5de9d777eb7d | PS-ERR-04 | **violates** | `.github/workflows/shell-activation-deep.yml:158-169` (`pwsh` step, 3 natives, no guard); :152-156 are single-call steps |
| ocx@5de9d777eb7d | PS-ERR-07 | violates (test script) | `test/manual/test-windows-activation.ps1:105, :123, :151, :211, :228, :248` (`2>$null`) and :255, :257 (`2>&1`) under Stop; the script runs on 5.1 in the `shell: powershell` step (:152) |
| setup-grimoire@1259e35b2550 | PS-ERR-09 | satisfies | `.github/scripts/install.ps1` uses `Write-Host "::error::..."` for runner commands (must be stdout) |
| grimoire@4650ad830375 | PS-ERR-06 | satisfies | `docs/public/install.ps1` (front door) has no `exit`; it only `Invoke-Expression (Invoke-RestMethod ...)` the cargo-dist installer |

## AI-agent angle

What an LLM characteristically gets wrong here, and the smallest mechanical check:

| Mistake | Why it is wrong | Smallest check |
|---|---|---|
| Treats `$ErrorActionPreference = 'Stop'` as "the script stops when a command fails", then calls natives with no check | Stop ignores native exit codes (5/5 rows) | PS-ERR-01 grep N1 (RUN) |
| Writes `$PSNativeCommandUseErrorActionPreference = $true` at the top of a 5.1-floor installer, or in a `shell: powershell` block, and calls it done | No-op on 5.1 | PS-ERR-03 grep plus a read of `#Requires` (RUN for behaviour) |
| Uses `if (some-exe args) {...}` after enabling the preference | throws on 7.x | review: preference and `if (` + native in the same scope |
| Ends an installer with `exit 1` / helper `Err` calling `exit`, shipped as `irm \| iex` | kills the user's shell | PS-ERR-06 grep I1 (RUN) |
| Uses `Write-Error ...; exit 1` as "print and exit" | Write-Error under Stop terminates first, exit code 1 not the intended one; stderr text is a stack trace | review: `Write-Error` followed by `exit` |
| Redirects `2>&1` / `2>$null` on a native "to be quiet", under Stop | 5.1 `RemoteException` | PS-ERR-07 grep S1 (RUN) |
| `curl -fsSL url -o f` (bash habit) in `.ps1`/pwsh blocks, also `wget`, `sort`, `cat`, `ls` flags | 5.1 aliases: `ParameterBindingException` | PS-NATIVE-01 grep C1 (RUN) |
| `Start-Process -ArgumentList "-a $b"` or `@('has space')` | string/array splits and drops empties | PS-NATIVE-02 grep A1 (RUN) |
| `Invoke-Expression "tool $args"` | re-parse and injection | PSScriptAnalyzer `PSAvoidUsingInvokeExpression` (RUN) |
| Passes `''` or `'say "hi"'` to a native and "fixes" 5.1 with `\"` unconditionally | right on 5.1, wrong on 7.3+ | PS-NATIVE-03 `args.ps1` (RUN) |
| Uses `Write-Host` for data or diagnostics in a CLI script | stdout, not stderr; not captured | PSScriptAnalyzer `PSAvoidUsingWriteHost` (RUN) |
| `$list.Add($x)` on `ArrayList` / `$set.Add($x)` in a function | leaks index/bool into the return | review heuristic `.Add(` (RUN for behaviour) |
| `try { native } catch { ... }` expecting a catch on non-zero exit | natives do not throw (without the 7.4 preference) | PS-ERR-08 plus finding 1 |
| Assumes `pwsh -Command ... ; echo $?` returns the program's exit code | `-Command` and GHA collapse to 1 | PS-ERR-05 `exitcodes.ps1` (RUN) |
| Treats PowerShell 7 behaviour as universal: ternary, `&&`, `$IsWindows`, `-Parallel`, no `2>&1` hazard | not on 5.1 | out of scope here: compat.md; PSScriptAnalyzer `PSUseCompatibleSyntax` with `TargetVersions` (not run here) |

## Contested / evolving

- **Should 7.x scripts set `$PSNativeCommandUseErrorActionPreference`?** Practice splits: Microsoft's own tooling and adopters set it (mise, oh-my-posh, dotnet), PowerShell's build code still uses the explicit helper ([sne]), and the docs warn that robocopy-style tools need scoping ([pv76]). Trending toward "set it in 7-only scripts", as of 2026-10; this research keeps it SHOULD because of the `if (native)` throw and the 5.1 gap. 7.4 (the first mainstream release) reaches end of support 2026-11-10 ([plat] §4.3), after which 7.6 LTS is the floor for 7-only scripts.
- **`Write-Host`:** PSScriptAnalyzer says avoid it in functions ([AvoidUsingWriteHost][pssa-wh]); since PowerShell 5.0 it is on the information stream and works without a console host. Measured here: it still lands on **stdout**, which is what matters for the CLI contract.
- **Windows PowerShell 5.1 as a floor:** the fleet installers keep a 5.1 floor (`#Requires -Version 5.1`, www-setup :50); every rule above has a 5.1 half. When 5.1 is dropped for a script, PS-ERR-03/07, PS-NATIVE-01/03 relax (7.4+ semantics only).
- **Removal of the `curl`/`wget` aliases:** refused for Windows PowerShell in 2016 ([#1901][ps1901]) and absent on 7.x/Windows today (measured). The exact release that removed them was not source-confirmed; do not cite a version.
- **Not measured:** PowerShell 7 on other Windows builds, ARM64 (`windows-11-arm`), Windows Server runners, the real GHA runner (the wrapper was reproduced from the runner source, not run on a hosted runner), `$PSNativeCommandArgumentPassing` with real `.bat` targets beyond the one `argv.cmd` probe, preference-variable scoping into script modules.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [pv76]: https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_preference_variables?view=powershell-7.6 | about_Preference_Variables 7.6 (fetched live via WebFetch and from the MicrosoftDocs repo) | ms.date 2026-06-29 | `$PSNativeCommandUseErrorActionPreference`, `$PSNativeCommandArgumentPassing` (primary) |
| [pv51]: https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_preference_variables?view=powershell-5.1 | same page for 5.1 (no `$PSNative*` variables) | 5.1 era | proves the variables are absent on 5.1 (primary) |
| [av76]: https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_automatic_variables?view=powershell-7.6 | `$?`, `$LASTEXITCODE` semantics | 2026 | exit-code rules for files vs `-File`/`-Command` (primary) |
| [tcf]: https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_try_catch_finally?view=powershell-7.6 | try/catch/finally and terminating errors | ms.date 2026-04-02 | statement- vs script-terminating (primary) |
| [pwsh76]: https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_pwsh?view=powershell-7.6 | pwsh command-line: `-File`/`-Command` exit codes | 2026 | the exit-code contract (primary) |
| [pse51]: https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_powershell_exe?view=powershell-5.1 | powershell.exe command line | 5.1 | same contract on 5.1 (primary) |
| [parsing]: https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_parsing?view=powershell-7.6 | native argument parsing, Legacy/Standard/Windows examples | 2026 | argument passing (primary) |
| [redir]: https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_redirection?view=powershell-7.6 | redirection and native commands | 2026 | `2>&1` semantics (primary) |
| [gha]: https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/workflow-syntax.md | GHA workflow syntax, "Exit codes and error action preference" | 2026 | prelude/epilogue and the `pwsh -File {0}` opt-out (primary) |
| [runner]: https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/ScriptHandlerHelpers.cs | runner source: shell templates and `FixUpScriptContents` | main, fetched 2026-10-11 | exact `-command ". '{0}'"`, prepend and append strings (primary) |
| [wn73]: https://learn.microsoft.com/powershell/scripting/whats-new/what-s-new-in-powershell-73 | What's new in 7.3 | 2022-11 | native-passing mainstream, error preference experimental (primary) |
| [wn74]: https://learn.microsoft.com/powershell/scripting/whats-new/what-s-new-in-powershell-74 | What's new in 7.4 | 2023-11 | `PSNativeCommandErrorActionPreference` becomes mainstream (primary) |
| [diff]: https://learn.microsoft.com/powershell/scripting/whats-new/differences-from-windows-powershell | 5.1 vs 7 differences | 2026 | `$?` and native-stderr changes (primary) |
| [ps1901]: https://github.com/PowerShell/PowerShell/issues/1901 | proposal to remove `curl`/`wget` aliases | 2016-08 | why Windows PowerShell keeps them (primary, fetched) |
| [sne]: https://github.com/PowerShell/PowerShell/blob/5d871eb5e02cbcc8ecb03fce4b24d7f48bf97c26/tools/buildCommon/startNativeExecution.ps1 | PowerShell repo's own native-call wrapper | 2026 | canonical `Start-NativeExecution` idiom |
| [nceh]: https://github.com/PowerShell/PowerShell/blob/5d871eb5e02cbcc8ecb03fce4b24d7f48bf97c26/test/powershell/engine/Basic/NativeCommandErrorHandling.Tests.ps1 | official tests for the preference | 2026 | behaviour per `$ErrorActionPreference` value (primary) |
| [scoop]: https://github.com/ScoopInstaller/Install/blob/1e2f334083d609986d8c8bc9e31ae8e87c39fab4/install.ps1 | Scoop installer | 2026 | iex-safe `Exit-Install` at :91-102 |
| [deno]: https://github.com/denoland/deno_install/blob/41d4676f8677ec16449b9e2303e7bd52ed81f03b/install.ps1 | Deno installer | 2026 | `curl.exe`/`tar.exe` usage |
| [dotnet-gh]: https://github.com/dotnet/install-scripts/blob/e5cf1dd2d1540ed05ac84f8eb8c5cdec2807621e/eng/common/Get-GitHubAppToken.ps1 | dotnet script using the preference with a scoped-off block | 2026 | adopter practice |
| [dotnet-inst]: https://github.com/dotnet/install-scripts/blob/e5cf1dd2d1540ed05ac84f8eb8c5cdec2807621e/src/dotnet-install.ps1 | dotnet-install.ps1 | 2026 | Stop plus `& tar 2>&1` (5.1 hazard) |
| [mise]: https://github.com/jdx/mise/blob/19e8c8f0d03d555145dc3678e87c26930775f89b/xtasks/lint-fix.ps1 | mise task script | 2026 | minimal 7-only prelude |
| [omp]: https://github.com/JanDeDobbeleer/oh-my-posh/blob/b0a8acd4d402d64a1b0a492a8ea0cac6accbbbfb/packages/msix/build.ps1 | oh-my-posh build script | 2026 | same prelude |
| [pssa-wh]: https://github.com/PowerShell/PSScriptAnalyzer/blob/main/docs/Rules/AvoidUsingWriteHost.md | PSScriptAnalyzer rule doc | ms.date 2026-07-21 | what the rule covers and its `Show-` exemption (primary) |
| [pssa-iex]: https://github.com/PowerShell/PSScriptAnalyzer/blob/main/docs/Rules/AvoidUsingInvokeExpression.md | PSScriptAnalyzer rule doc | ms.date 2026-07-21 | the injection rationale (primary) |

Internal references: [plat] = `shell-audit/platform-matrix.md` (§2.2-2.3 GHA command lines, §4 PowerShell probe and lifecycle); [fleet] = `shell-audit/fleet-shell-shape.md` (#11, Axis 6-7); [inst] = `shell-audit/installers.md` (#3, `p7`); [cli-contract.md] = `rules/rust-quality/cli-contract.md` (CLI-01, EXIT-02).

[pv76]: https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_preference_variables?view=powershell-7.6
[pv51]: https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_preference_variables?view=powershell-5.1
[av76]: https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_automatic_variables?view=powershell-7.6
[tcf]: https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_try_catch_finally?view=powershell-7.6
[pwsh76]: https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_pwsh?view=powershell-7.6
[pse51]: https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_powershell_exe?view=powershell-5.1
[parsing]: https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_parsing?view=powershell-7.6
[redir]: https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_redirection?view=powershell-7.6
[gha]: https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/workflow-syntax.md
[runner]: https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/ScriptHandlerHelpers.cs
[wn73]: https://learn.microsoft.com/powershell/scripting/whats-new/what-s-new-in-powershell-73
[wn74]: https://learn.microsoft.com/powershell/scripting/whats-new/what-s-new-in-powershell-74
[diff]: https://learn.microsoft.com/powershell/scripting/whats-new/differences-from-windows-powershell
[ps1901]: https://github.com/PowerShell/PowerShell/issues/1901
[sne]: https://github.com/PowerShell/PowerShell/blob/5d871eb5e02cbcc8ecb03fce4b24d7f48bf97c26/tools/buildCommon/startNativeExecution.ps1
[nceh]: https://github.com/PowerShell/PowerShell/blob/5d871eb5e02cbcc8ecb03fce4b24d7f48bf97c26/test/powershell/engine/Basic/NativeCommandErrorHandling.Tests.ps1
[scoop]: https://github.com/ScoopInstaller/Install/blob/1e2f334083d609986d8c8bc9e31ae8e87c39fab4/install.ps1
[deno]: https://github.com/denoland/deno_install/blob/41d4676f8677ec16449b9e2303e7bd52ed81f03b/install.ps1
[dotnet-gh]: https://github.com/dotnet/install-scripts/blob/e5cf1dd2d1540ed05ac84f8eb8c5cdec2807621e/eng/common/Get-GitHubAppToken.ps1
[dotnet-inst]: https://github.com/dotnet/install-scripts/blob/e5cf1dd2d1540ed05ac84f8eb8c5cdec2807621e/src/dotnet-install.ps1
[mise]: https://github.com/jdx/mise/blob/19e8c8f0d03d555145dc3678e87c26930775f89b/xtasks/lint-fix.ps1
[omp]: https://github.com/JanDeDobbeleer/oh-my-posh/blob/b0a8acd4d402d64a1b0a492a8ea0cac6accbbbfb/packages/msix/build.ps1
[pssa-wh]: https://github.com/PowerShell/PSScriptAnalyzer/blob/main/docs/Rules/AvoidUsingWriteHost.md
[pssa-iex]: https://github.com/PowerShell/PSScriptAnalyzer/blob/main/docs/Rules/AvoidUsingInvokeExpression.md
