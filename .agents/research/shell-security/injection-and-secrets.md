---
title: Secrets, environment import, PATH, locking, option and pattern injection, arithmetic reach (SH-SEC, W3-7 revised)
topic: shell security beyond quoting
agent: W3-7 security/injection-and-secrets
model: sonnet
date_researched: 2026-10-11
sources_count: 27
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/injection-and-secrets/
scope: >
  Covers rows M-E-04..M-E-07, M-C-20, M-D-07, M-D-15 and the two follow-ups of shell-expansion.md (option and pattern
  injection; arithmetic reach): secrets on argv and in traces, imported environment, PATH and NULL PATH, sourced
  config, `--` and pattern data, dynamic names and subscripts, locking and atomic replace, parallel output and waits, sudo-rs
  against sudo. Cites and does not restate SH-EXP-13 (eval), SH-EXP-16 (layers), SH-EXP-19 (validate before arithmetic),
  SH-CI-07/08 (GHA injection), SH-USER-06 (probe flock). Not covered: destructive-command guards (M-E-01, M-E-02, M-E-08),
  PowerShell security (PS-SEC), macOS/BSD behaviour (no host: every such claim is marked "unverified: read only").
---

# Secrets, environment import, PATH, locking, option and pattern injection, arithmetic reach

Dated 2026-10-11. Every `bash`, `dash`, `ash`, `sudo` version below was run through `matrix.sh` or Docker on this host unless it says
"read only". Fixture directory: `~/.cache/research-lang/shell-tools/fixtures/injection-and-secrets/` (abbreviated `FX/`).
Fleet = the 230 files that SH-GATE-09 discovery returns over the fleet repos with the audit's exclusions (`FX/out-fleet-files.txt`);
the audit's 213 "authored" files are a subset by its classifier.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. Secrets on argv
   2. Secrets in traces (`set -x`)
   3. Environment import: `BASH_ENV`, `ENV`, `SHELLOPTS`, `BASH_FUNC_*`
   4. PATH, NULL PATH and `.` sourcing
   5. Sourced and eval'd config
   6. Option injection and `--`
   7. Pattern injection
   8. Arithmetic and dynamic-name reach
   9. Locking, atomic replace, temp files
   10. Parallel output and waits (M-C-20)
   11. sudo-rs against sudo (M-D-15)
   12. Fleet measurement
   13. Reported defects
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- A secret on argv is readable by every local user: `/proc/<pid>/cmdline` is mode 0444 and `ps -o args=` prints it; curl blanks `-u` only after start-up and says so itself. Use `curl -H @file`, `curl -K -`, `docker login --password-stdin`; `/proc/<pid>/environ` is 0400 (owner and root only) (ran: `FX/secret-argv.sh`, `FX/cross-uid.sh`).
- `hidepid=2` on `/proc` hides other users' `cmdline` entirely, but it is a host mount option a script cannot rely on (ran: `FX/out-cross-uid.txt`).
- `set -x` prints the expanded token on all 11 POSIX-family shells and on `export API_TOKEN="$TOKEN"`; the only working bracket is `{ set +x; } 2>/dev/null` before and `set -x` after (ran 11/11). `BASH_XTRACEFD` only moves the trace, the file still holds the token.
- bash honours `BASH_ENV` for any non-interactive run, including `bash --noprofile --norc -e -o pipefail script` (the GitHub Actions default); bash named `sh`, `--posix`, dash, ash, mksh, ksh93, yash, posh and zsh `--emulate sh` all ignore it. `ENV` is never read non-interactively on any of the 11. Scrub at the invoker with `env -u BASH_ENV -u ENV`; an `unset` inside the script is too late (ran 8/8 bash).
- zsh reads `$ZDOTDIR/.zshenv` for every invocation, scripts included; fish reads `config.fish` unless `--no-config`; nu 0.105.1 and 0.116.0 ignored `XDG_CONFIG_HOME/nushell/config.nu` for a script file (ran).
- `SHELLOPTS=xtrace PS4='$(cmd)'` in the environment runs `cmd` in a child bash script: as root on 3.2, 4.0, 4.2; as non-root (uid 1000) on 3.2, 4.2, 4.4, 5.0, 5.2, 5.3; root ignores an imported PS4 from 4.4 (ran root on 8 versions, uid 1000 on 6).
- An exported `BASH_FUNC_ls%%` function replaces `ls` in a child bash on 3.2-5.3; `bash -p` and `sudo` drop it. `GLOBIGNORE` imported from the environment is NOT honoured on 3.2-5.3, `CDPATH` and `POSIXLY_CORRECT` are, `IFS` is not.
- NULL PATH: an empty or unset-then-empty `PATH` searches the current directory on 3.2-5.3 alike; bash 5.3 NEWS item p ("Treat a NULL value for $PATH as equivalent to \".\"") codifies it. 5.2 and 5.3 differ only in `command -v`/`type` output (`TMP/planted` against `./planted`) and the not-found text. `unset PATH` still searches cwd on bash and busybox ash, not on dash, mksh, ksh93, yash, posh, zsh (ran).
- `PATH="$d:$PATH"` with an empty inherited `PATH` leaves a trailing empty entry (cwd) on all 11 shells and bash 3.2-5.3; `PATH="$d${PATH:+:$PATH}"` does not (ran).
- `. lib.sh` (no slash) falls back to the cwd when PATH has no hit on every bash 3.2-5.3 (non-posix), busybox ash 1.37, yash 2.52 and `bash 3.2 --posix`; dash, ash 1.35, mksh, ksh93, posh, `bash 5.2 --posix` and zsh refuse. Write `. ./lib.sh` or `. "$dir/lib.sh"`.
- A config file another user can write must never be `.`-sourced or `eval`ed; `read` plus a `case` allow-list parses it (plant exit 1, twin exit 0 on dash and bash).
- `--` is honoured by every tool tested on GNU coreutils 9.4, uutils 0.2.2, busybox 1.37 (rm, cp, mv, ln, mkdir, touch, cat, head, sort, grep, tar, find, env, sed) except busybox `realpath` (treats `--` as a file). `printf '-x\n'` is an error on dash, bash, yash and ksh93u+m 2023; `printf '%s\n' "$x"` is safe everywhere. curl's `--` does not stop further URLs (OWASP).
- Option injection still executes code on current tools: `ssh -oProxyCommand=…` (OpenSSH 10.0p2), `git ls-remote --upload-pack=…` (git 2.54.0), GNU tar `--checkpoint-action=exec=…` from a `*` glob (tar 1.35), `rm *` with a file named `-rf` (ran, red/green).
- ShellCheck 0.11.0 default catches `rm *`/`tar *` (SC2035), unquoted case patterns (SC2254), `[[ == $x ]]` (SC2053), `${v##$p}` (SC2295), `find -exec sh -c "…{}…"` (SC2156); it is silent, even at `--enable=all`, on `grep "$q"`, `git ls-remote "$u"`, `ssh "$h"`, `curl -H "…$TOKEN"`, `set -x` near a token, arithmetic on `$1` and `[ -e lock ] || touch lock`.
- Arithmetic reach is wider than SH-EXP-19 lists: `read -r "$k"`, `declare "$k=v"`, `${!k}`, `printf -v "$k"` (4.2+) and `[[ -v $k ]]` (4.4+) also execute `a[$(cmd)]` on bash; `[ "$x" -eq 1 ]` does not. Bash 5.3 `shopt -s array_expand_once` stops only `let`, `printf -v`, `read`; `(( ))`, `$(( ))`, `[[ -eq ]]`, `declare -i`, `arr[$x]` still execute (ran 8 versions).
- Locks: `mkdir`, `set -C` (noclobber) and `ln` give exactly one winner of 30 on 10 of 11 shells; test-then-create gives 8-30 winners per round. posh 0.14.1 corrupts its own builtin arguments under 30 concurrent busy-wait subshells (4 of 4 runs) so its lock test needs N<=6. Taking over a stale `mkdir` lock is racy even with an `mv`-aside (1-7 winners per round, 3 shells): do not auto-break.
- Atomic replace needs a temp file in the target's directory and `mv -f`; `cat >f` gave a partial read in 52-66 of ~100 reads and `mv` across filesystems (`/dev/shm` to `/tmp`) gave 4-7 of ~190 (ran 3 times each); same-directory `mv` gave 0 of ~180 in 3 runs.
- `xargs -P8` with a two-`printf` job interleaves 400 of 400 lines on GNU findutils 4.9/4.10 and busybox 1.37; one `printf` per record gives 0 (ran). `wait -n` is absent on bash 3.2, 4.0, 4.2 and takes a PID list only from 5.1; bare `wait` returns 0 even when a job failed.
- sudo-rs 0.2.8 (Ubuntu 25.10) and 0.2.13 (26.04) ignore bare `-E` and `--preserve-env` with a warning (exit status unchanged); `--preserve-env=VAR`, `-n`, `-S`, `--` behave like sudo 1.9.15; the denial messages differ (`a password is required` against `interactive authentication is required`), so key off exit codes.

## Findings

### 1. Secrets on argv

**Linux (ran).** In a container, process owner uid 1000 holding a secret both on argv and in the environment, observer uid 1001 reading `/proc`
(`FX/cross-uid.sh`, `FX/out-cross-uid.txt`):

```text
mount: proc /proc proc rw,nosuid,nodev,noexec,relatime 0 0
cmdline mode: 444 ubuntu  environ mode: 400 ubuntu
observer-cmdline: sh -c sleep 30; echo argvsecret
sh: 1: cannot open /proc/7/environ: Permission denied
```

