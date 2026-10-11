---
title: "Revision: ble.sh tagged release and the Windows emitter rows (SH-EMIT-24, 43 and the pwsh, nu, elvish Windows rows)"
topic: shell-emit
agent: shell-emit revision wave 4 (ble-release-and-windows-rows)
model: sonnet
date_researched: 2026-10-11
sources_count: 23
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/ble-release-and-windows-rows/
scope: Revises shell-emit.md (family SH-EMIT, IDs 01..50 stay stable). Part 1 re-runs the SH-EMIT-24 and 43 ble.sh clauses on the tagged releases v0.4.0-devel3 and v0.3.4 and on the nightly (d81fd54), bash 5.2.21 and 5.3.20 (plus nightly on 4.4.23, 5.0.18, 5.1.16). Part 2 measures the Windows PowerShell rows on the Windows host (pwsh 7.6.6, pwsh 7.4.7, Windows PowerShell 5.1.26100.9444, build 26100), staged only under C:\Users\ecom\shell-wintest. Part 3 measures nu 0.116.1 and elvish 0.21.0 config paths on Windows. SH-NU and SH-ELV rows are handed to shell-alt-shells.md by pointer and are not edited here. macOS and BSD claims are not made (no host).
---

# Revision: ble.sh tagged release and the Windows emitter rows

Everything dated 2026-10-11. `$FX` below is the fixture root from the frontmatter. Version tags: ble.sh v0.3.4 (566651e, 2023-04-03), v0.4.0-devel3 (1a5c451c, 2023-04-03, the GitHub "Latest" release), nightly 0.4.0-nightly+d81fd54 (2026-09-08); bash 5.2.21 (Ubuntu 24.04) and 5.3.20 (Arch) in docker with a pty; pwsh 7.6.6, pwsh 7.4.7 and Windows PowerShell 5.1.26100.9444 on the Windows host; nushell 0.116.1; elvish 0.21.0; Git Bash 5.2.15.

## Table of contents

1. Summary
2. Findings (F1..F16)
3. Normative guidance candidates (R1..R12)
4. Verification runs (V1..V22)
5. Exemplar evidence
6. AI-agent angle
7. Contested and evolving
8. Sources
9. Revision log (per-row decisions)

## Summary

- **ble clause holds on the tagged release.** The v0.4.0-devel3 release behaves exactly like nightly d81fd54: a `PROMPT_COMMAND` write made after `ble-attach` is lost (0 of 9 prompts, bash 5.2.21 and 5.3.20, once or twice), a write made before attach or after the first prompt survives (9 of 9), a `blehook` registration fires in every order (F1).
- **The discard is a window, not "after attach".** It spans `ble-attach` to the first prompt. Typed at the first prompt, the `PROMPT_COMMAND` form fires on every later prompt (9 of 10, 10 of 11 when sourced twice, never doubled). Plain `source ble.sh` with no `ble-attach` line in the rc: later writes survive (9 of 9). Scope in the rule: "tagged v0.4.0-devel3 and nightly d81fd54".
- **Stable v0.3.4 has no `blehook`** (`blehook` is "(v0.4)" in the wiki; `_ble_version` is 304 against 400). It sets `BLE_VERSION`, so a gate on `BLE_VERSION` alone calls a missing function: the plant fires 0 of 9 on 0.3.4, red. The gate is `declare -F blehook`. The twin fires on every build.
- **On 0.3.4 only array element 0 runs** (`eval "$PROMPT_COMMAND"`, `ble.sh:8548`). ocx's `PROMPT_COMMAND+=(hook)` is dead there whenever the array already exists: the Arch image's default array is enough (0 of 9, three orders); it fires where `PROMPT_COMMAND` is unset because ocx then takes the string branch.
- **`blehook PRECMD!=fn` is a valid one-call form** ("register if not registered", manual 1.2.2, v0.4): 9 of 9 on both 0.4 builds in every order, not doubled when sourced twice. starship gates it on `_ble_version -ge 400`; `declare -F blehook` is the equivalent probe.
- **SH-EMIT-43 follows SH-EMIT-24**: the `PROMPT_COMMAND` directory compare is lost after attach (0 of 1 `cd` events on 0.4 builds), `blehook CHPWD` fires in every order (1 of 1); both fire on 0.3.4.
- **pwsh completion: register the bare name.** `Register-ArgumentCompleter -Native -CommandName mytool` serves six spellings (`mytool`, `MYTOOL`, `mytool.exe`, `.\mytool`, `.\mytool.exe`, `& mytool`) on 7.6.6, 7.4.7 and 5.1; registering only `mytool.exe` serves the two `.exe` spellings and leaves four on file completion (exit 1, three interpreters). `-NativeFallback` exists on 7.6.6 only; a tool that registers it hides the user's own fallback (SH-EMIT-39 confirmed).
- **Directory hooks (SH-EMIT-42) confirmed**, with one addition: the hook body must test `$PWD.Provider.Name -eq 'FileSystem'` (an `Env:` location fires the delegate; unguarded body ran for `Environment`, exit 1). `[Delegate]::Combine` keeps the user's handler (4 of 4, once and twice); assignment drops it (0 of 4); 5.1 has no `LocationChangedAction`, the prompt wrapper works.
- **Data channel (SH-EMIT-06/07) confirmed on the Windows host, one scope fix.** base64 round-trips 35 of 35 values on all three interpreters. `ConvertFrom-Json` fails 1 of 35 (`datelike`) on 7.4.7 and 7.6.6 but passes 35 of 35 on 5.1 (5.1 keeps a string). `-DateKind String` exists on 7.6.6, not on 7.4.7. The empty `$env:X` row is unchanged: kept on 7.6.6, unset on 7.4.7 and 5.1.
- **Profile paths differ per edition**: `Documents\PowerShell\profile.ps1` (7.x) against `Documents\WindowsPowerShell\profile.ps1` (5.1); both resolve under the `MyDocuments` known folder, which OneDrive can move. Read it from the target interpreter's `$PROFILE.CurrentUserAllHosts`.
- **`Out-File -Append` and `[IO.File]::AppendAllText` corrupt a profile.** On a UTF-16LE profile both append UTF-8 and the file fails to load on all three interpreters; on 5.1 `Out-File -Append` also breaks ASCII, LF and BOM files. `Add-Content` was correct on all 12 (file shape, interpreter) cells.
- **Git Bash breaks CRLF-sensitive rc editors.** msys `awk`, `sed` and `grep` strip the CR on input and write LF; `cat`, `head` and `od` keep bytes. The shell-emit twin fails `born-crlf` and `byte-prefix` there (exit 1); a grep -n/head/tail editor passes on Git Bash and on 11 POSIX shells (exit 0). New clause on SH-EMIT-18.
- **nu on Windows** (0.116.1): `$nu.data-dir` equals the Roaming config dir `C:\Users\<u>\AppData\Roaming\nushell`; `$nu.vendor-autoload-dirs` = `C:\ProgramData\nushell\vendor\autoload` then `<data-dir>\vendor\autoload`; `XDG_CONFIG_HOME` and `XDG_DATA_HOME` move them, `%APPDATA%` does not. Autoload runs in the REPL only. ocx has no Windows branch and writes `$HOME\.local\share\nushell\vendor\autoload`, which nu never reads (exit 1).
- **elvish on Windows** (0.21.0): `rc.elv` is `%XDG_CONFIG_HOME%\elvish\rc.elv` else `<RoamingAppData known folder>\elvish\rc.elv`; the `%APPDATA%` variable is ignored; `-rc` works. ocx's `%HOME%\.config\elvish\rc.elv` is not read (exit 1).
- **Decisions:** SH-EMIT-24, 43 amended; 33, 16, 17, 18, 42, 07 amended; 06, 38, 39 confirmed; 05 confirmed (empty-value clause unchanged). Open question "ble.sh tagged release" closes.

## Findings

### Part 1: ble.sh on the tagged release

**F1. The SH-EMIT-24 ble clause is proven on the tagged release v0.4.0-devel3, not only on the nightly.** The harness is `$FX/ble/case-ble.sh BLEDIR IMAGE IMPL ORDER`: `bash -i` in a docker pty (`-e USER=bleuser -e LOGNAME=bleuser`; without `$USER` ble.sh warns "insane environment" and 0.3.4 misbehaves, so the first pass was discarded and kept in `$FX/out/nouser/`), the user's own hooks registered with `blehook PREEXEC/CHPWD/PRECMD`, orders: `ours-first` (before `ble-attach`), `twice-first`, `ours-last` (after `ble-attach` in the rc), `twice`, `typed` (at the first prompt), `typed-twice`. An empty capture is retried (3 times); a capture with tokens never. Result (hook firings per 9 prompts; F fires once per prompt, D discarded, N fires on 0.3.4 where the user's `blehook` is absent):

| build | impl | ours-first | twice-first | ours-last | twice | typed | typed-twice |
|---|---|---|---|---|---|---|---|
| v0.3.4 | `twin.sh` (PROMPT_COMMAND form) | N9/9 both | N9/9 | N9/9 | N9/9 | N9/10 | N10/11 |
| v0.4.0-devel3 | `twin.sh` | F9/9 both | F9/9 | **D0/9 both** | **D0/9 both** | F9/10 | F10/11 |
| nightly d81fd54 | `twin.sh` | F9/9 both | F9/9 | **D0/9 both** | **D0/9 both** | F9/10 | F10/11 |
| v0.3.4 | `twin-ble.sh` (gated twin) | N9/9, N8/9 | N9/9 | N8/9, N9/9 | N9/9 | N9/10 | N10/11 |
| v0.4.0-devel3 | `twin-ble.sh` | F9/9 both | F9/9 | F9/9 | F9/9 | F9/9, F9/10 | F10/11 |
| nightly | `twin-ble.sh` | F9/9 both | F9/9 | F9/9 | F9/9 | F9/10 | F10/11 |
| v0.4.0-devel3, nightly | `twin-ble-bang.sh` (`PRECMD!=`) | F9/9 | | F8/8, F9/9 | F9/9 | F9/10 | F10/11 |
| v0.3.4 | `twin-ble-bang.sh` | N9/9 | | N9/9 | N9/9 | N9/10 | N10/11 |

"both" is bash 5.2.21 and 5.3.20 (identical cells). The 5.3.20 Arch image already has an array `PROMPT_COMMAND` (a title-bar `printf` at index 0) before the rc runs, the 5.2.21 Ubuntu image has none, so both the array and the unset-to-string path are covered. Raw line (nightly, bash 5.3.20, `twin.sh`, `ours-last`, `$FX/out/twin.txt`): `user_prec user_pre user_prec user_pre user_dir ...` with no `ours` token in 9 prompts; the same cell with `twin-ble.sh` (`$FX/out/twin-ble.txt`): `user_prec ours user_pre user_prec ours ...` nine times.

**F2. The mechanism is in the source.** `ble-edit/adjust-PS1` saves `PROMPT_COMMAND` into `_ble_edit_PROMPT_COMMAND` and runs `builtin unset -v PROMPT_COMMAND`; `restore-PS1` copies the saved value back (`ble-0.4.0-devel3 ble.sh:19659-19686`, `ble-nightly ble.sh:22002-22030`). A write made between adjust and restore (the `ble-attach` to first-prompt window) is overwritten; a write made before attach is the saved copy and comes back; a write made after the first prompt happens while restored. Stable 0.3.4 never touches `PROMPT_COMMAND` in `adjust-PS1` (`ble-0.3.4 ble.sh:8866-8876`); it swaps in `PROMPT_COMMAND=ble/base/attach-from-PROMPT_COMMAND` at attach (`:13447-13449`) and runs the old value with `eval "$PROMPT_COMMAND"` (`:8548`), so for an array only element 0 runs.

**F3. Where the window opens.** README section 1.3 (`raw.githubusercontent.com/akinomyoga/ble.sh/master/README.md` lines 413-424) tells users to `source ble.sh --attach=none` at the top of `.bashrc` and `ble-attach` at the end. Anything a tool appends after that line is in the window. `--attach=none` and the older `--noattach` behave the same: `twin.sh` `ours-last` fired 0 of 9 on v0.4.0-devel3 and on the nightly with `--attach=none` (`$FX/out/attach-none.txt`). With a plain `source ble.sh` (no `ble-attach` line in the rc) attach is deferred to the first prompt and a later append survives: `twin.sh` `plain-last` F9/9 on both 0.4 builds, both images (`$FX/out/twin-plain.txt`).

**F4. `blehook` is a v0.4 feature; the tagged "Latest" release has it, the stable branch does not.** The wiki marks it `(v0.4)` ("Function `blehook`", Manual 1.2.2, forms `+=`, `-=`, `!=`, `-+=`, `+-=`, `=`). Probe on the three builds (`$FX/out/probe-version.txt`): v0.3.4 `BLE_VERSION=0.3.4+566651e _ble_version=304 blehook=no`; v0.4.0-devel3 `0.4.0-devel3+1a5c451c 400 yes`; nightly `0.4.0-nightly+d81fd54 400 yes`. GitHub marks v0.4.0-devel3 "Latest" (published 2023-04-03T14:21Z, 14 minutes after v0.3.4); README 1.2 lists it as "Devel" and v0.3.4 as "Stable ... many features unavailable". So "latest tagged release" is v0.4.0-devel3, and v0.3.4 is the last of the 0.3 line.

**F5. The BLE_VERSION-only gate is a real defect on 0.3.4.** Gate `[[ -n ${BLE_VERSION-} ]]` then `blehook PRECMD+=fn`: on 0.3.4 `blehook` is "command not found", the hook is never registered, 0 of 9 in `ours-first`, `ours-last` and `typed` on both images (`$FX/out/plant-gate.txt`); the same plant fires 9 of 9 on both 0.4 builds. Gating on the function (`[[ -n ${BLE_VERSION-} ]] && declare -F blehook`) falls through to the `PROMPT_COMMAND` extension on 0.3.4, which fires (N9/9 in every order, table above).