With `mount -o remount,hidepid=2 /proc` the observer cannot even open `/proc/<pid>/cmdline` (`No such file`). The kernel man page: `hidepid=1`
protects "sensitive files such as /proc/pid/cmdline" against other users, "since Linux 3.3", default `0` ([proc(5)](https://man.archlinux.org/man/proc.5)).
CWE-214 names the weakness: "A process is invoked with sensitive command-line arguments, environment variables … that can be seen by other processes"
([CWE-214](https://cwe.mitre.org/data/definitions/214.html)). Environment is safer than argv against other users (0400) but not against the same uid, root, or every child.

**The plant leaks, the twins do not (ran, `FX/secret-argv.sh`, a local listener confirms the server really received the header each time):**

```text
### plant       LEAK /proc/2538789/cmdline: curl -s --max-time 5 -H Authorization: Bearer s3cr3t-T0KEN-abc123 http://127.0.0.1:35105/
                LEAK ps -o args= -p 2538789        server received header: yes     exit 1
### twin-file   server received header: yes   exit 0     # curl -H @"$w/hdr"
### twin-stdin  server received header: yes   exit 0     # printf 'header = "…"' | curl -K -
### twin-hstdin server received header: yes   exit 0     # printf 'Authorization: …' | curl -H @-
```

curl documents all three: "This option can take an argument in @filename style … Using @- makes curl read the header file from stdin" and
"Specify the filename to --config as minus "-" to make curl read the file from stdin" ([curl manpage](https://curl.se/docs/manpage.html)); the
`@filename`/`@-` form is dated 7.55.0 in the option source ([header.md](https://github.com/curl/curl/blob/master/docs/cmdline-opts/header.md)).
curl's own `-u` text: "curl hides the given option argument from process listings. This is not enough … they are still visible for a moment before being cleared"
(same manpage). Measured on curl 8.15.0: a probe 1 s after start saw `curl -s --max-time 5 -u *************` (`FX/out-curl-u.txt`), so the window is the start-up moment, not the whole run.

```bash
# wrong: token on argv, visible in ps and /proc/<pid>/cmdline
curl -H "Authorization: Bearer $TOKEN" "$url"
# right: header via stdin, nothing on argv (curl >= 7.55.0 for -H @-; -K - older)
printf 'header = "Authorization: Bearer %s"\n' "$TOKEN" | curl -K - "$url"
docker login ghcr.io -u "$user" --password-stdin <"$pwfile"
```

**Windows (ran, WinPS 5.1 on the host).** A same-user, non-elevated process read another process's full command line through `Get-CimInstance Win32_Process`
(`FX/win-argv.ps1`): `"C:\WINDOWS\System32\cmd.exe" /c ping -n 6 127.0.0.1 & rem --token=s3cr3t-T0KEN`. Cross-user visibility was not measured (no second account).
**macOS: unverified: read only.** `ps` argument visibility for other users was not run.

Fleet: 2 authored hits, `www-setup@a251c3631047:scripts/gen-dist.sh:174` (`set -- "$@" -H "Authorization: Bearer ${GITHUB_TOKEN}"` handed to `curl`) and
`ocx@795719f6b54d:test/manual/announce-e2e/scripts/run_sequence.sh:178` (`-H "Authorization: Bearer $E2E_REG_TOKEN"`); both are CI/test-time and short-lived, neither is a
shipped installer. Repair: `printf 'header = "Authorization: Bearer %s"\n' "$GITHUB_TOKEN" | curl -K - …`.

### 2. Secrets in traces (`set -x`)

Ran `FX/xtrace-leak.sh` on the 11-shell POSIX family (`FX/out-xtrace.txt`). Identical on all 11 unless noted:

```text
plain=LEAK  set+x-around=ok  brace-2>/dev/null=ok  export-line=LEAK  printf-builtin-pipe=LEAK  stdin-read=ok      (ksh93u+m 2023 and 1.0.10: stdin-read=LEAK)
```

- `set -x; true "Bearer $TOKEN"` leaks; `export API_TOKEN="$TOKEN"` leaks (assignments are traced after expansion); a `printf '%s\n' "$TOKEN" | cat` leaks.
- `{ set +x; } 2>/dev/null` before the secret line and `set -x` after it leaks nothing. Plain `set +x` also hides later lines but the `set +x` line itself is traced harmlessly.
- `BASH_XTRACEFD` (bash 4.1+; `exec {fd}>` does not parse on 3.2 and 4.0) redirects the trace away from stderr, but the file it writes holds the token (`stderr=ok`, `xtracefd-file=has-token` on 4.2-5.3, `FX/xtrace-fd.bash`). It is a way to keep traces out of CI logs, not a redaction.
- fish: `set -g fish_trace 1` prints the expanded value of an environment variable on fish 3.6.0, 4.0.2, 4.7.0 and 4.9.3 (`fish_trace + env var = LEAK`); `set -e fish_trace` before the line stops it (`FX/fish-trace.fish`).
- PowerShell: `Set-PSDebug -Trace 2` printed source text only (`DEBUG: 3+ … $x = "Bearer $($env:T)"`), never the value, on 5.1, 7.4 and 7.6.6 (`FX/ps-trace.ps1`). Hand-off to PS-SEC.

`rbenv`/`pyenv` export a custom `PS4` and `set -x` under `RBENV_DEBUG`; that is the debug path, not a secret path. `k3s-io/k3s@82a6ddcd820b:install.sh:872` is a working model of the bracket: `killtree $({ set +x; } 2>/dev/null; getshims; set -x)`.

### 3. Environment import: `BASH_ENV`, `ENV`, `SHELLOPTS`, `BASH_FUNC_*`

**Which shells honour which startup variable non-interactively (ran: `FX/bash-env.sh` on posix, bash and zsh families, `FX/out-bash-env.txt`).** The script re-runs its own
interpreter as a child with the variable set to a payload file, for a script file and for `-c`:

| shell | `BASH_ENV` | `ENV` | `ZDOTDIR/.zshenv` |
|---|---|---|---|
| bash 3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3 (invoked as `bash`) | **HONOURED** (file and `-c`) | ignored | ignored |
| bash 3.2-5.3 invoked with argv0 `sh` (`FX/bash-as-sh.sh`) | ignored | ignored | n/a |
| bash 3.2 and 5.2 `--posix` | ignored | ignored | n/a |
| dash 0.5.12, busybox ash 1.35 and 1.37, mksh R59c, ksh93u+m (2023, 1.0.10), yash 2.52, posh 0.14.1 | ignored | ignored | n/a |
| zsh 5.9 `--emulate sh` | ignored | ignored | ignored |
| zsh 5.0.8, 5.3.1, 5.8, 5.9 (native) | ignored | ignored | **HONOURED** (file and `-c`) |

The bash manual: non-interactive bash "looks for the variable `BASH_ENV` in the environment, expands its value … and sources it"; "A non-interactive shell invoked with the name `sh` does not attempt to read any other startup files";
privileged mode (`-p`): "the `$BASH_ENV` and `$ENV` files are not processed, shell functions are not inherited from the environment, the `SHELLOPTS`, `BASHOPTS`, `CDPATH` and `GLOBIGNORE` variables, if they appear in the environment, are ignored"
([Bash reference manual](https://tiswww.case.edu/php/chet/bashref.html)). POSIX: `ENV` "when and only when an interactive shell is invoked, shall be subjected to parameter expansion" ([POSIX.1-2024 XCU 2.5.3](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)).
zsh: "Commands are first read from /etc/zshenv; this cannot be overridden" and `.zshenv` is read for every shell ([zsh manual 5.1](https://zsh.sourceforge.io/Doc/Release/Files.html), measured above).
fish 3.6.0, 4.0.2, 4.7.0, 4.9.3 loaded `$XDG_CONFIG_HOME/fish/config.fish` for a script file and ignored it with `--no-config`; nu 0.105.1 and 0.116.0 ignored `$XDG_CONFIG_HOME/nushell/config.nu` for a script file both with and without `--no-config-file` (`FX/fish-config.fish`, `FX/nu-config.nu`).

The GitHub Actions default shell line is `bash --noprofile --norc -e -o pipefail {0}`; `--noprofile --norc` do not stop `BASH_ENV` (ran `FX/bash-env-gha.sh`: `PAYLOAD-RAN` then `step-body` on 3.2 and 5.3; `env -u BASH_ENV` removes it). A step that appends `BASH_ENV=…` to `$GITHUB_ENV` therefore executes in every later bash step (SH-CI owns the workflow side).

**The defence is at the invoker, never inside the script.** `FX/bash-env-check.sh`: plant (child bash with `BASH_ENV` set) exit 1 on all 8 bash versions; twin (`env -u BASH_ENV -u ENV bash child.sh`) exit 0 on 8/8. The `unset BASH_ENV` that appears in `FX/tree-twin/envhijack.sh` is harmless but does nothing for that run: bash read `BASH_ENV` before the first line.
sudo's default `env_reset` builds a "new, minimal environment" and bash functions "are not preserved by default" ([sudoers(5)](https://www.sudo.ws/docs/man/sudoers.man/)); measured: `BASH_ENV=… sudo bash -c 'echo hi'` printed only `hi` on sudo 1.9.15p5 and sudo-rs 0.2.8/0.2.13, also with `-E`.

**Other imported variables (ran `FX/env-import.bash`, 8 bash versions, `FX/out-env-import.txt`; root in a container unless noted):**

| imported variable | effect in a child bash running a clean script |
|---|---|
| `SHELLOPTS=xtrace` + `PS4='$(touch CANARY)+ '` | as root, **code ran** on 3.2, 4.0, 4.2; from 4.4 root ignores the imported `PS4` ("no code ran"). **Non-root (uid 1000) ran code on 3.2, 4.2, 4.4, 5.0, 5.2, 5.3** (`FX/ps4-nonroot.sh`, `FX/out-ps4-nonroot.txt`; 4.0, 5.1 not run as non-root) |
| `BASH_FUNC_ls%%=() { echo HIJACKED-ls; }` | `HIJACKED-ls` on all 8; with `bash -p -c ls` the real `ls` ran |
| `BASH_FUNC_x%%=() { :; }; echo SHELLSHOCK` (the 2014 form) | refused: `warning: x: ignoring function definition attempt` on all 8 ([BashFAQ/111](https://mywiki.wooledge.org/BashFAQ/111)) |
| `POSIXLY_CORRECT=1` | child is in posix mode on all 8 |
| `BASHOPTS=xpg_echo` | `echo "a\tb"` printed a TAB on 4.2-5.3; literal on 3.2 and 4.0 (no BASHOPTS import) |
| `CDPATH=other` | `cd sub` landed in `other/sub` on all 8 (`cwd=/other/sub`) |
| `GLOBIGNORE=skip.txt` | **not honoured** on all 8 (`FX/globignore-env.sh`: `imported: child.sh keep.txt skip.txt`, `assigned: child.sh keep.txt`), although the manual's privileged-mode text implies an import path |
| `IFS=x` | not imported (`IFS` stays default) |

Fleet: no authored file exports `BASH_ENV`, `ENV`, `SHELLOPTS`, `BASHOPTS`, `POSIXLY_CORRECT`, `GLOBIGNORE` or `export -f` (check C03: 0 hits in the authored fleet; hits only under `external/bats-core`).

### 4. PATH, NULL PATH and `.` sourcing

POSIX: "A zero-length prefix is a legacy feature that indicates the current working directory", appearing as "::", an initial or a trailing colon; "A strictly conforming application shall use an actual pathname (such as `.`)" ([POSIX.1-2024 XBD 8.3](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap08.html)).
Bash 5.3 NEWS, first bash section, item p: "Treat a NULL value for $PATH as equivalent to ".".", and item kk adds `source -p PATH` ([bash 5.3 NEWS](https://git.savannah.gnu.org/cgit/bash.git/tree/NEWS?h=bash-5.3), local copy `FX/src/bash53-NEWS`, lines 46 and 113).

**Measured (`FX/null-path.sh`, `FX/out-null-path.txt`): `RAN-CWD` means the planted `./planted` ran.**

| form | dash | ash 1.35 / 1.37 | mksh | ksh93u+m | yash | posh | bash 3.2-5.3 | zsh 5.9 |
|---|---|---|---|---|---|---|---|---|
| `PATH=; planted` | RAN-CWD | RAN-CWD | RAN-CWD | not-found | RAN-CWD | RAN-CWD | RAN-CWD | RAN-CWD |
| `PATH= planted` (prefix) | RAN-CWD | RAN-CWD | RAN-CWD | not-found | RAN-CWD | RAN-CWD | RAN-CWD | RAN-CWD |
| `unset PATH; planted` | not-found | **RAN-CWD** | not-found | not-found | not-found | not-found | **RAN-CWD** | not-found |
| `PATH=:/usr/bin`, `/usr/bin:`, `/usr/bin::`, `.` | RAN-CWD | RAN-CWD | RAN-CWD | RAN-CWD | RAN-CWD | RAN-CWD | RAN-CWD | RAN-CWD |
| `PATH=/nonexistent planted` | not-found | not-found | not-found | not-found | not-found | not-found | not-found | not-found |

**5.2 against 5.3 (the brief's pin).** `FX/out-np52.txt` and `FX/out-np53.txt` are identical in execution: every row above is `RAN-CWD` on both. The only differences are cosmetic:
`PATH=''; command -v planted` prints `[TMP/planted]` on 5.2 and `[./planted]` on 5.3; `PATH=''; type planted` prints `planted is TMP/planted` on 3.2-5.2 and `planted is ./planted` on 5.3; and
`PATH=''; nosuchcmd` reports `No such file or directory` on 3.2-5.2 and `command not found` on 5.3 (`FX/null-path-source.sh`, `FX/out-null-path-source.txt`). `source lib.sh` found the cwd file with `PATH=''`, with `PATH` unset and in posix mode on all 8.
The NEWS item makes explicit what 3.2 already did; no version is "newly vulnerable".

**The empty-PATH prefix bug (ran `FX/path-prefix-empty.sh`, `FX/out-path-prefix.txt`).** `PATH=''; PATH="$d:$PATH"` → `RAN-CWD` on all 11 shells and bash 3.2-5.3; `PATH="$d${PATH:+:$PATH}"` → `not-found` on all.

**`.`/`source` with a bare name (ran `FX/dot-path.sh`, `FX/out-dot-path.txt`)** with `PATH=/usr/bin:/bin` and `lib.sh` only in the cwd:

| result | shells |
|---|---|
| sourced the cwd file (`RAN-CWD`) | bash 3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3 (non-posix); busybox ash 1.37; yash 2.52; bash 3.2 `--posix` |
| refused (`not found`) | dash 0.5.12, busybox ash 1.35, mksh R59c, ksh93u+m (both), posh 0.14.1, bash 5.2 `--posix`, zsh 5.9 `--emulate sh` |

POSIX says `.` without a slash "shall use the search path specified by PATH" and does not authorise a cwd fallback ([XCU 2](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html), dot utility, text in `FX/src/posix-ch2.html`). A planted `lib.sh` in the working directory therefore runs under bash and busybox 1.37 while dash refuses: portable code writes `./lib.sh` or `"$dir/lib.sh"`.

`command -p` and a guard: `FX/null-path-plant.sh` with inherited `PATH=:/usr/bin:/bin` (also `/usr/bin:` and `/usr/bin::/bin`): plant exit 1 (planted `./jq-absent` ran), `twin-guard` (`case ":$PATH:" in *::*|*:.:*) exit 78`) exit 78, `twin-p` (`command -p jq-absent`) exit 0.

Fleet: 0 authored hits for an empty, `.` or leading/trailing-colon `PATH` assignment (C04). Authored prefixes like `PATH="$TMP/bin:$PATH"` (`ocx@795719f6b54d:test/manual/announce-e2e/scripts/selfcheck_g2.sh:83`, `…/selfcheck_identity.sh:80`) are fine unless `PATH` can be empty, which grep cannot see.

### 5. Sourced and eval'd config

`FX/config-source.sh`: a config file containing `EVIL=$(touch CANARY)` and `RETRIES=3; touch CANARY2`. Plant `. ./conf` → `VIOLATION: config text executed` exit 1 on dash and bash. Twin parses with `while IFS='=' read -r k v … case $k in REGISTRY|RETRIES) … case $v in *[!A-Za-z0-9._:/-]*) …` → exit 0, `EVIL` ignored, `RETRIES=3; touch CANARY2` rejected as a bad value.
Models and violations in the corpus: `acmesh-official/acme.sh@807da6498377:acme.sh:3368,3481,3553` source `$_DEFAULT_ACCOUNT_CONF_PATH`, `$ACCOUNT_CONF_PATH`, `$CA_CONF` (by design, a per-user file under `$HOME`); `rbenv@07e9b1e297a5:libexec/rbenv-exec:39` sources hook scripts found through `RBENV_HOOK_PATH` (plug-in design: the trust boundary is the directory). The rule is about who can write the file, not about `source` itself: a file in a directory only the invoking user can write is the user's own code.
When a file must be sourced, check `[ -O "$f" ]`-style ownership and mode first (reading heuristic; no fixture). Fleet: 0 authored `source "$variable"` hits outside `external/` and the `ocx` doc scripts' `eval "$(ocx … --shell=bash)"` (SH-EXP-13's trusted emitter).

### 6. Option injection and `--`

OWASP: "Every OS Command Injection is also an Argument Injection"; `--` is the control, but "In curl … later arguments are still URL operands: `--` does not prevent additional transfers. Pass exactly one validated URL … and disable curl's URL globbing with `--globoff`" ([OWASP cheat sheet](https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.md)).
CWE-88 defines the class ("does not properly delimit the intended arguments, options, or switches", [CWE-88](https://cwe.mitre.org/data/definitions/88.html)); CWE-78 is the command-string sibling ([CWE-78](https://cwe.mitre.org/data/definitions/78.html)).
POSIX Utility Syntax Guideline 10: "The first `--` argument that is not an option-argument should be accepted as a delimiter indicating the end of options. Any following arguments should be treated as operands, even if they begin with the '-' character" ([XBD 12.2](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap12.html)).

**Ten injection vectors, plant and twin (ran `FX/optinj.sh`, host GNU tools, `FX/out-optinj-host.txt`).** Plant exit 1 with ten `HIT`; twin exit 0 with ten `ok`:

| vector | plant | twin |
|---|---|---|
| file named `-rf`, `rm *` | `rm-glob(-rf)=HIT` (the directory was deleted) | `rm -- *` or `rm ./*` |
| GNU tar 1.35, files `--checkpoint=1`, `--checkpoint-action=exec=touch CANARY`, `tar cf out.tar *` | `tar-wildcard=HIT` (canary created) | `tar cf out.tar -- ./*` |
| `grep "$q"` with `q=--version` | prints `grep (GNU grep) 3.12` | `grep -F -e "$q" -- f` |
| `grep -c "$q"` with `q='.*'` | matches every line | `-F` makes it literal |
| `case $s in $allow)` with `allow='*'` | matches anything | `case $s in "$allow")` |
| `[[ $s == $allow ]]` | matches anything | `[[ $s == "$allow" ]]` |
| `${s##$pre}` with `pre='*'` | strips everything | `${s##"$pre"}` |
| `git ls-remote "$u"`, `u='--upload-pack=touch CANARY'` (git 2.54.0) | `git-ls-remote(--upload-pack)=HIT` | `git ls-remote -- "$u" repo` |
| `ssh "$h" true`, `h='-oProxyCommand=touch CANARY'` (OpenSSH 10.0p2) | `ssh(-oProxyCommand)=HIT` | `ssh -- "$h" true` |

OpenSSH 9.6 added countermeasures for "programs that invoke ssh(1) with user or hostnames containing invalid characters" ([release notes 9.6](https://www.openssh.com/txt/release-9.6)); a leading `-` still reads as an option on 10.0p2, so `--` stays required.

**`--` support across userlands (ran `FX/dashdash.sh`, `FX/out-dashdash.txt`).** Images: Alpine 3.22 and busybox 1.37 (busybox 1.37.0), Ubuntu 24.04 (GNU coreutils 9.4, findutils, grep 3.11), Ubuntu 25.10 (uutils coreutils 0.2.2, findutils 4.10.0, GNU grep 3.11). For rm, cat, mkdir, touch, mv, cp, ln -s, ls, basename, dirname, readlink, wc, head, sort, sha256sum, chmod, tar, find, env, sed -e: `--` honoured and the dash-named file treated as data on all four images. Exceptions:

- busybox 1.37 `realpath -- -ln` printed `realpath: --: No such file or directory` (it treats `--` as a path); GNU 9.4 and uutils 0.2.2 accept it.
- `printf FORMAT` with a leading dash (`FX/printf-dash.sh`, `FX/out-printf-dash.txt`): `printf '-x\n'` errors on dash 0.5.12 (`Illegal option -x`), ksh93u+m 2023, yash 2.52 (`not a valid option`), bash 3.2-5.3 incl. `--posix`; prints `-x` on busybox ash, mksh, ksh93u+m 1.0.10, posh, zsh. `printf -- '-x\n'` and `printf '%s\n' '-x'` work everywhere.
- `grep --version` is an option: uutils images still use GNU grep 3.11; busybox grep reports `unrecognized option '--version'`.
- BSD/macOS `--` behaviour: **unverified: read only.**

ShellCheck 0.11.0 (default): `rm *` and `tar cf out.tar *` → SC2035 "Use ./*glob* or -- *glob* so names with dashes won't become options" (info). Silent, even with `--enable=all`, on `grep "$1" file`, `git ls-remote "$1" repo`, `ssh "$1" true`, `rm "$1"`: ShellCheck cannot know the variable's content, so the variable-operand rule is a grep plus review (`FX/out-sc.txt`, `FX/out-sc-all.txt`).
The ShellCheck wiki: "A file named `-f` … will not be deleted … `rm` will even report success", and for GNU tar "using `-- *` is a safer fix" because `./*` changes archived names ([SC2035](https://github.com/koalaman/shellcheck/wiki/SC2035)).

### 7. Pattern injection

`case`, `[[ == ]]` and `${v#pat}` treat an unquoted expansion on the right as a glob. ShellCheck 0.11.0 default flags all three: SC2254 "Quote expansions in case patterns to match literally rather than as a glob" (warning), SC2053 "Quote the right-hand side of == in [[ ]] to prevent glob matching" (warning), SC2295 "Expansions inside ${..} need to be quoted separately, otherwise they match as patterns" (info) (ran, plant 1 hit each, twin 0; `FX/sc/*`, [SC2254](https://github.com/koalaman/shellcheck/wiki/SC2254), [SC2053](https://github.com/koalaman/shellcheck/wiki/SC2053), [SC2295](https://github.com/koalaman/shellcheck/wiki/SC2295)).
Impact is allow-list bypass (`allow='*'` matches everything, see the table in section 6). For `grep`, `-F -e "$q" --` makes a data string literal and ends option parsing; for `sed` and `awk` programs built from data use the positional/`-v` forms of SH-EXP-16 instead of splicing.

### 8. Arithmetic and dynamic-name reach

SH-EXP-19 (cited, not restated) validates before `$(( ))`, `(( ))`, `let`, `declare -i`, subscripts and `[[ -eq ]]`. The follow-up asked which other contexts evaluate attacker text. `FX/arith.sh`, `x='a[$(touch CANARY)]'`, one `HIT` per context (`FX/out-arith-bash.txt`), plant exit 1 on 8/8, twin (`case $x in '' | *[!0-9]*)` first) exit 0 on 8/8:

| context | 3.2 | 4.0 | 4.2 | 4.4 | 5.0 | 5.1 | 5.2 | 5.3 |
|---|---|---|---|---|---|---|---|---|
| `$(( x + 1 ))`, `(( x > 1 ))`, `[[ $x -eq 1 ]]`, `[[ x -eq 1 ]]`, `let`, `declare -i y; y=$x`, `arr[$x]`, `$(( arr[x] ))` | HIT | HIT | HIT | HIT | HIT | HIT | HIT | HIT |
| `declare "$x=v"`, `read -r "$x"`, `${!k}` (indirection) | HIT | HIT | HIT | HIT | HIT | HIT | HIT | HIT |
| `printf -v "$x" %s v` | ok | ok | HIT | HIT | HIT | HIT | HIT | HIT |
| `[[ -v $x ]]` | ok | ok | ok | HIT | HIT | HIT | HIT | HIT |
| `[ "$x" -eq 1 ]`, `export "$x=v"`, `unset "$x"`, `printf %d "$x"` | ok | ok | ok | ok | ok | ok | ok | ok |

(`ok` = no canary; `printf -v` with a subscripted name is unsupported before 4.2, `[[ -v ]]` takes array elements from 4.4.)
**`array_expand_once` (bash 5.3) narrows, never closes.** `shopt -s assoc_expand_once` exists from 5.0, `array_expand_once` only on 5.3 (`FX/out-shopt-once.txt`). With the shopt on, 5.0-5.2 are unchanged and 5.3 turns `let`, `printf -v`, `read` to `ok` but `$(( ))`, `(( ))`, `[[ -eq ]]`, `declare -i`, `arr[$x]`, `[[ -v ]]`, `${!k}`, `declare "$x=v"` still `HIT` (`FX/arith-once.sh once`, `FX/out-arith-once.txt`).
The twin's positive control: `FX/arith-twin-ctl.sh 42` prints `accepted: 42 -> 43`; `a[$(touch CANARY)]` and `1+1` print `rejected` and create nothing on 3.2 and 5.3. Validation must reject `1+1` too if the value is meant to be one integer; `case … *[!0-9]*` does.
ShellCheck 0.11.0 stays silent on all of these (`FX/out-sc-all.txt`, `arith-plant`: only SC2250 style notes); issue 2679 "Warn about the use of unvalidated input in arithmetic contexts" has been open since 2023-02-01 ([#2679](https://github.com/koalaman/shellcheck/issues/2679)).
mksh R59c and posh 0.14.1 evaluate through `[ -gt ]` too, dash/ash/ksh93u+m/yash/zsh did not for this payload (SH-EXP-19, SE-9).

### 9. Locking, atomic replace, temp files

**Atomicity of the primitives (ran `FX/lock.sh`, 30 contenders released by a barrier, 5 rounds each; winners per round).** Excerpt, identical rows for dash, ash 1.35/1.37, mksh, ksh93u+m x2, yash, bash 3.2/5.2 `--posix`, zsh:

```text
naive     winners/round: 14 27 25 30 26        # [ -e lock ] || : >lock  (dash)
mkdir     winners/round: 1 1 1 1 1
noclobber winners/round: 1 1 1 1 1             # ( set -C; echo $i >lock )
ln        winners/round: 1 1 1 1 1             # ln go lock
lns       winners/round: 1 1 1 1 1             # ln -s go lock
```

`naive` gave 8-30 winners per round on every shell. posh 0.14.1: `mkdir`, `noclobber`, `ln` also 1 when the round completes, but with N=30 posh printed `wait: invalid option -- ','` and lost winners in 4 of 4 runs, and `rm: cannot remove 'lock': Is a directory` (its builtin/arguments are corrupted by 30 concurrent busy-wait subshells); with N=6 it passed 3 of 3 (`FX/lock-check6.sh`). shellspec carries the same history: "posh 0.10.2 workaround: uses mkdir instead of set -C" (`shellspec@f2d13f991885:lib/libexec/parallel-executor.sh:9-11`). `mkdir -p` is not a lock (it succeeds when the directory exists; BashFAQ/045).
BashFAQ/045: "We need an atomic check-and-create operation, and fortunately there is one: mkdir" and, for flock, "in POSIX fds >=3 may not get inherithed; doesn't work in ksh93" ([BashFAQ/045](https://mywiki.wooledge.org/BashFAQ/045)). NFS: not measured.

**flock (ran `FX/lock-flock.sh`, `FX/out-lock-flock.txt`).** Present: util-linux 2.39.3 (Ubuntu 24.04), 2.41 (25.10), busybox 1.37 `flock` (Alpine 3.22, busybox:1.37). Absent: Amazon Linux 2023 (`flock: ABSENT`), consistent with SH-USER-06 (also AL2, nixos/nix, Git Bash). `flock -n 9` gives 1 winner of 20, releases when the holder is `kill -9`ed, and **stays held when a background child inherits fd 9** after the parent exits (`STILL LOCKED`, all three present builds). macOS has no `flock` (read only); Homebrew carries a third-party `flock` 0.4.0 formula ([discoteq/flock via formulae.brew.sh](https://formulae.brew.sh/api/formula/flock.json)). The fleet model of the probe is `ocx-mirror@71bb1c2953ba:test/bazel_accept.sh:108-112` (`command -v flock … else echo "no flock(1) on this host - running unserialised"`).

**Stale-lock takeover is racy (ran `FX/lock-stale.sh`, 20 contenders, the holder SIGKILLed so `lock/` stays; winners per round, `FX/out-lock-stale.txt`).**

```text
Debian 12 dash:  naive takeover (rmdir; mkdir): 2 5 1 2 3 5     mv-aside takeover (mv lock lock.old.N; mkdir lock): 1 4 6 4 7 1
Alpine ash 1.37: naive: 5 5 6 6 6 4                              mv-aside: 6 6 3 3 6 5
bash 5.3:        naive: 3 7 5 6 5 3                              mv-aside: 7 5 6 4 4 5
```

Both recipes elect several owners because a slow contender can `mv` a lock a faster one just created. There is no safe shell-only takeover; the rule is to report the holder PID and exit, or use `flock`. (Contested: BashFAQ/045 links a "stale lock" remedy by Charles Duffy that was not run here.)

**Atomic replace (ran `FX/atomic.sh`, a writer swaps a 64 KiB all-`A` and all-`B` file 400 times, a reader snapshots it with one `cat`; `FX/out-atomic-runs.txt`).**

```text
plant        (cat new >"$f")                      exit 1 x3   reads≈100  torn=61, 66, 52
twin-mv      (tmp in same dir, then mv -f)        exit 0 x3   reads≈180  torn=0, 0, 0
twin-crossfs (tmp in /dev/shm, mv -f to /tmp)     exit 1 x3   reads≈185  torn=4, 7, 5
```

`mv` within a filesystem is `rename(2)`; across filesystems it is copy plus unlink and readers see partial files. BSD/macOS `mv` flags (`-T` is GNU only): unverified: read only.

**Temp files (BashFAQ/062; ran `FX/tmp-predictable.sh`).** `mktemp` creates mode 600 files (GNU, busybox 1.37 `-rw-------`, uutils 0.2.2) and 700 directories. With uid 1001 pre-creating `/tmp/app.123` mode 666 and uid 1000 writing a secret to it, the write was refused (`Permission denied`) because `fs.protected_regular=1` and `fs.protected_symlinks=1` on this kernel; on a kernel with both set to 0 the predictable name is exploitable (not measured, so this is a hardening note, not a red/green). The fixed-name check C10 stays grep-level. BashFAQ/062: "The creation of a temporary file name will typically involve the use of a pseudorandom number generator"; `mktemp` is the answer where present ([BashFAQ/062](https://mywiki.wooledge.org/BashFAQ/062)).

### 10. Parallel output and waits (M-C-20)

**`xargs -P` interleaving (ran `FX/xargs-par.sh`, 400 jobs at `-P8`, `FX/out-xargs2.txt`):**

```text
Ubuntu 24.04 (GNU findutils)  plant: lines=400 malformed=400 VIOLATION  exit 1     twin: lines=400 malformed=0 exit 0
Alpine 3.22 (busybox 1.37)    plant: lines=400 malformed=400 VIOLATION  exit 1     twin: lines=400 malformed=0 exit 0
Ubuntu 25.10 (findutils 4.10.0) plant: malformed=400 VIOLATION                    twin: malformed=0
```

The plant job prints its record in two `printf` calls (`A12-` then `B12\n`), so halves interleave in the shared pipe (`A1-A2-A3-…-B1`). The twin formats the whole line and prints it once; a single write below `PIPE_BUF` to a pipe is atomic. Per-job output files (`> "$dir/$n.out"`) or `xargs -n1 -P` with a single `printf` are the two fixes.
`xargs` exit statuses (ran `FX/xargs-status.sh`): one child failing → 123 (with and without `-P`); a child exiting 255 → `xargs: sh: exited with status 255; aborting`, exit 124 (GNU and busybox 1.37). `-r` is SH-USER-08.

**`wait` surface (ran `FX/wait-n.sh`, `FX/out-wait-n.txt`):**

| feature | 3.2 | 4.0 | 4.2 | 4.4 | 5.0 | 5.1 | 5.2 | 5.3 |
|---|---|---|---|---|---|---|---|---|
| `wait -n` | `invalid option` | `invalid option` | `invalid option` | ok | ok | ok | ok | ok |
| `wait -n` returns the finished job's status (`3` of `3 or 5`) | n/a | n/a | n/a | yes | yes | yes | yes | yes |
| `wait -n -p VAR` | n/a | n/a | n/a | `invalid option` | `invalid option` | ok | ok | ok |
| `wait -n PID` honours the PID list | n/a | n/a | n/a | **no (rc 0 from the other job)** | **no** | rc=7 (yes) | yes | yes |
| `wait "$pid"` returns the job's status (1 for `false &`) | yes | yes | yes | yes | yes | yes | yes | yes |
| bare `wait` after a failed job | rc 0 | rc 0 | rc 0 | rc 0 | rc 0 | rc 0 | rc 0 | rc 0 |

`wait -n` is dated 4.3 in bash's own NEWS (4.3 not in the matrix: read only); 4.2 lacks it, 4.4 has it. A macOS-bound script (bash 3.2) cannot use it. `find … -exec sh -c "…{}…" \;` is SC2156 ("Injecting filenames is fragile and insecure. Use parameters.", warning; ran, plant 1 hit, twin `sh -c 'rm -- "$1"' _ {}` 0 hits).

### 11. sudo-rs against sudo (M-D-15)

Ran `FX/sudo-flags.sh` and `FX/sudo-flags2.sh` as root in Docker (`useradd u`, sudoers `NOPASSWD: ALL`, then a password-required variant); sudo 1.9.15p5 (Ubuntu 24.04), sudo-rs 0.2.8 (25.10), sudo-rs 0.2.13-0ubuntu1.2 (26.04) (`FX/out-sudo-flags.txt`, `FX/out-sudo-flags2.txt`):

| invocation | sudo 1.9.15p5 | sudo-rs 0.2.8 / 0.2.13 |
|---|---|---|
| `sudo -n true` (NOPASSWD) | rc 0 | rc 0 |
| `sudo -n true` (password needed, no ticket) | rc 1, `sudo: a password is required` | rc 1, `sudo-rs: interactive authentication is required` (0.2.8) / `sudo: interactive authentication is required` (0.2.13) |
| `sudo -- true` | rc 0 | rc 0 |
| `MYVAR=1 sudo env` | `MYVAR` stripped (env_reset) | stripped |
| `sudo -E env` | `MYVAR` kept | **`warning: preserving the entire environment is not supported, '-E' is ignored`**, `MYVAR` stripped, command still runs |
| `sudo --preserve-env env` | kept | same warning, stripped |
| `sudo --preserve-env=MYVAR env` | kept | kept |
| `sudo MYVAR=2 env` (sudoers allows) | `MYVAR=2` visible | visible |
| `echo pw \| sudo -S -p '' true` | rc 0 | rc 0 |
| `echo pw \| sudo -S true` | prompt `[sudo] password for u:` | prompt `[sudo: authenticate] Password:` |
| wrong password with `-S` | rc 1, `Sorry, try again.` | rc 1, `Authentication failed, try again.` |
| `BASH_ENV=… sudo bash -c 'echo hi'` (also with `-E`) | `hi` only | `hi` only |

The sudo-rs README: "Some functionality is not supported … This includes `sudo -E`, which is discouraged in original sudo" ([sudo-rs README](https://github.com/trifectatechfoundation/sudo-rs)); its CHANGELOG 0.2.7 (2025-07-01) adds "`--preserve-env=VAR` is now supported" and 0.2.2-0.2.5 add `SETENV:`/`sudo VAR=value command` ([CHANGELOG](https://github.com/trifectatechfoundation/sudo-rs/blob/main/CHANGELOG.md)).
Whether a stock Ubuntu 25.10+ install makes sudo-rs the default `sudo` is unverified here (platform-matrix.md); in the Docker image, installing `sudo-rs` made `/usr/bin/sudo` resolve to it via `update-alternatives` while `/usr/bin/sudo.ws` stays the classic binary.
`oils-for-unix/oils@57d3f0d088c3:deps/podman.sh:30` is the corpus's own `sudo -E podman login … --password-stdin`: the stdin form is right, the `-E` would silently do nothing under sudo-rs.

### 12. Fleet measurement

`FX/fleet-extra.sh` lists 230 files (133 ocx, 21 www-setup, 12 grimoire-lore, 11 grimoire, 9 creeptd-ng, 8 setup-grimoire, 7 each rules_ocx, oras-www, grimoire-duo, …) with the audit's exclusions plus `external/`, `.agents/`, `.claude/`. `FX/sec-checks.sh` s01-s08 and the greps below, run read-only (`FX/out-fleet2/*.txt`):

| check | authored-fleet result |
|---|---|
| tokens on argv (C01) | 2: `www-setup@a251c3631047:scripts/gen-dist.sh:174`, `ocx@795719f6b54d:test/manual/announce-e2e/scripts/run_sequence.sh:178` (2 more hits in `ocx/.claude/artifacts/e1_check.sh:15`, `e2a_source.sh:9` are agent scratch, excluded) |
| `set -x` near token variables (C02) | 0; 0 authored `set -x` or `-x` shebang at all |
| startup variables exported, `export -f` (C03) | 0 (4 hits all under `external/bats-core`) |
| PATH with empty/`.` entry (C04) | 0 |
| `.`/`source` of bare name or variable (C05) | 0 outside `external/` |
| test-then-create locks (C06) | 0; 1 flock use, probed (`ocx-mirror/test/bazel_accept.sh:108-112`) |
| dynamic names (C07) | 0 authored |
| `rm`/`mv`/`ssh`/`git clone` with glob or `$1` and no `--` (C08) | 0 authored |
| `sudo -E` (C09) | 0; 0 authored `sudo` |
| predictable `/tmp` names (C10) | 1: `oras-www/scripts/vale-accept.sh:23` `TEMP_FILE="/tmp/vale-words-$$.txt"`; 40 of 230 files use `mktemp` |
| `wait -n`, bare `wait`, `xargs -P` (C11, C12) | 0, 0, 0 |
| arithmetic on external text | 0: every `$(( ))`/`(( ))`/`[[ -eq ]]` site in the 230 files is a loop counter, a size, `$?`, `$#` or `SECONDS` (e.g. `index@9eba2cc3929b:scripts/smoke-test.sh:162,171,173`, `www-setup@a251c3631047:src/install.sh:380-381`) |
| `eval` | `grimoire:docs/theme_check.sh:26` `eval "$2"` (SH-EXP-13), `ocx:test/doc_scripts/*` `eval "$(ocx self activate …)"` (trusted emitter) |

The fleet is clean of the named hazards because it has little security-sensitive shell: 133 of 230 files are ocx doc-snippet and manual-test scripts.

### 13. Reported defects (never fixed, owner Q6)

- `www-setup@a251c3631047:scripts/gen-dist.sh:174`: `GITHUB_TOKEN` as a `-H` argument of `curl`. Reproducer: `FX/secret-argv.sh plant` (same shape). Repair: `-K -` or `-H @-`.
- `ocx@795719f6b54d:test/manual/announce-e2e/scripts/run_sequence.sh:178`: `E2E_REG_TOKEN` on `curl` argv, same repair.
- `oras-www:scripts/vale-accept.sh:23`: predictable `/tmp/vale-words-$$.txt`; `mktemp` repair; the kernel protections of section 9 reduce but do not remove it.
- None in `ocx_shell`/`ocx_setup` for the topics of this file; the emitter is SH-EMIT's.

## Normative guidance candidates

IDs are placeholders for the consolidation (`SH-SEC-nn`). "RUN" states whether the verification went red on a planted violation and green on its twin; the fixture is under `FX/`.
A grep prints the violation: **empty output = pass**. Commands run with the directory as cwd and `.` as the operand; judge by output, not exit status (`xargs` exits 123 when its child grep matched nothing). Extensionless scripts need SH-GATE-09 discovery instead of `--include`.

**SEC-01 (MUST) Never put a secret on argv.** Pass tokens, passwords and header values on stdin or from a 0600 file: `curl -K -`, `curl -H @file` / `-H @-` (curl 7.55.0+), `docker login --password-stdin`, `--token-file`. Environment variables are the fallback, never `-H "…$TOKEN"`, `-u "$u:$p"`, `--password "$p"`.
- Why: `/proc/<pid>/cmdline` is 0444 and `ps` prints it; curl's own blanking leaves a start-up window; Windows `Win32_Process` shows it to a same-user process.
- Verify: C01 — `grep -rnE --include='*.sh' --include='*.bash' -e '(-H|--header)[ =]+.?(Authorization|Proxy-Authorization|X-[A-Za-z-]*(Token|Key|Secret))[^|#]*[$]' -e '[[:space:]](-u|--user)[ =]+.?[$][{]?[A-Za-z_]*(USER|user|PASS|pass|KEY|key|TOKEN|token|SECRET|secret|email)' -e '--(password|token|secret|api-key|client-secret)[ =]+.?[$]' -e 'docker login[^|#]*(-p|--password)[ =]+.?[$]' .`
- RUN: yes. `FX/final-checks.sh` C01: plant 4 lines, twin 0; runtime proof `FX/secret-argv.sh plant` exit 1 (LEAK in `/proc/<pid>/cmdline` and `ps`), twins `file`, `stdin`, `hstdin` exit 0 with "server received header: yes".

**SEC-02 (MUST in a file that handles secrets) No `set -x`/`-o xtrace`/`bash -x` shebang where a secret variable is expanded; when a trace is wanted, bracket the secret line.** `{ set +x; } 2>/dev/null` before it, `set -x` after; fish: `set -e fish_trace` first.
- Why: xtrace prints the expanded value, including `export NAME="$TOKEN"` and `printf … | …`; `BASH_XTRACEFD` only relocates the trace.
- Verify: C02 — `grep -rlE --include='*.sh' --include='*.bash' -e '^[[:space:]]*set[[:space:]]+(-[a-z]*x|-o[[:space:]]+xtrace)' -e '^#!.*[[:space:]]-[a-z]*x([[:space:]]|$)' . | xargs -r grep -nHE -e '[$][{]?[A-Za-z_]*(TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|CREDENTIAL)'` (file-level: reading decides whether the brace bracket is present).
- RUN: yes. C02 plant 1 line, twin 0; `FX/xtrace-run.sh plant` exit 1 on 11/11 POSIX-family shells, `twin-brace` and `twin-off` exit 0 on 11/11.

**SEC-03 (SHOULD) Temp files come from `mktemp`/`mktemp -d`, under `umask 077`, removed by a `trap`; no `/tmp/name.$$`, `/tmp/name.$RANDOM` or fixed `/tmp/name`.**
- Why: predictable names allow pre-creation; `mktemp` makes mode 600/700 files on GNU, busybox 1.37 and uutils 0.2.2. Modern kernels (`fs.protected_regular=1`) blunt but do not remove the risk.
- Verify: C10 — `grep -rnE --include='*.sh' --include='*.bash' -e '/tmp/[A-Za-z0-9_.-]*[$][$]' -e '/tmp/[A-Za-z0-9_.-]*[$][{]?RANDOM' -e '>[[:space:]]*/tmp/[A-Za-z0-9_.-]+' .`
- RUN: yes for the grep (plant 3 lines, twin 0); the exploit itself did not fire on this kernel (`FX/out-tmp.txt`), so no runtime red.

**SEC-04 (MUST for scripts that run under sudo, cron, a CI step or a setuid wrapper) Scrub the environment at the invoker and never export startup-altering variables.** Invoke as `env -u BASH_ENV -u ENV bash script` (or `env -i PATH=/usr/bin:/bin HOME="$HOME" bash script`); never `export BASH_ENV`, `ENV`, `SHELLOPTS`, `BASHOPTS`, `PS4`, `POSIXLY_CORRECT`, `CDPATH`, `GLOBIGNORE` or `export -f` in a script that spawns children. An `unset BASH_ENV` inside the script does nothing for that run.
- Why: bash 3.2-5.3 sources `BASH_ENV` for every non-interactive run including `--noprofile --norc`; `SHELLOPTS`+`PS4` runs a command substitution for non-root on every version; `BASH_FUNC_name%%` replaces commands. dash, ash, mksh, ksh93, yash, posh and bash-as-`sh` ignore `BASH_ENV`; zsh reads `.zshenv` always.
- Verify: C03 — `grep -rnE --include='*.sh' --include='*.bash' -e '^[[:space:]]*(export[[:space:]]+)?(BASH_ENV|ENV|SHELLOPTS|BASHOPTS|PS4|POSIXLY_CORRECT|CDPATH|GLOBIGNORE)=' -e '^[[:space:]]*export[[:space:]]+-f[[:space:]]' .` (a debug-only `export PS4=` guarded by a debug flag, as in rbenv, is a documented false positive); runtime: `matrix.sh bash FX/bash-env-check.sh plant|twin`.
- RUN: yes. C03 plant 4 lines, twin 0; `bash-env-check.sh plant` exit 1 on 3.2-5.3 (8/8), `twin` exit 0 (8/8).

**SEC-05 (MUST) PATH never gets an empty, `.` or relative entry, and a security-sensitive script does not trust an inherited PATH.** Extend with `PATH="$d${PATH:+:$PATH}"`; at the top of a hardened script set `PATH=/usr/bin:/bin` (or guard `case ":$PATH:" in *::*|*:.:*) exit 78;; esac`); call standard tools through `command -p` where PATH is hostile.
- Why: a NULL PATH is cwd on 3.2-5.3 (5.3 NEWS item p states it), `unset PATH` still searches cwd on bash and busybox ash, and `PATH="$d:$PATH"` with an empty PATH leaves a trailing empty entry on all 11 shells.
- Verify: C04 — `grep -rnE --include='*.sh' --include='*.bash' -e '(^|[^A-Za-z_])PATH=.?:' -e '(^|[^A-Za-z_])PATH=.?[.](:|[^A-Za-z0-9_/.-]|$)' -e '(^|[^A-Za-z_])PATH=.?[^[:space:]]*(::|:[.](:|[^A-Za-z0-9_/.-]|$)|:.?($|[[:space:];]))' .`; runtime `FX/null-path-plant.sh`.
- RUN: yes. C04 plant 4 lines, twin 0; `env PATH=:/usr/bin:/bin FX/null-path-plant.sh plant` exit 1 (also `/usr/bin:` and `/usr/bin::/bin`), `twin-guard` exit 78, `twin-p` exit 0. The empty-inherited-PATH prefix bug is invisible to grep (reading heuristic: every `PATH="$x:$PATH"` should read `${PATH:+:$PATH}`).

**SEC-06 (MUST) `.` and `source` name a path: `. ./lib.sh` or `. "$dir/lib.sh"`, with `dir` resolved from `$0`.** Never a bare name, never a variable that carries a bare name.
- Why: `. lib.sh` falls back to the cwd on bash 3.2-5.3, busybox ash 1.37, yash 2.52 and `bash 3.2 --posix`; dash, ash 1.35, mksh, ksh93, posh refuse, so the bug hides on Debian CI.
- Verify: C05 — `grep -rnE --include='*.sh' --include='*.bash' -e '^[[:space:]]*(\.|source)[[:space:]]+.?[A-Za-z_][^/[:space:]"]*.?[[:space:]]*(#.*)?$' -e '^[[:space:]]*(\.|source)[[:space:]]+"?[$][{]?[A-Za-z_][A-Za-z_0-9]*[}]?"?[[:space:]]*(#.*)?$' .` plus `matrix.sh posix FX/dot-path.sh` for the dynamic form.
- RUN: yes. C05 plant 3 lines, twin 0; `dot-path.sh` shows `RAN-CWD` on 8 bash + ash 1.37 + yash + bash 3.2 `--posix`.

**SEC-07 (MUST) Never `.`, `source` or `eval` a file another principal can write; parse `KEY=VALUE` with `read` and a `case` allow-list.**
- Why: sourcing runs every `$(…)` and `;` in the file; `case $k in KNOWN) …;; esac; case $v in *[!A-Za-z0-9._:/-]*) reject;; esac` accepts only data.
- Verify: C05 finds the sourcing sites; the reading heuristic is "who can write the directory or file?" (a path under `$HOME` of the invoking user is the user's own code). Runtime: `FX/config-source.sh plant|twin`.
- RUN: yes. `config-source.sh plant` exit 1 on dash and bash (`VIOLATION: config text executed`), `twin` exit 0 on both (`ignored key: EVIL`, `bad value for RETRIES`).

**SEC-08 (MUST) A data operand never reaches an option position: `--` before variable operands, `./` before globs, `-F -e PATTERN --` for grep, `printf '%s\n' "$x"` for text.** Applies to `rm mv cp ln chmod chown tar ssh scp rsync git` and every tool that takes a file, host or URL from data; `ssh -- "$host"`, `git clone -- "$url"`; curl needs `--globoff` and exactly one validated URL.
- Why: ran red for `rm *` with `-rf`, GNU tar `--checkpoint-action=exec`, `git ls-remote --upload-pack`, `ssh -oProxyCommand`, `grep --version`; `--` is honoured by GNU 9.4, uutils 0.2.2 and busybox 1.37 for 20 tools, except busybox `realpath` and a dash/bash/yash `printf` format.
- Verify: C08 — `grep -rnE --include='*.sh' --include='*.bash' -e '(^|[;&|(]|then |do )[[:space:]]*(rm|mv|cp|chmod|chown|tar|ln)[[:space:]]+([^|;&#]*[[:space:]])?(\*([[:space:]]|$)|"[$](\{?[0-9]+\}?|[@*])"([[:space:]]|$))' -e '(^|[;&|(])[[:space:]]*(ssh|scp|rsync)[[:space:]]+"?[$]\{?[A-Za-z_0-9@*]+\}?"?[[:space:]]' -e 'git (clone|ls-remote|fetch|pull) +"?[$][{A-Za-z]' . | grep -v -e ' -- ' -e 'sec-ok:'` and ShellCheck SC2035 (default, `-S style`). Named-variable operands (`rm "$dir"`, `cp "$src" /dst`) are not greppable without hundreds of false positives (git: 210 C08 hits): reading heuristic "every variable operand of a file command follows `--`".
- RUN: yes. C08 plant 7 lines, twin 0; `FX/optinj.sh plant` exit 1 (10 HIT), `twin` exit 0 (10 ok); SC2035 on `rm *`/`tar *`: 1 hit each, twin 0.

**SEC-09 (MUST) A pattern from data is quoted: `case $s in "$p")`, `[[ $s == "$p" ]]`, `${s#"$p"}`, `grep -F -e "$p"`.**
- Why: an unquoted expansion on the right is a glob (`*` allows everything) or a regex.
- Verify: `grep -rlE --include='*.sh' --include='*.bash' -e '.' . | xargs -r shellcheck -s bash -f gcc -i SC2254,SC2053,SC2295` (default severity set enables all three in ShellCheck 0.11.0; no `-o` needed).
- RUN: yes (C13: plant SC2254, SC2053, SC2295 each 1 hit; twin 0).

**SEC-10 (MUST) An identifier that comes from data is validated before it is used as a name or subscript: `case $k in '' | [0-9]* | *[!A-Za-z0-9_]*) die;; esac`.** Applies to `declare "$k=…"`, `typeset`, `local`, `printf -v "$k"`, `read -r "$k"`, `[[ -v $k ]]`, `${!k}`, plus the SH-EXP-19 arithmetic contexts; bash 5.3's `array_expand_once` is not a substitute.
- Why: all of these execute `a[$(cmd)]` on bash (ran 8 versions); `[ "$x" -eq 1 ]`, `export "$x=v"`, `unset "$x"`, `printf %d "$x"` did not.
- Verify: C07 — `grep -rnE --include='*.sh' --include='*.bash' -e '(^|[[:space:];&|(])(declare|typeset|local|export|readonly)([[:space:]]+-[A-Za-z]+)*[[:space:]]+"[$]' -e 'printf -v "[$]' -e '(^|[[:space:];&|(])read( -[A-Za-z]+( [0-9A-Za-z.]+)?)*[[:space:]]+"[$]' -e '\[\[ -v [$]' -e '[$][{]![A-Za-z_][A-Za-z_0-9]*[}]' . | grep -v -e 'sec-ok:'`, where a validated site carries `# sec-ok: <where it was validated>`; hostile-value run `matrix.sh bash FX/arith.sh plant|twin`.
- RUN: yes. C07 plant 5 lines, twin 0 (the validated site carries the waiver); `arith.sh plant` exit 1 on 3.2-5.3 (8/8), `twin` exit 0 (8/8).

**SEC-11 (MUST) A lock is `mkdir`, `set -C` or `ln`, never test-then-create; probe `flock` before using it; do not auto-break a stale lock.** Print the holder PID from `lock/pid` and exit 75, or use `flock` where `command -v flock` succeeds; a lock held through a backgrounded child that inherits the fd stays held.
- Why: test-then-create gave 8-30 winners of 30; `mkdir`/`noclobber`/`ln` gave exactly 1 on 10 of 11 shells; both stale-takeover recipes gave 1-7 winners.
- Verify: C06 — `grep -rnE --include='*.sh' --include='*.bash' -e '\[ -[ef] [^]]*(lock|[.]pid)[^]]*\][[:space:]]*(\|\||&&)' -e 'if[[:space:]]+\[ ! -[ef] [^]]*(lock|[.]pid)' .`; runtime `matrix.sh posix FX/lock-check.sh plant|twin` (use `FX/lock-check6.sh` for posh); `flock` probe is SH-USER-06's u06.
- RUN: yes. C06 plant 2 lines, twin 0; `lock-check.sh plant` exit 1 on 11/11, `twin` exit 0 on 10/11 (posh 0.14.1 breaks at N=30; `lock-check6.sh twin` exit 0 3/3 on posh).

**SEC-12 (SHOULD for any file read while it is rewritten) Replace by writing a temporary file in the same directory and `mv -f` it over the target; never `cat new >target` and never a temp file on another filesystem.**
- Why: truncate-and-write exposes empty or partial files (52-66 of ~100 reads); same-directory rename exposed 0 of ~180; cross-filesystem `mv` exposed 4-7 of ~185.
- Verify: reading heuristic ("is the temp file created with `mktemp "$(dirname "$target")/…"`?") plus runtime `FX/atomic.sh plant|twin-mv|twin-crossfs`.
- RUN: yes. `plant` exit 1 (3/3), `twin-mv` exit 0 (3/3), `twin-crossfs` exit 1 (3/3).

**SEC-13 (MUST) Parallel jobs write each record with one `printf` or to their own file; collect statuses per PID; guard `wait -n`.** `xargs -P` children share one stdout; `wait -n` needs a `BASH_VERSINFO` guard (absent on bash 3.2/4.0/4.2, PID list from 5.1) and bare `wait` returns 0 whatever failed: use `wait "$pid" || rc=1` per PID.
- Why: a two-`printf` job interleaved 400 of 400 lines at `-P8` on GNU and busybox; `xargs` reports 123/124, not the child's code.
- Verify: C11 — `grep -rlE --include='*.sh' --include='*.bash' -e 'wait[[:space:]]+-n' . | xargs -r grep -L -e 'BASH_VERSINFO'` (prints files with `wait -n` and no version guard); C12 — `grep -rnE --include='*.sh' --include='*.bash' -e '^[[:space:]]*wait[[:space:]]*(#.*)?$' .` (SHOULD: each hit needs a reason or per-PID waits); runtime `FX/xargs-par.sh plant|twin`.
- RUN: yes. C11 plant 1 file, twin 0; C12 plant 1 line, twin 0; `xargs-par.sh plant` exit 1 on Ubuntu 24.04, Alpine 3.22, Ubuntu 25.10, `twin` exit 0.

**SEC-14 (MUST for installers and bootstrap) Do not use `sudo -E` or bare `--preserve-env`; pass what is needed explicitly and key off exit codes, not messages.** `sudo env VAR="$VAR" cmd`, or `sudo --preserve-env=VAR cmd` (sudo-rs 0.2.7+, sudo 1.9.15p5), `sudo -n` for non-interactive probes, `sudo -S -p ''` for a password on stdin.
- Why: sudo-rs 0.2.8/0.2.13 ignore `-E` with a warning and exit 0, silently dropping the variable; `-n`, `-S`, `--` behave like sudo; the denial text differs between implementations and versions.
- Verify: C09 — `grep -rnE --include='*.sh' --include='*.bash' -e 'sudo([[:space:]]+-[A-Za-z-]+)*[[:space:]]+(-[A-Za-z]*E[A-Za-z]*|--preserve-env)([[:space:]]|$)' .`; runtime `FX/sudo-flags.sh` in a container with each sudo.
- RUN: yes for the grep (plant 3 lines including `-nE`, twin 0); the sudo-rs behaviour was measured (`FX/out-sudo-flags.txt`) not red/green.

**SEC-15 (SHOULD) A security rule is judged by a hostile-value run, not by ShellCheck.** ShellCheck 0.11.0 is silent on SEC-01, 02, 04, 05, 06, 07, 10, 11, 13; the hostile run asserts a final state (a canary file, a leaked string in a captured stream, a winner count), never an exit status.
- Verify: named reading heuristic; every SEC rule above names its fixture.
- RUN: not applicable (meta rule); evidence: `FX/out-sc-all.txt` (silent at `--enable=all`).

## Verification runs

All run on 2026-10-11 from `FX/`. "Violation" = exit code or hit count on the plant; "twin" = on the compliant twin. Interpreter order for multi-shell rows: POSIX family = dash 0.5.12, ash 1.35, ash 1.37, mksh R59c, ksh93u+m 2023, ksh93u+m 1.0.10, yash 2.52, posh 0.14.1, bash 3.2 `--posix`, bash 5.2 `--posix`, zsh 5.9 `--emulate sh`; bash = 3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3.

| id | fixture and command | violation | twin | key output |
|---|---|---|---|---|
| V01 | `FX/secret-argv.sh plant` / `twin-file` / `twin-stdin` / `twin-hstdin` | exit 1 | exit 0, 0, 0 | `LEAK /proc/2538789/cmdline: curl -s --max-time 5 -H Authorization: Bearer s3cr3t-T0KEN-abc123 …`; twins `server received header: yes` |
| V02 | `matrix.sh posix FX/xtrace-run.sh plant` / `twin-brace` / `twin-off` | exit 1 on 11/11 | exit 0 on 11/11 (both twins) | `VIOLATION: token in xtrace: + true Authorization: Bearer s3cr3t-T0KEN` |
| V03 | `matrix.sh bash FX/bash-env-check.sh plant` / `twin` | exit 1 on 8/8 | exit 0 on 8/8 | `VIOLATION: BASH_ENV payload ran` / `ok: payload did not run` |
| V04 | `env PATH=:/usr/bin:/bin FX/null-path-plant.sh plant` (also `PATH=/usr/bin:`, `/usr/bin::/bin`), twins `twin-guard`, `twin-p` | exit 1, 1, 1 | guard exit 78 (refused), `command -p` exit 0 | `VIOLATION: planted ./jq-absent ran` |
| V05 | `matrix.sh bash FX/arith.sh plant` / `twin` | exit 1 on 8/8 | exit 0 on 8/8 | `$((x+1))=HIT … let=HIT declare -i=HIT … read "$k"=HIT … ${!k}=HIT`; `twin: rejected non-numeric input` |
| V06 | `FX/optinj.sh plant` / `twin` (GNU rm 9.7, tar 1.35, grep 3.12, git 2.54.0, OpenSSH 10.0p2) | exit 1 (10 HIT) | exit 0 (10 ok) | `rm-glob(-rf)=HIT … tar-wildcard=HIT … git-ls-remote(--upload-pack)=HIT ssh(-oProxyCommand)=HIT` |
| V07 | `matrix.sh posix FX/lock-check.sh plant` / `twin` | exit 1 on 11/11 | exit 0 on 10/11; **posh 0.14.1 exit 1** (`wait: invalid option`, argument corruption at N=30) | `round 2: 27 winners`; posh twin rerun `lock-check6.sh` exit 0 on 3/3 |
| V08 | `dash FX/config-source.sh plant` / `bash …` / `twin` | exit 1, 1 | exit 0, 0 | `VIOLATION: config text executed` / `ignored key: EVIL` |
| V09 | `FX/atomic.sh plant` / `twin-mv` / `twin-crossfs` x3 | exit 1 x3 | `twin-mv` exit 0 x3; **`twin-crossfs` exit 1 x3 (not atomic)** | `torn=61,66,52` / `0,0,0` / `4,7,5` |
| V10 | `FX/xargs-par.sh plant` / `twin` on Ubuntu 24.04, Alpine 3.22, Ubuntu 25.10 | exit 1 (3/3) | exit 0 (3/3) | `lines=400 malformed=400 VIOLATION: interleaved output` / `malformed=0` |
| V11 | `FX/final-checks.sh tree-plant` vs `tree-twin`, C01..C13 | hits: 4, 1, 4, 4, 3, 2, 5, 7, 3, 3, 1, 1, 7 | 0 for every check | `== C01 … ./argv.sh:2:curl -H "Authorization: Bearer $TOKEN" …`; C13 SC2053/SC2156/SC2254/SC2035 x3/SC2295 |
| V12 | ShellCheck 0.11.0 `-f gcc` on `FX/sc/*-plant.sh` / `*-twin.sh` | SC2035 1, SC2254 1, SC2053 1, SC2295 1, SC2156 1 | 0 each | `Use ./*glob* or -- *glob* …`, `Injecting filenames is fragile and insecure. Use parameters. [SC2156]` |

Measured, not red/green (tables above): `FX/null-path.sh`, `FX/null-path-source.sh`, `FX/dot-path.sh`, `FX/path-prefix-empty.sh` (PATH/NULL PATH, 11 shells and 8 bash); `FX/bash-env.sh`, `FX/bash-as-sh.sh`, `FX/env-import.bash`, `FX/ps4-nonroot.sh`, `FX/globignore-env.sh`, `FX/bash-env-gha.sh`, `FX/fish-config.fish`, `FX/nu-config.nu` (environment import); `FX/cross-uid.sh`, `FX/win-argv.ps1`, `FX/curl-u-mask.sh` (argv visibility); `FX/xtrace-leak.sh`, `FX/xtrace-fd.bash`, `FX/fish-trace.fish`, `FX/ps-trace.ps1` (traces); `FX/dashdash.sh`, `FX/printf-dash.sh` (`--` support); `FX/lock.sh`, `FX/lock-flock.sh`, `FX/lock-stale.sh` (locks); `FX/wait-n.sh`, `FX/xargs-status.sh` (waits); `FX/sudo-flags.sh`, `FX/sudo-flags2.sh` (sudo); `FX/tmp-predictable.sh` (temp, did not go red: `protected_regular=1`, the write was refused by the kernel).
Honest failures and corrections: V07's posh twin failure is a posh defect under load, not a mkdir failure; the "safe" label on `lock-stale.sh`'s mv-aside takeover is wrong (it also races); a first `atomic.sh` reader re-opened the file and reported 79 false torn reads for `twin-mv`, fixed by one-open snapshots; first `xargs-par.sh` used a back-reference regex that busybox grep does not support and was replaced by `awk`.

## Exemplar evidence

Counts are the proposed checks run over 12 corpus clones (`FX/out-final-ex.txt`; blob-less clones, so only materialised files; `--include='*.sh' --include='*.bash'` only). Noise is high where tests plant hostile values deliberately (git, oils, shellspec).

| candidate | satisfies | violates or contradicts |
|---|---|---|
| SEC-01 | `oils-for-unix/oils@57d3f0d088c3:deps/podman.sh:30` (`podman login … --password-stdin`); `fish-shell/fish-shell@ac50fe526f74:.github/workflows/build_docker_images.yml:32` (`--password-stdin`); `acme.sh@807da6498377:.github/workflows/dockerhub.yml:70,73` (`docker login … --password-stdin`) | `k3s-io/k3s@82a6ddcd820b:install.sh:465,508,543` (`curl -H "Authorization: Bearer $GITHUB_TOKEN"`, PR-install path); `jdx/mise@19e8c8f0d03d:scripts/deploy-worker.sh:17,34` and `scripts/publish-version.sh:97` (`-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"`); `oils:devtools/services/zulip.sh:35,132` (`-u "$bot_email:$bot_api_key"`) |
| SEC-02 | `k3s@82a6ddcd820b:install.sh:872` (`{ set +x; } 2>/dev/null` bracket) | `k3s install.sh:813,843` is `set -x` inside the heredoc that writes the killall script, in a file that also references `$GITHUB_TOKEN` (file-level C02 hit, a false positive by reading); `jdx/mise` and `fish-shell` C02 hits are file-level and need reading |
| SEC-03 | 81 corpus `.sh` files use `mktemp` | `Homebrew/install@8ab1549dfa11:uninstall.sh:49` (`tmpdir="/tmp/uninstall.$$"`); `oils@57d3f0d088c3:regtest/aports/enter-bwrap.sh:27` (`temp_prefix="/tmp/$$"`) |
| SEC-04 | `rbenv@07e9b1e297a5` and `pyenv@d28b75076714` export `PS4` only inside the `RBENV_DEBUG`/`PYENV_DEBUG` branch (documented false positive of C03) | `oils` 51 C03 hits and `bats-core@0c92eb4c418d` 8 (test harnesses that set `SHELLOPTS`, `export -f` on purpose); `direnv@28a73d1df3f3:test/stdlib.bash:378` `SHELLOPTS=braceexpand:…` in a test |
| SEC-05 | rustup, nvm, rbenv, ohmyzsh: 0 C04 hits | `git@6de20f6092dc:t/t7606-merge-custom.sh:26` `PATH=.:$PATH`, `t/t7811-grep-open.sh:55`, `t/t9003-help-autocorrect.sh:16` `PATH="$PATH:."` (tests that need cwd tools); `nvm@b1b3a0038c06:test/install_script/nvm_check_global_modules:57` and `oils:spec/array-assign.test.sh:164` `PATH=".:$PATH"`; `shellspec@f2d13f991885:contrib/builtins.sh:11` `PATH=":"` (deliberate probe) |
| SEC-06, 07 | `rbenv@07e9b1e297a5:libexec/rbenv-exec:39` sources plug-in hooks found via `RBENV_HOOK_PATH` (trust boundary = the hooks directory) | `acme.sh@807da6498377:acme.sh:3368,3481,3553` sources `$ACCOUNT_CONF_PATH` and friends; `ohmyzsh@42a4ccb1b14d:oh-my-zsh.sh:323` `source "$config_file"`, `lib/grep.zsh:6`; `dotnet/install-scripts@e5cf1dd2d154:eng/common/build.sh:226` `. "$script"` (C05 totals: git 26, oils 18, acme.sh 8, ohmyzsh 1) |
| SEC-08 | `rust-lang/rustup@61271d00a979` 1 C08 hit only | `git` 210 C08 hits (tests that glob in a scratch directory), `oils` 16, `shellspec` 17; the ShellCheck wiki itself warns about `tar *` |
| SEC-10 | `bats-core` 19 hits are all `${!var}` indirection on names it controls | `oils` 80, `shellspec` 25, `pyenv` 5 C07 hits: dynamic names over internal variables, none traced to external input |
| SEC-11 | `shellspec@f2d13f991885:lib/libexec/parallel-executor.sh:9-11` `( mkdir "$jobfile.lock" ) 2>/dev/null \|\| return 0` with the posh `set -C` workaround | none (C06: 0 hits in all 12) |
| SEC-13, 14 | `k3s-io/k3s@82a6ddcd820b:install.sh:805` (inside the generated killall script) `exec sudo --preserve-env=K3S_DATA_DIR $0 $@`: the named-variable form | `oils@57d3f0d088c3:deps/podman.sh:30` `sudo -E podman login` (`oils` C09=5 hits in total) |

Fleet: see section 12; the fleet satisfies SEC-02/04/05/06/07/08/10/11/13/14 by absence and violates SEC-01 twice and SEC-03 once.

## AI-agent angle

What a model characteristically gets wrong here, and the smallest mechanical check that catches it:

| mistake | why it happens | smallest check |
|---|---|---|
| `curl -H "Authorization: Bearer $TOKEN"`; `docker login -p "$PASS"`; `gh … --token "$T"` | the docs' examples do; looks idiomatic | C01 grep; `FX/secret-argv.sh` |
| `set -x` (or `#!/bin/bash -x`) left in after debugging, then a token line | cargo-cult `set -euxo pipefail` header | C02 grep (the `x` in `-euxo` matches) |
| `export BASH_ENV=…`, `export PS4=…`, `export -f fn` to "share" state with children | works on the author's bash | C03 grep |
| `PATH="$HOME/bin:$PATH"` without the `${PATH:+…}` form; `PATH=$PATH:.` | training data is full of it | C04 grep + reading |
| `. lib.sh`, `source config.env` (no `./`) | works on bash and busybox 1.37, fails on dash | `matrix.sh posix FX/dot-path.sh`; C05 |
| `source "$CONFIG"` for user config in an installer | convenience | C05 + "who writes it?" |
| `rm -rf $dir/*`, `rm *`, `tar cf x *`, `ssh $host` without `--` | `--` feels pedantic; ShellCheck stays quiet on variable operands | C08 + SC2035 |
| `grep "$user_input" file`, `case $x in $pat)` | assumes data is literal | SC2254/SC2053/SC2295; `grep -F -e` reading check |
| `(( n > max ))`, `[[ $a -eq $b ]]`, `declare "$name=$v"`, `read "$k"`, `${!name}` on untrusted text; "I quoted it, so it is safe" | quoting does not stop arithmetic evaluation | `matrix.sh bash FX/arith.sh`; SEC-10 C07 |
| `if [ ! -e lock ]; then touch lock` as a mutex; `flock` with no probe; `rm -rf lock` takeover | looks like a lock | C06; SH-USER-06 u06 |
| `cat new > "$conf"` for a config others read | simplest write | reading heuristic SEC-12; `FX/atomic.sh` |
| `xargs -P8 sh -c 'echo a; echo b'` for logging; bare `wait` as a join; `wait -n` on a macOS-bound script | parallel snippets are copied from bash 5 examples | C11, C12; `matrix.sh bash FX/wait-n.sh` |
| `sudo -E ./install` on Ubuntu 25.10+ | works on classic sudo | C09; `FX/sudo-flags.sh` |
| `/tmp/foo.$$`, `/tmp/foo.log` for secrets or state | habit | C10 grep |
| GNU-only flags (`sed -i`, `readlink -f`, `realpath --`) in the repair code: busybox `realpath` rejects `--`, macOS lacks `flock`/`timeout` | the repair is written on GNU | `matrix.sh posix` on the repaired file; SH-USER checks |
| trusting `unset BASH_ENV` inside a script as a defence | reads as obviously right | `FX/bash-env-check.sh twin` (scrub is at the invoker) |
| PowerShell/fish/nu: assuming `$env:TOKEN` or `$TOKEN` in a trace is hidden; fish `fish_trace` prints it | different shells differ | `FX/fish-trace.fish`; PS-SEC for pwsh |

## Contested / evolving

- **`BASH_ENV` hardening.** Practitioners disagree whether a script should defend itself (`unset BASH_ENV ENV` first line) or the invoker should. Measured: only the invoker can (`unset` runs after the file was sourced). Not trending: bash 5.3 NEWS did not change `BASH_ENV` handling; as of 2026-10-11 the manual still lists `$BASH_ENV` as ignored only in privileged mode.
- **NULL PATH and cwd search.** Bash 5.3 NEWS item p is a clarification (behaviour identical 3.2-5.3 here); POSIX calls the zero-length prefix "legacy" and tells applications to use `.` explicitly. Whether a future POSIX or bash drops it is open; `source -p PATH` (5.3, NEWS item kk) is the new explicit-path tool. Trend: toward explicit.
- **`GLOBIGNORE` from the environment.** The manual's privileged-mode text names it as an ignored import; 3.2-5.3 never honoured it on import (measured). Treat the doc as describing intent; do not rely on either reading.
- **Stale-lock recovery.** BashFAQ/045 points to a stale-lock remedy that was not run here; the two recipes measured here (`rmdir+mkdir`, `mv`-aside) both fail. Position taken: report, do not break. A PID-and-start-time check narrows but cannot close the window in shell.
- **`array_expand_once` / `assoc_expand_once`.** Introduced to stop double evaluation (5.0, renamed/extended 5.3); measured as a partial fix. ShellCheck #2679 has been open since 2023-02-01; no linter closes the gap, so a hostile-value run stays the check.
- **`-E` in sudo.** sudo-rs treats it as discouraged and ignores it; the classic sudo manual still supports it. Ubuntu 25.10+ default (sudo-rs) is unverified for stock installs. Trend: away from `-E`.
- **hidepid and `/proc` privacy.** `hidepid=2` and `ptrace`-restricted `/proc` are host policy; some container runtimes mount `/proc` with defaults (measured `rw,nosuid,nodev,noexec,relatime`). Not something a script can assume.
- **macOS.** Everything about BSD `ps`, `mv -T`, `xargs -r`, and flock alternatives is read only. Question 7 of shell-expansion.md (dispatch a macOS runner workflow) would settle it.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.md | OWASP OS Command Injection Defense Cheat Sheet (fetched, full file) | current master, 2025-26 | argument injection, parameterization, the `--`-does-not-stop-curl-URLs caveat |
| https://cwe.mitre.org/data/definitions/78.html | CWE-78 OS command injection | CWE 4.x | the class and its mitigations |
| https://cwe.mitre.org/data/definitions/88.html | CWE-88 argument injection | CWE 4.x | the option-injection definition |
| https://cwe.mitre.org/data/definitions/214.html | CWE-214 sensitive information in process invocation | CWE 4.x | argv/environment visibility |
| https://mywiki.wooledge.org/BashFAQ/045 | BashFAQ/045 locking | wiki, current | mkdir lock, flock fd caveat, stale lock |
| https://mywiki.wooledge.org/BashFAQ/062 | BashFAQ/062 temp files | wiki, current | mktemp portability |
| https://mywiki.wooledge.org/BashFAQ/111 | BashFAQ/111 Shellshock | wiki, current | environment-imported functions |
| https://git.savannah.gnu.org/cgit/bash.git/tree/NEWS?h=bash-5.3 | bash 5.3 NEWS (primary; read from the local copy `FX/src/bash53-NEWS`) | 5.3, 2025 | item p NULL PATH, item kk `source -p`, `array_expand_once` |
| https://tiswww.case.edu/php/chet/bashref.html | Bash reference manual (primary, fetched in 100 KB pieces) | 5.3 | `BASH_ENV`, "invoked with name sh", privileged mode `-p` |
| https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap08.html | POSIX.1-2024 XBD 8 environment variables (primary) | 2024 | zero-length PATH prefix is legacy |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html | POSIX.1-2024 XCU 2 shell command language (primary) | 2024 | `ENV` interactive only, `.` and PATH search |
| https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap12.html | POSIX.1-2024 XBD 12 utility conventions (primary) | 2024 | Guideline 10, `--` |
| https://curl.se/docs/manpage.html | curl manpage (primary) | 8.x | `-H @file`/`@-`, `-K -`, `-u` hiding, `--globoff`, `--` |
| https://github.com/curl/curl/blob/master/docs/cmdline-opts/header.md | curl `--header` option source (primary) | master | `@filename`/`@-` added in 7.55.0 |
| https://man.archlinux.org/man/proc.5 | proc(5), `hidepid` (primary: kernel man pages) | Linux 3.3+ | who can read other users' cmdline |
| https://man.archlinux.org/man/proc_pid.5 | proc_pid(5) (primary) | current | `/proc/<pid>/cmdline`, `environ` |
| https://www.sudo.ws/docs/man/sudoers.man/ | sudoers(5) (primary) | 1.9.x | `env_reset`, `env_keep`, bash functions not preserved |
| https://github.com/trifectatechfoundation/sudo-rs | sudo-rs README and CHANGELOG (primary) | 0.2.15, 2026-08-31 | `-E` unsupported, `--preserve-env=VAR` 0.2.7 |
| https://github.com/koalaman/shellcheck/wiki/SC2035 | ShellCheck wiki SC2035 (primary; local clone koalaman__shellcheck.wiki@0b4dfe7bf9dc) | 0.11.0 era | glob-to-option rationale and tar caveat |
| https://github.com/koalaman/shellcheck/wiki/SC2254 | ShellCheck SC2254 (primary) | 0.11.0 | case pattern quoting |
| https://github.com/koalaman/shellcheck/wiki/SC2053 | ShellCheck SC2053 (primary) | 0.11.0 | `[[ == $x ]]` |
| https://github.com/koalaman/shellcheck/wiki/SC2295 | ShellCheck SC2295 (primary) | 0.11.0 | `${v#$p}` pattern |
| https://github.com/koalaman/shellcheck/issues/2679 | ShellCheck issue: warn on unvalidated input in arithmetic | open since 2023-02-01 | why no linter exists |
| https://www.openssh.com/txt/release-9.6 | OpenSSH 9.6 release notes (primary) | 2023-12 | hostname metacharacter countermeasures |
| https://zsh.sourceforge.io/Doc/Release/Files.html | zsh manual, startup files (primary) | 5.9 | `.zshenv` always read |
| https://fishshell.com/docs/current/cmds/fish.html | fish command docs (primary) | 4.x | `--no-config` |
| https://formulae.brew.sh/api/formula/flock.json | Homebrew `flock` formula (discoteq/flock 0.4.0) | 2026 | macOS has no `flock` by default |