**F6. The directory hook follows the prompt hook** (`$FX/out/dir-ble.txt`, `dir-pwd.txt`, one `cd /` and one `cd /tmp`, counted on the event): `twin-dir-ble.sh` (`blehook CHPWD-=fn; +=fn`) F1/1 in `ours-first`, `ours-last`, `typed`, both 0.4 builds, both images; `twin-pwd.sh` (the `PROMPT_COMMAND` compare alone) F1/1 in `ours-first` and `typed`, **D0/1** in `ours-last`; on 0.3.4 both fire (N1/1).

**F7. Older bash, nightly only** (`$FX/out/old-bash.txt`, official musl images, the bash < 5.1 "lambda" and 5.1+ "array" attach paths): 4.4.23, 5.0.18, 5.1.16: `twin.sh` `ours-first` F8/8, F8/8, F9/9; `ours-last` D0/8, D0/8, D0/9; `typed` F9/10 on all three; `twin-ble.sh` F in all three orders. The discard window is the same on every bash 4.4.23 to 5.3.20.

**F8. ocx's emitted hook text under ble** (real `ocx self activate --shell=bash --hook --no-completion` text from ocx 0.6.5 with the body replaced by an echo, `$FX/ble/ocx-emitted.sh`, `$FX/out/ocx-emitted.txt`): v0.4.0-devel3 and nightly F in `ours-first` and `typed`, **D0/9** in `ours-last` (the SH-EMIT-24 loss, on the product's own text); v0.3.4: Ubuntu 5.2.21 N9/9 in every order (`PROMPT_COMMAND` unset, string branch), **Arch 5.3.20 D0/9 in every order** (array branch `PROMPT_COMMAND+=(__ocx_prompt_hook)` puts the hook at index 1; `raw-run.sh` shows `PC=declare -a PROMPT_COMMAND=([0]="printf ..." [1]="__ocx_prompt_hook")`; 0.3.4 evals element 0 only). Source: `ocx@1727d6a15394:crates/ocx_shell/src/shell/hook.rs:226-228`.

**F9. Capture flake, stated.** 0.3.4 redraws the screen after each prompt; its pty captures are noisy (the typed command line is echoed, sometimes truncated). `twin-ble.sh` `plain-last` on 0.3.4 Arch stayed incomplete for four automated retries (`$FX/out/twin-ble-plain.txt` cell `I0/9`); three hand runs show 7, 2 (truncated) and 8 `ours` tokens before the final marker (`$FX/out/twin-ble-plain-0.3.4-arch-manual.txt`). Not counted as a verification either way; 0.3.4 `twin.sh` `plain-last` is N9/9 on both images.

### Part 2: PowerShell on the Windows host

All scripts run from `$FX/win/winrun.sh SLUG SCRIPT [args]`, which stages the script directory under `C:\Users\ecom\shell-wintest\emit-rev2\SLUG` and runs it with `-NoProfile -NonInteractive` under `pwsh-7.6.6\pwsh.exe`, `pwsh-7.4.7\pwsh.exe` (portable, under `shell-wintest`) and `powershell.exe` 5.1.26100.9444, retrying the first call when WSL's vsock fails once (`UtilAcceptVsock`). The owner's real `$PROFILE` and registry are never written.

**F10. Completion registration read-back (SH-EMIT-33, 39).** Read-back is `TabExpansion2` against a registered `-Native` completer, six spellings (`$FX/win/comp/comp-exe.ps1`, log `$FX/win/out/comp-exe*.win.txt`). Registering `-CommandName mytool` (mode `bare`) or both spellings (`both`): all six spellings return the completer's `[sub]` on 7.6.6, 7.4.7, 5.1 (exit 0). Registering only `mytool.exe` (`exe-only`): `mytool`, `MYTOOL`, `.\mytool` and `& mytool` return file names (`.\comp-exe.ps1,.\grim.powershell,.\mytool.exe,...`), `mytool.exe` and `.\mytool.exe` return `[sub]` (exit 1, three interpreters). Documented parameter sets: `Register-ArgumentCompleter -Native -CommandName <string[]>`; the `NativeFallback` set exists in the 7.6 page only (`learn.microsoft.com/.../register-argumentcompleter?view=powershell-7.6`; the 5.1 page has no such set). `$FX/win/comp/nativefallback.ps1`: `hasNativeFallback=True` on 7.6.6, `False` on 7.4.7 and 5.1. Twin (tool registers `-Native -CommandName`, user keeps `-NativeFallback`): `toolCompletes=[sub] userFallbackServes=[userfb]` on 7.6.6 (exit 0), the tool call never throws on 7.4.7 and 5.1. Plant (tool registers `-NativeFallback`): `userFallbackServes=[toolfb] toolCompletes=[toolfb]` on 7.6.6, and `Parameter set cannot be resolved` thrown on 7.4.7 and 5.1 (exit 1 on all three). Profile sourced twice: 36 completions after once and after twice, all three interpreters (`$FX/win/out/twice.win.txt`).

**F11. Directory hooks (SH-EMIT-42).** `$FX/win/dir/dir-case.ps1` (`twin`, `plant-assign`, `plant-append`, `twin-prompt`, each also `-Twice`) with a user handler registered first, four `Set-Location` calls: twin (`LocationChangedAction = [Delegate]::Combine(old, ours)`) `user=4 ours=4` on 7.6.6 and 7.4.7, also sourced twice (the marker dedupes); `plant-assign` `user=0 ours=4` (exit 1); `plant-append` (`+=` on a delegate property) throws `Method invocation failed` and fires neither (exit 1); 5.1 has no `LocationChangedAction` property (`LocationChangedAction=absent`), the prompt-wrapper twin gives `user=0 ours=4` on 5.1 with the hook working (exit 0). Edges (`dir-edge.ps1`): moving into the same directory under another case or with a trailing backslash fires the delegate (`delegate+1`) but not the prompt wrapper (`prompt+0`, compared path); `Set-Location Env:` fires both. `$FX/win/dg/dir-guard.ps1`: without the provider test the body ran for `Environment` on all three (`acted=[FileSystem,Environment,FileSystem,FileSystem]`, exit 1), with `$PWD.Provider.Name -eq 'FileSystem'` only for `FileSystem` (exit 0). The API property is documented as `CommandInvocationIntrinsics.LocationChangedAction` (`learn.microsoft.com/dotnet/api/system.management.automation.commandinvocationintrinsics.locationchangedaction`).

**F12. Profile paths per edition, read-only** (`$FX/win/pp/profile-paths.ps1`, `$FX/out/profile-paths-datekind.win.txt`; the `MyDocuments` known folder is `C:\Users\ecom\Documents`, equal to `%USERPROFILE%\Documents`, not OneDrive-redirected on this host): 7.6.6 and 7.4.7 `CurrentUserAllHosts` = `Documents\PowerShell\profile.ps1`, `CurrentUserCurrentHost` = `Documents\PowerShell\Microsoft.PowerShell_profile.ps1`, `AllUsersAllHosts` next to the portable `pwsh.exe` (for the installed MSI it is `$PSHOME`); 5.1 `CurrentUserAllHosts` = `Documents\WindowsPowerShell\profile.ps1`, `AllUsersAllHosts` = `C:\Windows\System32\WindowsPowerShell\v1.0\profile.ps1`. `about_Profiles` (7.6) states Documents "can be changed by folder redirection or OneDrive". Shape of the owner's real files, copied read-only and reported by size, BOM and line endings only (`$FX/win/real/real-profile-shape.ps1`): `WindowsPowerShell\profile.ps1` 265 bytes, no BOM, LF; `WindowsPowerShell\Microsoft.PowerShell_profile.ps1` 658 bytes, UTF-8 BOM, CRLF, 3 non-ASCII bytes; the `PowerShell\` pair is absent. So a real 5.1 profile can be BOM + CRLF + non-ASCII, and LF and CRLF files both occur.

**F13. Appending to a profile (SH-EMIT-16 PowerShell line).** `$FX/win/prof/profile-edit.ps1` appends a marker block to four profile shapes (`ascii-crlf`, `ascii-lf`, `utf16le-crlf`, `utf8bom-crlf`) and dot-sources the result, counting blocks (log `$FX/win/out/profile-edit.win.txt`). `Add-Content` and the managed-twin: 12 of 12 OK on 7.6.6, 7.4.7, 5.1 (exit 0). `[IO.File]::AppendAllText` (UTF-8, no BOM): `utf16le-crlf` fails on all three (`The term '???...' is not recognized`, exit 1). `Out-File -Append`: `utf16le-crlf` fails on 7.6.6 and 7.4.7 (UTF-8 appended to UTF-16LE), and on 5.1 it is the other way round: `ascii-crlf`, `ascii-lf` and `utf8bom-crlf` fail (UTF-16LE appended, `The term '' is not recognized`), only `utf16le-crlf` loads (exit 1). Docs: `Out-File -Append` "uses the default encoding. That encoding may not match the encoding of the target file. This is the same behavior as the redirection operator (`>>`)" (Out-File 5.1 page); "Out-File and the redirection operators > and >> create UTF-16LE" on 5.1, and "when the target file is empty or doesn't exist, Set-Content and Add-Content use Default" (about_Character_Encoding 7.6). The copy-and-edit run (`real-copy-edit.ps1`, on copies of the two real 5.1 files, CR=20 LF=20 and CR=0 LF=8): `OK` on all three interpreters, original line endings kept.

**F14. Env and data channel rows (SH-EMIT-05, 06, 07).** `$FX/win/env-empty.ps1` (five set forms): `Test-Path env:XE` True on 7.6.6 (child sees `XE=`), False on 7.4.7 and 5.1 (child sees `Environment variable XE not defined`); about_Environment_Variables 7.6: "Beginning in PowerShell 7.5, you can set an environment variable to an empty string". The 35-value corpus through the base64 channel (`$FX/win/w_b64/s_pwsh_b64.ps1`): 35 of 35 on 7.6.6, 7.4.7, 5.1. Through `ConvertFrom-Json` (`s_pwsh_json.ps1`): 34 of 35 on 7.6.6 and 7.4.7, failing `datelike` (`2026-10-11T00:00:00Z` comes back as the culture-formatted `[DateTime]` string `10/11/2026 00:00:00`), 35 of 35 on 5.1 (`$FX/win/dt/datekind.ps1`: 5.1 returns `String`, 7.4.7 and 7.6.6 return `DateTime`; `-DateKind` exists on 7.6.6 and removes the coercion, `-DateKind String` returns `String`, it does not exist on 7.4.7 or 5.1).

**F15. Git Bash and CRLF (SH-EMIT-18).** The shell-emit twin (`$FX/rc/twin-rc-edit.sh`, awk-based) on a profile that was re-saved with CRLF: `lf-then-crlf` 2 managed blocks (want 1) and `born-crlf` 1 CR against 4 LF on all 11 POSIX shells tested (dash 0.5.12, busybox ash 1.35 and 1.37, mksh R59c, ksh93u+m 2023 and 1.0.10, yash 2.52, posh 0.14.1, bash 3.2 and 5.2 `--posix`, zsh 5.9 `emulate sh`: exit 1, `$FX/out/crlf-posix.txt`) and on Linux GNU userland; on Git Bash 5.2.15 it also rewrites the user's bytes (`FAIL[byte-prefix]: the user's first 26 bytes changed`, 0 CR bytes left). Cause measured in `$FX/out/msys-textmode.txt`: on Git Bash `awk length` of `a\r\n` is 1 (Linux 2), `awk print | od` and `sed p | od` give `61 0a 62 0a` (CR dropped), `grep -c 'CR$'` is 0, while `cat | od` and `head -n 1 | od` keep `0d 0a`. The CRLF-aware variant `$FX/rc/twin-rc-edit-v3.sh` (locate markers with `grep -n -x -F -e MARK -e MARK<CR>`, cut with `head` and `tail`, write with the file's own EOL, never filter user bytes through awk or sed) is exit 0 on the 11 POSIX shells, Linux, and Git Bash.

### Part 3: nu and elvish on Windows

**F16. Config paths (SH-EMIT-17, SH-NU-07; elvish row).** nu 0.116.1 portable zip, staged `C:\Users\ecom\shell-wintest\emit-rev2\tools\nu-0.116.1\nu.exe`, every run with `-n` or config redirected (`$FX/nuelv/run-nu-paths.cmd`, `$FX/out/run-nu-paths.win.txt`): default environment `default_config_dir` `C:\Users\ecom\AppData\Roaming\nushell`, `data_dir` the same, `vendor_autoload_dirs` = [`C:\ProgramData\nushell\vendor\autoload`, `C:\Users\ecom\AppData\Roaming\nushell\vendor\autoload`]; `XDG_CONFIG_HOME` and `XDG_DATA_HOME` set to staging move `config_path` and `data_dir` (`...\xdgd\nushell`) and the second autoload dir; `APPDATA` and `LOCALAPPDATA` set to staging change nothing; `--config-home` moves only the config files (`data_dir` stays Roaming). The nushell book states the same (`nushell.sh/book/configuration.html`). Autoload runs only in the REPL: `nu -e` loaded `vendor` and `user` autoload files (`V=vendor U=user L=MISSING`), `nu -l -e` also `login.nu`; `nu -c` and `nu -l -c` load none (`$FX/out/run-nu-autoload.win.txt`; the REPL then exits 1, "STDIN is not a TTY", after loading). ocx-style target (`$HOME\.local\share\nushell\vendor\autoload`, `profiles.rs:56-72, 100-135`, no Windows branch): file not read (`PROBE=MISSING`, exit 1); target taken from nu itself (`$nu.vendor-autoload-dirs | last`, XDG redirected): `PROBE=loaded`, exit 0 (`run-nu-install.cmd plant|twin`). elvish 0.21.0 (`$FX/nuelv/run-elv-rc.cmd`, interactive through a ctypes ConPTY, `conpty_run.py`, because winpty reported "stdin is not a tty" unreliably): `XDG_CONFIG_HOME=<st>\xdg` read `<st>\xdg\elvish\rc.elv`; `APPDATA=<st>\appdata` with XDG unset did not read `<st>\appdata\elvish\rc.elv` (the default comes from the `FOLDERID_RoamingAppData` known folder, `elves/elvish@v0.21.0:pkg/shell/paths_windows.go:12-24` and `paths.go:rcPath`); `-rc <file>` read the file; no `rc.elv` was created in the real Roaming folder. ocx-style `%HOME%\.config\elvish\rc.elv`: not read (exit 1); `XDG_CONFIG_HOME` form read (exit 0, `run-elv-install.cmd plant|twin`). Pointer: SH-NU-07 (`shell-alt-shells.md:345`) already says `$nu.data-dir/vendor/autoload/<tool>.nu`; it should add "ask nu, do not hard-code, Windows data-dir is Roaming" (owner: shell-alt-shells); no SH-ELV row names the `rc.elv` location, so one is proposed there (owner: shell-alt-shells), not written here.

## Normative guidance candidates

Fixture paths are under `$FX`. "RUN" means the check was run against a planted violation (red) and a compliant twin (green) today.

**R1 (SH-EMIT-24, amended MUST). Under ble.sh register the bash prompt hook with `blehook PRECMD!=fn` (one call, idempotent) or `blehook PRECMD-=fn; blehook PRECMD+=fn`, and gate that branch on `declare -F blehook`, never on `BLE_VERSION` alone; without `blehook` use the `PROMPT_COMMAND[0]` string extension.**
- Why: stable v0.3.4 sets `BLE_VERSION` and has no `blehook`; the `BLE_VERSION`-only gate registers nothing there (F4, F5). starship's gate `_ble_version -ge 400` (`starship.bash:90`) is the same test.
- Verify: `grep -rL -e 'declare -F blehook' --include='*.sh' DIR | xargs -r grep -l -e 'blehook PRECMD' -e 'blehook CHPWD'` (G1); runtime `$FX/ble/run-matrix.sh OUT plant-gate-version.sh ours-first ours-last typed` against `twin-ble.sh`.
- RUN: yes. G1 prints `greps/plant/gate-version.sh` on the plant and nothing on `greps/twin/gate-version.sh`; the plant fires 0 of 9 on v0.3.4 (both images, three orders, `$FX/out/plant-gate.txt`), the twin 9 of 9 (N9/9, N8/9 on one cell).

**R2 (SH-EMIT-24, scope MUST, narrowed to a window). A `PROMPT_COMMAND` write made between `ble-attach` and the first prompt is lost on ble.sh v0.4.0-devel3 and nightly d81fd54; a write made before attach or after the first prompt, or with no `ble-attach` line, survives. A bash hook installer therefore carries the `blehook` branch (R1) wherever it can run after attach.**
- Why: F1 to F3, F7. The guarantee of SH-EMIT-24 is "scoped to the tagged v0.4.0-devel3 and nightly d81fd54 (2026-09-08), bash 4.4.23 to 5.3.20".
- Verify: `grep -rL -e 'blehook' --include='*.sh' DIR | xargs -r grep -l -e 'PROMPT_COMMAND'` (G2, a heuristic for "writes `PROMPT_COMMAND` without a ble branch"); runtime `case-ble.sh BLEDIR IMAGE twin.sh ours-last`.
- RUN: yes. G2 prints `plant/prompt-hook.sh` and `plant/dir-hook.sh`, nothing on the twin directory; `twin.sh` `ours-last` D0/9 on both 0.4 builds, twin-ble F9/9.

**R3 (SH-EMIT-43, amended MUST). The bash directory hook under ble.sh is `blehook CHPWD!=fn` (or `-=` then `+=`) behind the same `declare -F blehook` gate; the `PROMPT_COMMAND` compare is the fallback.** Why: F6. Verify: G1 and G2 over the hook installer, runtime `case-ble.sh ... twin-dir-ble.sh ours-last`. RUN: yes; `twin-pwd.sh` `ours-last` D0/1 on both 0.4 builds, `twin-dir-ble.sh` F1/1.

**R4 (SH-EMIT-33, amended MUST, PowerShell clause). Register `Register-ArgumentCompleter -Native -CommandName <name>` with the bare command name, not `<name>.exe`, and prove it with `TabExpansion2` on `<name> `, `<NAME> `, `<name>.exe `, `.\<name> ` and `& <name> `.**
- Why: F10. The bare name serves six spellings on 7.6.6, 7.4.7 and 5.1; the `.exe` name serves two.
- Verify: `grep -rn -e "CommandName *'[^']*[.]exe'" -e 'CommandName *"[^"]*[.]exe"' --include='*.ps1' DIR` (G4); runtime `winrun.sh comp comp/comp-exe.ps1 exe-only` (exit 1) against `bare` (exit 0).
- RUN: yes (G4 plant `register-exe.ps1:2`, twin empty; runtime exit 1 and 0 on all three).

**R5 (SH-EMIT-39, confirmed MUST). A tool never registers `-NativeFallback`; it registers `-Native -CommandName`. The parameter set exists on 7.6.6 only, and a tool's fallback hides the user's.** Verify: `winrun.sh comp comp/nativefallback.ps1 plant|twin`. RUN: yes (plant exit 1 on 7.6.6, 7.4.7, 5.1; twin exit 0).

**R6 (SH-EMIT-42, amended MUST). PowerShell 7.x: compose with `[Delegate]::Combine($old, $new)` and test `$PWD.Provider.Name -eq 'FileSystem'` in the body. 5.1: no delegate, wrap `prompt`. Never assign and never `+=` on the property.**
- Why: F11.
- Verify: `grep -rL -e 'Provider.Name' --include='*.ps1' DIR | xargs -r grep -l -e 'LocationChangedAction'` (G5), `grep -rL -e 'Delegate]::Combine' --include='*.ps1' DIR | xargs -r grep -l -e 'LocationChangedAction'` (G5b); runtime `dir-case.ps1 twin|plant-assign|plant-append`, `dir-guard.ps1 [-Guard]`.
- RUN: yes (G5 prints `plant/dir-hook.ps1`, G5b `plant/dir-hook-assign.ps1`, twins empty; runtime plants exit 1, twins exit 0).

**R7 (SH-EMIT-16, amended MUST, PowerShell). Take the profile path from the target interpreter (`$PROFILE.CurrentUserAllHosts` under `pwsh` for 7.x, under `powershell.exe` for 5.1), not from a joined `Documents` path; append with `Add-Content -Path ... -Value ...` and an ASCII-only payload; never `Out-File -Append`, `>>`, or `[IO.File]::AppendAllText`.**
- Why: F12, F13. Four profile shapes, three interpreters: only `Add-Content` was green in all twelve cells.
- Verify: `grep -rn -e 'Out-File' -e 'AppendAllText' --include='*.ps1' DIR` (G3); runtime `winrun.sh prof prof/profile-edit.ps1 out-file|append-all-text|add-content`.
- RUN: yes (G3 prints `plant/profile-append.ps1:3`; runtime `out-file` and `append-all-text` exit 1, `add-content` exit 0).

**R8 (SH-EMIT-18, amended MUST). The managed-block editor keeps the user's bytes: find markers with `grep -n -x -F` (both the bare and the CR-suffixed marker), cut with `head` and `tail`, write the block with the file's own line ending, and repair a missing final newline with that ending. No `awk` or `sed` over the user's lines when the script can run in Git Bash.**
- Why: F15.
- Verify: `grep -rn -e '^awk ' -e '| awk ' -e '^sed ' -e '| sed ' --include='*.sh' DIR` (G7); runtime `sh $FX/rc/check-crlf.sh IMPL` (exit 1 on a CRLF violation).
- RUN: yes (G7 prints `plant/rc-edit.sh:30`, twin empty; `check-crlf.sh twin-rc-edit.sh` exit 1 on Git Bash and 11 POSIX shells, `twin-rc-edit-v3.sh` exit 0 on all).

**R9 (SH-EMIT-17, amended SHOULD; SH-NU-07 pointer). Locate nu's autoload directory by asking nu (`nu --no-config-file -c '$nu.vendor-autoload-dirs | last'`) in the environment the session will have; do not build `~/.local/share/nushell/vendor/autoload`. On Windows `$nu.data-dir` is `%AppData%\nushell`; `XDG_DATA_HOME` and `XDG_CONFIG_HOME` move it, `%APPDATA%` does not; a `-c` script does not load it.**
- Why: F16.
- Verify: `grep -rL -e 'vendor-autoload-dirs' --include='*.sh' DIR | xargs -r grep -l -e 'nushell/vendor/autoload'` (G6); runtime `cmd.exe /c run-nu-install.cmd plant|twin`.
- RUN: yes (G6 prints `plant/nu/install.sh`, twin empty; plant exit 1 file not read, twin exit 0 loaded).

**R10 (SH-EMIT-16/38, amended for Windows elvish; SH-ELV pointer). The elvish `rc.elv` is `%XDG_CONFIG_HOME%\elvish\rc.elv` when that variable is set, else `<RoamingAppData known folder>\elvish\rc.elv`; `%APPDATA%` is not consulted and `%HOME%\.config` is not a Windows default. Tests pass `-rc FILE` or set `XDG_CONFIG_HOME`.** Verify: `cmd.exe /c run-elv-install.cmd plant|twin`. RUN: yes (plant exit 1, twin exit 0).

**R11 (SH-EMIT-07, scope MUST). Do not use `ConvertFrom-Json` as the PowerShell data channel while 7.x is in range: it coerces an ISO-date string to `[DateTime]` on 7.4.7 and 7.6.6; `-DateKind String` exists on 7.6.6 only. Windows PowerShell 5.1 returns the string unchanged. base64 is 35 of 35 on all three.** Verify: `python3 -I $FX/win/summ.py pwsh_json $FX/win/out/pwsh_json.win.txt` (exit 1, `datelike`) against `pwsh_b64` (exit 0). RUN: yes.

**R12 (SH-EMIT-05/06, confirmed). An empty value for a PowerShell target whose range includes 7.4.7 or 5.1 is refused (`$env:X = ''` unsets); on 7.6.6 it is kept.** Verify: `winrun.sh w_env env-empty.ps1`. RUN: yes, differential by version (no plant fits one binary).

## Verification runs

Colour code: red = the check printed a violation or exited non-zero on the plant; green = twin clean. `greps/` commands are the checker shape (explicit directory operand, one `-e` per alternative, `xargs -r`, output is the violation, empty is a pass). Matrix runs have no exit code of their own; the verdict is the count of `ours` tokens per prompt from `$FX/ble/summarize.py FILE prec|dir`.

| # | Fixture and command | Plant (red) | Twin (green) |
|---|---|---|---|
| V1 | `$FX/greps/run-greps.sh`, G1 | `plant/gate-version.sh`, 1 line | empty |
| V2 | same, G2 | `plant/dir-hook.sh`, `plant/prompt-hook.sh` | empty |
| V3 | same, G3 | `plant/profile-append.ps1:3` (and the comment line 1) | empty |
| V4 | same, G4 | `plant/register-exe.ps1:2` | empty |
| V5 | same, G5 | `plant/dir-hook.ps1` | empty |
| V6 | same, G5b | `plant/dir-hook-assign.ps1` | empty |
| V7 | same, G7 | `plant/rc-edit.sh:30` | empty |
| V8 | same, G6 | `plant/nu/install.sh` | empty |
| V9 | `$FX/ble/run-matrix.sh $FX/out/plant-gate.txt plant-gate-version.sh ours-first ours-last typed` | v0.3.4: `D0/9`, `D0/9`, `D0/10` on both images (no `ours` token; output `BLEV=0.3.4+566651e BASHV=5.3.20(1)-release` only) | `twin-ble.sh`: v0.3.4 N9/9 (one N8/9), 0.4 builds F9/9 |
| V10 | `run-matrix.sh $FX/out/twin.txt twin.sh ours-first twice-first ours-last twice typed typed-twice` | 0.4.0-devel3 and nightly `ours-last` and `twice`: `D0/9` on both images | `ours-first`, `twice-first` F9/9; `typed` F9/10; `typed-twice` F10/11 |
| V11 | `winrun.sh comp $FX/win/comp/comp-exe.ps1 exe-only` | exit 1 on 7.6.6, 7.4.7, 5.1; four of six spellings return file names | `bare` exit 0, `both` exit 0, six of six `[sub]` |
| V12 | `winrun.sh comp $FX/win/comp/nativefallback.ps1 plant` | exit 1 on all three (7.6.6 `userFallbackServes=[toolfb]`; others `Parameter set cannot be resolved`) | `twin` exit 0 (`userFallbackServes=[userfb]`) |
| V13 | `winrun.sh dir $FX/win/dir/dir-case.ps1 plant-assign` and `plant-append` | exit 1 on 7.6.6, 7.4.7 (`user handler ran 0x (want 4)`); 5.1 `no LocationChangedAction` | `twin` and `twin -Twice` exit 0 on 7.x; `twin-prompt` exit 0 on all three |
| V14 | `winrun.sh dg $FX/win/dg/dir-guard.ps1` | exit 1 on all three (`the hook body ran for provider(s): Environment`) | `-Guard` exit 0 on all three |
| V15 | `winrun.sh prof $FX/win/prof/profile-edit.ps1 out-file` and `append-all-text` | exit 1 on all three (`utf16le-crlf` on 7.x, `ascii-*` and `utf8bom-crlf` on 5.1 for out-file; `utf16le-crlf` for append-all-text) | `add-content` and `twin` exit 0, 12 of 12 |
| V16 | `winrun.sh w_json $FX/win/w_json/s_pwsh_json.ps1` then `python3 -I $FX/win/summ.py pwsh_json OUT` | exit 1, 34/35 `FAIL datelike` on 7.6.6 and 7.4.7 | `pwsh_b64` exit 0, 35/35 on all three; 5.1 json 35/35 |
| V17 | `sh $FX/rc/check-crlf.sh $FX/rc/twin-rc-edit.sh` in Git Bash 5.2.15 and in 11 POSIX shells | exit 1: `FAIL[born-crlf]`, `FAIL[byte-prefix]`, `FAIL[lf-then-crlf]` (POSIX) | `twin-rc-edit-v3.sh` exit 0 everywhere (`$FX/out/crlf-rcedit.txt`, `crlf-posix.txt`) |
| V18 | `cmd.exe /c $FX/nuelv/run-nu-install.cmd plant` | exit 1, `target dir: ...\home\.local\share\nushell\vendor\autoload`, `PROBE=MISSING` | `twin` exit 0, `target dir: ...\state-twin\data\nushell\vendor\autoload`, `PROBE=loaded` |
| V19 | `cmd.exe /c $FX/nuelv/run-elv-install.cmd plant` | exit 1, `rc.elv NOT read` | `twin` exit 0, `rc.elv read` |
| V20 | `$FX/ble/case-ble.sh ble-nightly archlinux:latest twin-pwd.sh ours-last` (SH-EMIT-43 compare) | `D0/1` | `twin-dir-ble.sh` F1/1 |
| V21 | `$FX/ble/case-ble-attachnone.sh BLEDIR archlinux:latest twin.sh ours-last` (`--attach=none`) | v0.4.0-devel3 and nightly: `user_prec=9 ours=0` | (twin in V10) |
| V22 | `$FX/ble/case-ble.sh ble-0.3.4 IMAGE ocx-emitted.sh ours-first` | Arch 5.3.20: `D0/9` (array index 1) | Ubuntu 5.2.21: `N9/9` (string) |

Not a red/green pair, recorded as differential measurements: `env-empty.ps1` (F14), `profile-paths.ps1` (F12), `run-nu-paths.cmd` and `run-nu-autoload.cmd` (F16), `run-elv-rc.cmd` (F16), `msys-textmode.sh` (F15), `old-bash.txt` (F7), `datekind.ps1` (F14).

Checker-shape notes: the first pass without `$USER` is kept in `$FX/out/nouser/` and not used; a first full rerun ran two drivers at once, clobbered its own shards, and is kept in `$FX/out/concurrent-clobbered/` and not used; the numbers above come from the single clean rerun (`$FX/out/run-all.log` ends `DONE`, retried captures logged in it).

## Exemplar evidence

- **starship@d4d0459c5c24** `src/init/starship.bash:88-92`: `if [[ ${BLE_VERSION-} && _ble_version -ge 400 ]]; then blehook PREEXEC!='starship_preexec "$_"'; blehook PRECMD!='starship_precmd'`. The `!=` form and a version gate that excludes 0.3.4 (304); R1 accepts `declare -F blehook` as the equivalent probe.
- **atuin@56525ac6a7a9** `.buildkite/scripts/install-blesh.sh:5` pins `version=0.4.0-devel3` for its e2e tests; `crates/atuin/src/shell/atuin.bash:60` branches on `BLE_ATTACHED`. A fleet tool tests the tagged release, not the nightly.
- **zoxide@86b443cffcd7** `templates/bash.txt:65-72`: the hook is `PROMPT_COMMAND=("${PROMPT_COMMAND[@]}" __zoxide_hook)` or the string form, no ble branch. Written after `ble-attach`, it is in the discard window (R2); written before, it survives.
- **ocx@1727d6a15394** `crates/ocx_shell/src/shell/hook.rs:226-228` appends `PROMPT_COMMAND+=(__ocx_prompt_hook)` for an array; F8 measured it dead under ble `ours-last` and dead on ble 0.3.4 when the array exists. `crates/ocx_setup/src/profiles.rs:56-72, 100-135` has no Windows branch for nu (`$HOME/.local/share/nushell/vendor/autoload`) or elvish (`$HOME/.config/elvish/rc.elv`): both unread on Windows (V18, V19).
- **oils@57d3f0d088c3** `regtest/ble.sh` clones and runs ble.sh's own tests from source (reading only; not run here).

## AI-agent angle

| Mistake an LLM makes | Smallest mechanical check |
|---|---|
| Gates the ble branch on `BLE_VERSION` and calls `blehook` | G1 (`declare -F blehook` absent next to `blehook PRECMD`) |
| "Fixes" ble by moving the `PROMPT_COMMAND` write to the end of `.bashrc` | G2 (no `blehook` branch next to a `PROMPT_COMMAND` write); the end of `.bashrc` is where README puts `ble-attach` |
| Treats the nightly as "the release" and quotes its counts for v0.3.4 | the build table in F1; frontmatter version tags |
| Registers `-CommandName tool.exe` because Windows runs `tool.exe` | G4 |
| Writes `LocationChangedAction = {...}` or `+=` | G5b |
| Omits the provider test in the hook body | G5 |
| Appends to `$PROFILE` with `>>`, `Out-File -Append` or `AppendAllText` | G3 |
| Hard-codes `$PROFILE` as `Documents\WindowsPowerShell\...` for pwsh 7 | R7: read `$PROFILE.CurrentUserAllHosts` from the target interpreter (differential, `profile-paths.ps1`) |
| Edits rc with `awk` or `sed -i`, believing CRLF is harmless | G7 |
| Hard-codes nu's autoload path from the XDG layout | G6 |
| Assumes `%APPDATA%` redirects nu or elvish | `run-nu-paths.cmd` case c, `run-elv-rc.cmd` case b (differential) |
| Uses `ConvertFrom-Json` on pwsh 7 because it worked on 5.1 | R11, `summ.py pwsh_json` |

## Contested and evolving

- **"Latest tagged release" is ambiguous.** GitHub's Latest is v0.4.0-devel3 (2023-04-03, 3.5 years old), README's "Stable" is v0.3.4 from the same day, the nightly moves daily. The rule is scoped to all three builds by version string; if a v0.4.0 final appears, re-run V9, V10 and V22. Not re-measured: ble.sh versions between devel3 and the nightly.
- **Window cause is read, not instrumented.** F2 shows the copy-back in `restore-PS1`; the window edges (attach, first prompt) are consistent with all 18 matrix cells but no `ble-attach`-internal trace was taken.
- **Why Arch fires nothing for ocx on 0.3.4** is explained by the array default and `eval "$PROMPT_COMMAND"` (F8, `raw-run.sh`); the 0.3.4 source line was read, not stepped.
- **Whether `blehook PRECMD!=fn` is preferable to `-=; +=`** is style: `!=` keeps an existing position, `-=; +=` moves the hook to the end. Both fired in every order on the 0.4 builds.
- **`--attach=none` against `--noattach`**: the README documents the first; the harness uses the second; one cell per 0.4 build with `--attach=none` agrees (V21).
- **Windows PowerShell 5.1** is frozen; 7.4 reaches end of support 2026-11-10 (as stated in SH-EMIT-05's scope); R4, R6, R7, R11, R12 bind while either is in range.
- **Profile path on OneDrive-redirected hosts** was read from the known folder only; this host is not redirected, so a redirected Documents folder is argued from `about_Profiles`, not measured.
- **ConPTY harness** is homemade (`conpty_run.py`); elvish interactive behaviour was checked only for `rc.elv` loading.
- **No macOS or BSD host**: nothing here speaks for them.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://raw.githubusercontent.com/akinomyoga/ble.sh/master/README.md | README: `--attach=none`, `ble-attach` at end of bashrc, release list (lines 99, 398-424) | 2026-10-11 | primary: the documented attach pattern that defines the window |
| https://github.com/akinomyoga/ble.sh/wiki/Manual-%C2%A71-Introduction | Manual 1.2.2 `blehook` `(v0.4)` forms | 2026-10-11 | primary: `!=`, `-+=` semantics and the v0.4 boundary |
| https://api.github.com/repos/akinomyoga/ble.sh/releases | Release list: v0.4.0-devel3 Latest 2023-04-03, v0.3.4, nightly 2026-09-08 | 2026-10-11 | primary: which tag is latest |
| https://github.com/akinomyoga/ble.sh/releases/tag/v0.4.0-devel3 | tarball `ble-0.4.0-devel3.tar.xz`, `ble.sh:19659-19686` | 2026-10-11 | primary: the source of the discard |
| https://github.com/akinomyoga/ble.sh/releases/tag/v0.3.4 | tarball `ble-0.3.4.tar.xz`, `ble.sh:8548, 8866-8876, 13447-13449` | 2026-10-11 | primary: no blehook, `eval "$PROMPT_COMMAND"` |
| https://github.com/akinomyoga/ble.sh/releases/tag/nightly | `ble-nightly-20260908.tar.xz` (d81fd54), `ble.sh:22002-22030` | 2026-10-11 | primary: nightly counterpart |
| https://git.savannah.gnu.org/cgit/bash.git/tree/NEWS | bash NEWS item "ee. PROMPT_COMMAND: can now be an array variable" (5.1) | 2026-10-11 | primary: why element 0 only on 5.0 and 0.3.4's eval |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/register-argumentcompleter?view=powershell-7.6 | parameter sets incl. `NativeFallback` | 2026-10-11 | primary: 7.6 only |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/register-argumentcompleter?view=powershell-5.1 | 5.1 parameter sets | 2026-10-11 | primary: no `NativeFallback` |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_profiles?view=powershell-7.6 | profile paths, OneDrive note | 2026-10-11 | primary: F12 |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_environment_variables?view=powershell-7.6 | empty string allowed from 7.5 | 2026-10-11 | primary: F14 |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_character_encoding?view=powershell-7.6 | Out-File and `>>` UTF-16LE on 5.1, Add-Content default | 2026-10-11 | primary: F13 |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/add-content?view=powershell-7.6 | Add-Content | 2026-10-11 | primary: the recommended append |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/out-file?view=powershell-5.1 | `-Append` "may not match the encoding of the target file" | 2026-10-11 | primary: F13 |
| https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.commandinvocationintrinsics.locationchangedaction | `LocationChangedAction` | 2026-10-11 | primary: F11 |
| https://www.nushell.sh/book/configuration.html | config and data dirs, autoload, `--config-home` | 2026-10-11 | primary: F16 |
| https://api.github.com/repos/nushell/nushell/releases/tags/0.116.1 | 0.116.1, published 2026-10-04 | 2026-10-11 | primary: version tag |
| https://github.com/elves/elvish/blob/v0.21.0/pkg/shell/paths_windows.go | `defaultConfigHome = roamingAppData` (also `paths.go`, `paths_unix.go`) | 2026-10-11 | primary: rc.elv location |
| https://elv.sh/ref/command.html | `-rc` flag | 2026-10-11 | primary: test override |
| https://github.com/starship/starship/blob/d4d0459c5c24/src/init/starship.bash | `_ble_version -ge 400` with `blehook !=` | 2026-10-11 | exemplar code, line 90 |
| https://github.com/atuinsh/atuin/blob/56525ac6a7a9/.buildkite/scripts/install-blesh.sh | pins `0.4.0-devel3` | 2026-10-11 | exemplar code, line 5 |
| https://github.com/ocx-sh/ocx/blob/1727d6a15394/crates/ocx_setup/src/profiles.rs | no Windows branch for nu and elvish | 2026-10-11 | fleet code under test |

## Revision log

Proposed lines for `shell-emit.md › Revision log`, dated 2026-10-11 (this file edits no rule file). Decision: confirmed, scoped, or amended.

- SH-EMIT-24 (**amended, scoped**): the ble clause names the tagged v0.4.0-devel3 and nightly d81fd54 and bash 4.4.23 to 5.3.20; the discard is the `ble-attach`-to-first-prompt window; the branch is gated on `declare -F blehook`, not `BLE_VERSION`; `blehook PRECMD!=fn` allowed as the one-call form; v0.3.4 has no `blehook`, its `PROMPT_COMMAND` writes survive and only array element 0 runs. Why: F1 to F5, V9, V10.
- SH-EMIT-43 (**amended, scoped**): same gate and window for `blehook CHPWD`; `PROMPT_COMMAND` compare lost after attach on both 0.4 builds (D0/1), fires on 0.3.4. Why: F6.
- SH-EMIT-16 (**amended**): PowerShell line takes the path from the target interpreter's `$PROFILE.CurrentUserAllHosts` (7.x `Documents\PowerShell`, 5.1 `Documents\WindowsPowerShell`) and appends with `Add-Content`; `Out-File -Append`, `>>` and `AppendAllText` corrupt profiles; nu and elvish Windows targets follow R9 and R10. Why: F12, F13, F16.
- SH-EMIT-17 (**amended**): the nu path is read from `$nu.vendor-autoload-dirs`, not built; Windows `data-dir` is `%AppData%\nushell`, moved by `XDG_*`, not by `%APPDATA%`. Why: F16, V18. Pointer: SH-NU-07 in shell-alt-shells.md carries the matching text.
- SH-EMIT-18 (**amended**): byte-preserving, CRLF-aware editor; no awk or sed over user lines under Git Bash. Why: F15, V17.
- SH-EMIT-33 (**amended**): PowerShell completion registers the bare command name; read-back covers six spellings. Why: F10, V11.
- SH-EMIT-38 (**confirmed, Windows scope added**): elvish `rc.elv` is read through `XDG_CONFIG_HOME` or the Roaming known folder; ocx's `%HOME%\.config` is not read. Why: F16, V19. Pointer: no SH-ELV row names the location.
- SH-EMIT-39 (**confirmed**): `-NativeFallback` only on 7.6.6; a tool's registration hides the user's. Why: F10, V12.
- SH-EMIT-42 (**amended**): provider guard added; `[Delegate]::Combine` confirmed (4 of 4); assignment and `+=` red; 5.1 prompt wrapper confirmed. Why: F11, V13, V14.
- SH-EMIT-05, 06 (**confirmed**): empty `$env:X` kept on 7.6.6, unset on 7.4.7 and 5.1 (Windows host); base64 35 of 35 on all three. Why: F14.
- SH-EMIT-07 (**amended, scoped**): `ConvertFrom-Json` fails `datelike` on 7.4.7 and 7.6.6 only (5.1 35 of 35); `-DateKind` exists on 7.6.6, not 7.4.7. Why: F14, V16.
- Open question "ble.sh tagged release" (**closed**): the tagged Latest v0.4.0-devel3 matches the nightly; v0.3.4 documented separately. SH-NU-07 and SH-ELV rows: **pointer only**, not edited.
- Verdict item 8 text to follow: "the guarantee stops at ble.sh" becomes "scoped to v0.4.0-devel3 and nightly d81fd54, gate on `declare -F blehook`".
