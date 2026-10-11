---
title: Dialect policy, version floors and POSIX.1-2024 adoption (SH-DIAL)
topic: shell scripting across operating systems and shells; which dialect a script declares, which interpreter floor it may assume, which POSIX.1-2024 additions a #!/bin/sh script may use in 2026
agent: dialect/floors-and-shebangs (shell program, wave 2)
model: sonnet
date_researched: 2026-10-11
sources_count: 32
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/floors-and-shebangs/
scope: >
  Covers rows M-A-01..05, 09, 10, 13..16, 18..20 and M-O-04: dialect declaration (shebang, directive, extension), script-kind table, shebang argument rules and env -S,
  the POSIX.1-2024 utility and shell additions verdicts (measured on 11 interpreters and 21 Docker images), the pipefail probe, dollar-single-quote, local, function syntax,
  macOS /bin/sh (read only). Does NOT cover the bash 4+ feature denylist (W2-2), the userland command table beyond the POSIX.1-2024 utilities (W2-3), errexit semantics, quoting, or PowerShell.
  Date of every measurement: 2026-10-11 unless stated. No macOS host: every macOS and BSD statement is labelled "unverified: read only".
---

# Dialect policy, version floors and POSIX.1-2024 adoption

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Dialect declaration: what each tool infers](#1-dialect-declaration-what-each-tool-infers)
   2. [Script-kind table and header convention (conflict 2)](#2-script-kind-table-and-header-convention-conflict-2)
   3. [Shebang forms: env bash, /bin/bash, one argument, env -S](#3-shebang-forms-env-bash-binbash-one-argument-env--s)
   4. [POSIX.1-2024 additions: normative text and the measured verdict (conflict 3)](#4-posix12024-additions-normative-text-and-the-measured-verdict-conflict-3)
   5. [pipefail in sh: the probe, the variants, the dash version chase](#5-pipefail-in-sh-the-probe-the-variants-the-dash-version-chase)
   6. [Dollar-single-quote: silent literal output](#6-dollar-single-quote-silent-literal-output)
   7. [read -d, find -print0, xargs -0 and -r](#7-read--d-find--print0-xargs--0-and--r)
   8. [realpath, readlink, timeout, test, env, echo -n](#8-realpath-readlink-timeout-test-env-echo--n)
   9. [local in sh and the has_local probe (conflict 13)](#9-local-in-sh-and-the-has_local-probe-conflict-13)
   10. [bash --posix and zsh --emulate sh are not portability checks](#10-bash---posix-and-zsh---emulate-sh-are-not-portability-checks)
   11. [busybox ash 1.37 on Alpine 3.22](#11-busybox-ash-137-on-alpine-322)
   12. [Function definition syntax](#12-function-definition-syntax)
   13. [macOS /bin/sh (read only)](#13-macos-binsh-read-only)
   14. [The /bin/sh of the 21 images](#14-the-binsh-of-the-21-images)
   15. [Extension convention for authored scripts (M-O-04)](#15-extension-convention-for-authored-scripts-m-o-04)
   16. [Floor-table format and the "tested on" column set](#16-floor-table-format-and-the-tested-on-column-set)
   17. [Fleet and ocx findings](#17-fleet-and-ocx-findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

Abbreviations: [plat] = [shell-audit/platform-matrix.md](../shell-audit/platform-matrix.md); [fleet] = [shell-audit/fleet-shell-shape.md](../shell-audit/fleet-shell-shape.md); [cfg] = [shell-audit/config-inventory.md](../shell-audit/config-inventory.md); [ex] = [shell-audit/exemplar-shape.md](../shell-audit/exemplar-shape.md); `FX` = the fixture directory in the frontmatter. Exemplar citations are `<repo>@<sha12>:<path>:<line>` into `/home/mherwig/.cache/research-lang/exemplars/shell/`.

## Summary

- Declare the dialect in the file, in one of two forms: a shebang (`#!/bin/sh` or `#!/usr/bin/env bash`) or, for sourced files, `# shellcheck shell=sh|bash` as the first line. A `.sh` file with neither gets SC2148 from ShellCheck (exit 1) and is silently parsed as bash by shfmt 3.13.1, so the formatter cannot catch it (`FX/mixed.sh`).
- shfmt 3.13.1's manual says `.sh` "implies posix"; its source and a run say otherwise: `.sh` without a shebang falls back to bash and accepts arrays. Do not rely on `shfmt -d` as the dialect gate for shebang-less files ([shfmt v3.13.1 main.go](https://raw.githubusercontent.com/mvdan/sh/v3.13.1/cmd/shfmt/main.go), `FX/out/mixed.txt`).
- Confirm conflict 2 with two refinements: installers, bootstrap and rc snippets are `#!/bin/sh`; every other unpinned bash script is `#!/usr/bin/env bash` with a bash 3.2 floor, because macOS runners print bash 3.2.57 ([runner-images macos-26](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md): "Bash 3.2.57(1)-release"); a pinned script states its floor in the header and guards on `BASH_VERSINFO` as the first command.
- On bash 3.2 a bash-4 script with no guard does not fail: `declare -A` prints an error, the script continues, exits 0 and prints wrong data (`count=1 a=2 b=2` instead of `count=2 a=1 b=2`). The guard must be the first command (`FX/guard-none.sh` vs `FX/guard-first.sh`).
- `#!/bin/bash -e -o pipefail` and `#!/usr/bin/env bash -e` fail on Linux with `/bin/bash: - : invalid option` and exit 127 (`env: 'bash -e': No such file or directory`). ShellCheck SC2096 is red on both and green on the `set -eo pipefail`-in-body twin. Put options in the body.
- `env -S` is not a floor: absent in busybox env 1.37 (Alpine 3.22, `unrecognized option: S`) and in coreutils 8.22 (Amazon Linux 2); broken in its space-separated form in uutils 0.2.2 (Ubuntu 25.10), fine in 0.10.0 (26.04). Never use it in a shebang that can reach a container.
- `#!/bin/sh` and pipefail: write `(set -o pipefail) 2>/dev/null && set -o pipefail` on one line. Bare `set -o pipefail`, `|| true`, `2>/dev/null || true` and `eval` all abort dash 0.5.12 (exit 2) and posh 0.14.1 (exit 1) with no later output; the probe is green on all 11 interpreters. Corollary: on dash 0.5.12-2/-6ubuntu5 and posh the probe silently leaves pipefail off, so correctness must never depend on it in sh.
- A dash version string does not identify the feature set: Debian backported pipefail in 0.5.12-7 (2024-05-17), so Debian 13 and Ubuntu 26.04 (0.5.12-12) have it and Debian 12 and Ubuntu 24.04 (0.5.12-2, -6ubuntu5) do not. `dash --version` does not exist (`dash: 0: Illegal option --`). Probe, never parse.
- `$'..'` in `#!/bin/sh` prints the literal text and exits 0 on dash 0.5.12-2/-6ubuntu5/-12, yash 2.52 and posh 0.14.1: silent wrong output. Upstream dash added it on 2024-06-22 and a build of 0.5.13.5 handles it, but Debian unstable still ships 0.5.12-12. Verdict: never; use `printf`.
- ShellCheck 0.11.0 catches both (SC3040, SC3003), but unreleased master changes SC3040 to accept pipefail and removes SC3003 ([CHANGELOG](https://raw.githubusercontent.com/koalaman/shellcheck/master/CHANGELOG.md)). The first upgrade silences the dash-safety warnings while Debian 12 and Ubuntu 24.04 dash still need them; keep the two grep checks (GREP-1, GREP-2) alongside the pinned ShellCheck.
- `read -d` is absent on every dash (all 9 dash images, and upstream 0.5.13.5), yash 2.52 and posh 0.14.1; present on busybox ash, mksh, ksh93u+m, bash, zsh. Verdict: never in sh. POSIX.1-2024 lists `read -d`, `find -print0`, `xargs -0`/`-r`, `timeout`, `realpath` and `test -nt/-ot/-ef` as additions; only some are usable.
- `readlink -f` is not POSIX (readlink has only `-n`), and `realpath` has only `-E`/`-e`. Both exist on 21 of 21 Linux images (incl. busybox 1.37). macOS gained `readlink -f` in 12.3 and `realpath` in 13.0 (unverified: read only). Probe or avoid them in macOS-reachable code.
- `timeout` returns 143 on busybox 1.37 (not POSIX's 124), and uutils 0.10.0 returns 124 for `timeout -s KILL` where GNU 9.4 returns 137. Treat 124, 137 and 143 as "timed out", and `command -v timeout` before use (absent from Apple's shell_cmds-326 listing; unverified: read only).
- `local` in `#!/bin/sh` is allowed with the exact directive text in rule SH-DIAL-17; only ksh93u+m 1.0.10 lacks it (`local: not found`, exit 127). Installers keep the `has_local || alias local=typeset` probe; the probe works on ksh93 but makes the variable global (`x=2` leaks).
- `bash --posix` 5.2 accepts arrays, `${x,,}`, `<( )`, `[[ ]]` and `function` and exits 0 where dash, ash and posh exit 1-2. Portability evidence must come from dash, posh, busybox ash or mksh runs, never from `bash --posix` or `zsh --emulate sh`. 12 of 21 Linux images' `/bin/sh` silently accept bashisms that the other 9 reject.
- macOS `/bin/sh` is not dash. The fleet claim "macOS `/bin/sh` is dash" sits at line 110 of `quality-bash.md` in 6 fleet repos. Replace it with "bash 3.2 in POSIX mode (unverified: read only)".
- Authored scripts carry `.sh` (bash and sh alike); `.bash` is for sourced bash libraries; extensionless is for installed commands and tool-managed hooks only. The gate finds extensionless shebang files with `shfmt -f .`, which listed my extensionless fixture.
- Two map statements are corrected here: yash 2.52 does support `set -o pipefail` (it lacks `$'..'`, `read -d` and `echo -n`), and `xargs -r` is harmless on macOS (accepted, BSD already skips empty input), so the verdict is "use".

## Findings

### 1. Dialect declaration: what each tool infers

| Tool | How it picks the dialect | Source |
|---|---|---|
| ShellCheck 0.11.0 | `-s`, then `# shellcheck shell=`, then shebang, then extension `.bash` `.ksh` `.dash`; `.sh` is **not** assumed `sh`. Otherwise SC2148 (error). | [SC2148](https://www.shellcheck.net/wiki/SC2148) |
| shfmt 3.13.1 | `-ln` flag, else filename extension (a shell extension such as `.mksh`; `.sh` is deliberately left undecided), else shebang, else **bash fallback**. | [main.go v3.13.1](https://raw.githubusercontent.com/mvdan/sh/v3.13.1/cmd/shfmt/main.go) `langFromFilename`: `// Note that ".sh" doesn't mean it's POSIX Shell for sure.` |
| shfmt manual | Says `.sh` "implies *posix*, but may be overridden by a valid shell shebang." The code above does not do that. | [shfmt.1.scd](https://raw.githubusercontent.com/mvdan/sh/master/cmd/shfmt/shfmt.1.scd) |

Measured, `FX/mixed.sh` (bash array, no shebang, `.sh` extension), `bash FX/check-mixed.sh`:

```text
mixed.sh               shfmt -d -i 2 exit 0 | shellcheck exit 1      <- shfmt accepts arrays; only ShellCheck objects (SC2148)
mixed-sh-shebang.sh    shfmt -d -i 2 exit 1 | shellcheck exit 1      <- "arrays are a bash/mksh/zsh feature; tried parsing as posix (parsed as posix via -ln=auto)"
mixed-twin.sh          shfmt -d -i 2 exit 0 | shellcheck exit 0      <- #!/usr/bin/env bash
mixed-directive.sh     shfmt -d -i 2 exit 0 | shellcheck exit 0      <- first line "# shellcheck shell=bash"
```

`shfmt -ln posix mixed.sh` exits 1, `-ln auto` and `-ln bash` exit 0. Without `.editorconfig`, `shfmt -d` also diffs indentation (tabs by default), so the fixture runs use `-i 2`; the fleet's `-i 4 -ci` belongs in `.editorconfig` (conflict 5).

`shfmt -f .` (file discovery by extension or shell shebang) listed the extensionless `noext-script` (`#!/bin/sh`), and the `FX/verif/plant` and `FX/verif/twin` runs listed every shell file in each directory (`out/check-tools.txt`). shfmt 3.14.0 (2026-08-28) adds `--detect` (executable bit or shebang), 3.14.1 is the current release (2026-09-06) ([mvdan/sh CHANGELOG](https://raw.githubusercontent.com/mvdan/sh/master/CHANGELOG.md)); the pinned toolchain is 3.13.1.

### 2. Script-kind table and header convention (conflict 2)

Conflict 2 is **confirmed** (by kind, not globally). Refinements from measurement are marked in bold.

| Script kind | Dialect and shebang | Floor | Required header line 2 | Why |
|---|---|---|---|---|
| Installer, bootstrap, anything run before a toolchain exists, `curl | sh` target | `#!/bin/sh` | POSIX.1-2017 plus probed features (pipefail, local); tested on dash 0.5.12-2, busybox 1.37, bash 3.2 `--posix` | `/bin/sh` exists on 21 of 21 images, bash on 18 of 21 (absent: both Alpine tags, busybox:1.37) ([plat §1.1](../shell-audit/platform-matrix.md)); `#!/usr/bin/env bash` and `#!/bin/bash` both fail on Alpine (exit 127), `#!/bin/bash` fails on nixos/nix (exit 126) (§3) |
| rc / login-shell snippet, sourced library | no shebang; first line `# shellcheck shell=sh` or `shell=bash` | the floor of its callers | `# Floor: sourced by <callers>` | a shebang on a sourced file is a lie; SC2148 needs the directive |
| Repo tool, test helper | `#!/usr/bin/env bash` | **bash 3.2** | `# Kind: repo tool. Floor: bash 3.2 (macOS system bash).` | macOS runners (14, 15, 26) print 3.2.57 ([plat §2.1](../shell-audit/platform-matrix.md)); 154 of 155 fleet bash files already use `env bash`, only 5 of 166 use bash 4+ ([fleet #5, #10](../shell-audit/fleet-shell-shape.md)) |
| CI helper run only through `shell: bash` on pinned runners | `#!/usr/bin/env bash` | the **pinned** version, **declared**, guarded | `# Floor: bash 5.2 (pinned: ubuntu-24.04 runner).` and the guard below as the first command | ubuntu-24.04 has bash 5.2.21, ubuntu-26.04 has 5.3.9 ([runner Ubuntu2604 readme](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md)); without the guard a local macOS run prints errors and continues (§2.1) |
| zsh, fish, nu, elvish | their own shebang, or none when sourced | the version table in M-A-03 | `# Floor: <shell> <version>` | owned by sibling depth files |

Header convention, verbatim (line 1 shebang, line 2 the kind line):

```sh
#!/bin/sh
# Kind: installer. Dialect: POSIX sh. Floor: POSIX.1-2017 + probed (pipefail, local). Tested: dash 0.5.12-2, busybox 1.37, bash 3.2 --posix.
```

```bash
#!/usr/bin/env bash
# Kind: repo tool. Floor: bash 3.2.
```

```bash
#!/usr/bin/env bash
# Kind: CI helper. Floor: bash 5.2 (pinned: ubuntu-24.04 runner).
[ "${BASH_VERSINFO:-0}" -ge 5 ] || { printf '%s\n' "needs bash >= 5 (found ${BASH_VERSION:-non-bash})" >&2; exit 1; }
```

#### 2.1 Why the guard is the first command

`FX/guard-none.sh` (`declare -A m; m[a]=1; m[b]=2; echo "count=${#m[@]} a=${m[a]} b=${m[b]}"`), `matrix.sh bash`:

```text
== bash 3.2
guard-none.sh: line 3: declare: -A: invalid option
declare: usage: declare [-afFirtx] [-p] [name[=value] ...]
count=1 a=2 b=2
-> exit 0
== bash 4.0 ... 5.3   count=2 a=1 b=2   -> exit 0
```

`FX/guard-first.sh` (the one-line `BASH_VERSINFO` guard before `declare -A`):

```text
== bash 3.2   needs bash >= 4 (found 3.2.57(1)-release)   -> exit 1
== bash 4.0 ... 5.3   count=2 a=1 b=2   -> exit 0
dash:   needs bash >= 4 (found non-bash)   -> exit 1
```

The guard is written with `[ ... -ge ... ]` and `${BASH_VERSINFO:-0}` so it parses and runs on bash 3.2, on non-bash shells, and under `set -u`. The exemplar guards are the same shape: `bats-core@0c92eb4c418d:bin/bats:6-15` (`[ -z "${BASH_VERSION-}" ]` first, "needs to be run by Bash >= 3.2") and `pyenv@d28b750767d4:libexec/pyenv-rehash:139` (`if ((${BASH_VERSINFO[0]} > 3)); then declare -A`). The deeper bash-3.2 denylist and guard placement belong to W2-2.

#### 2.2 Overturned or sharpened

- **Not overturned:** `#!/usr/bin/env bash` for bash; `#!/bin/sh` for installers; the 3.2 floor.
- **Sharpened:** "bash 3.2 unless a header names the pinned interpreter" becomes: a pinned floor is legitimate only when the header names it **and** the guard is the first command. A header alone does not stop a local macOS run (§2.1).
- **Sharpened:** Homebrew's installer shows the `#!/bin/bash` + `[ -z "${BASH_VERSION:-}" ]` abort for a script that is fed to `sh` by mistake (`Homebrew__install@8ab1549dfa11:install.sh:17-19`). That guard is cheap and belongs on every `bash` script that users pipe into a shell.

### 3. Shebang forms: env bash, /bin/bash, one argument, env -S

#### 3.1 Which interpreter each form picks (MEASURED, `FX/sb-*.sh`, `FX/out/sb-forms.txt`)

| Image | `#!/usr/bin/env bash` | `#!/bin/bash` | `#!/bin/sh` |
|---|---|---|---|
| debian:12, almalinux:9 | ok (exit 0) | ok | ok |
| nixos/nix | ok (bash on PATH) | `bad interpreter: No such file or directory`, **exit 126** | ok (`/bin/sh` -> store bash 5.3) |
| alpine:3.22 | `env: can't execute 'bash'`, **exit 127** | `not found`, **exit 127** | ok |
| busybox:1.37 | exit 127 | exit 127 | ok |

`nixos/nix` has exactly `/bin/sh` and `/usr/bin/env` (`ls /bin /usr/bin` printed `/bin: sh  /usr/bin: env`). So `#!/bin/bash` fails on NixOS-style images (and, read-only, on BSD where bash lives in `/usr/local/bin`); `env bash` fails only where bash is not installed. On a stock macOS runner both resolve to 3.2.57 unless a Homebrew bash precedes it on PATH (unverified: read only; [plat §2.1](../shell-audit/platform-matrix.md): the runner image installs no Homebrew bash).

#### 3.2 One argument only (M-A-10) (MEASURED, `FX/shebang-*.sh`, `FX/out/shebang-args.txt`)

| Fixture (first line) | debian:12 | alpine:3.22 (bash apk-added) | amazonlinux:2 | ubuntu:25.10 | ubuntu:26.04 |
|---|---|---|---|---|---|
| `#!/bin/bash -e -o pipefail` (PLANT) | `/bin/bash: - : invalid option`, exit 1 | same | same | same | same |
| `#!/usr/bin/env bash -e` (PLANT) | `env: 'bash -e': No such file or directory` + `use -[v]S to pass options in shebang lines`, exit 127 | `env: can't execute 'bash -e'`, 127 | `env: bash -e: No such file or directory`, 127 | as debian | as debian |
| `set -eo pipefail` in the body (TWIN) | reached, 0 | 0 | 0 | 0 | 0 |
| `#!/bin/bash -eu` (one bundled flag) | 0 | 0 | 0 | 0 | 0 |
| `#!/usr/bin/env -S bash -e -o pipefail` | 0 | **exit 1**: `/usr/bin/env: unrecognized option: S` (busybox 1.37) | **exit 125**: `invalid option -- 'S'` (GNU coreutils 8.22) | 0 | 0 |

The Linux kernel hands everything after the interpreter to it as **one** argument. ShellCheck says so and notes macOS is the exception (read only) ([SC2096](https://www.shellcheck.net/wiki/SC2096)). POSIX leaves `#!` unspecified: "If the first line of a file of shell commands starts with the characters "#!", the results are unspecified" ([XCU 2.9.1, chap02](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)), and the POSIX `env` utility has only `-i` and `name=value` (no `-S`) ([env](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/env.html)).

`env -S` as a command (not shebang) on the probe (`FX/misc-probe.sh`, `FX/out/posix2024-utils.txt` key `env_S`): `y` on 16 of 21 images; `n` on alpine x2 and busybox (busybox 1.37), amazonlinux:2 (coreutils 8.22) and ubuntu:25.10. On 25.10 uutils 0.2.2, `env -S "echo hello world"` fails with `'echo hello world': No such file or directory` while the attached form `env -S"echo hello world"` prints `hello world`; the shebang route still works there because the kernel passes `-S bash -e ...` as one attached argument. uutils 0.10.0 (26.04) handles the spaced form.

Verdict: `env -S` is **never** allowed in a shebang that can reach Alpine, busybox, Amazon Linux 2 or an unknown container. It is tolerated only in a script whose header pins GNU coreutils >= 8.30 or uutils >= 0.10 (read: Ubuntu 26.04 runners), and even there `set -eo pipefail` in the body is shorter and portable.

### 4. POSIX.1-2024 additions: normative text and the measured verdict (conflict 3)

What the standard says (all fetched 2026-10-11):

- `set -o pipefail`: "Derive the exit status of a pipeline from the exit statuses of all of the commands in the pipeline, not just the last" ([chap02, set](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)); Issue 8 "Austin Group Defect 789 is applied, adding -o pipefail".
- `$'..'`: section 2.2.4 "Dollar-Single-Quotes" ([chap02](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)); `\t \n \e \xXX \ddd \cX` are defined.
- `read [-r] [-d delim] var...`: "If delim consists of one single-byte character, that byte shall be used as the logical line delimiter. If delim is the null string, the logical line delimiter shall be the null byte" (Defect 243) ([read](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/read.html)).
- `xargs -r` and `-0` (Defect 243) ([xargs](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/xargs.html)); `find -print0` (Defect 243), `-iname`, `-mount` ([find](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/find.html)). The find page itself prefers `-exec ... {} +` over `-print0 | xargs -r0`: "less safe ... if find -print0 is terminated after it has written a partial pathname".
- `realpath [-E|-e] file` only; `readlink [-n] file` only; `timeout [-fp] [-k time] [-s signal_name] duration utility` with exit 124/125/126/127 ([realpath](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/realpath.html), [readlink](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/readlink.html), [timeout](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/timeout.html)).
- `test`: adds `-ef -nt -ot` (Defect 375) and **removes** `-a`, `-o`, `(`, `)` (Defect 1330) ([test](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/test.html)).
- Not in POSIX: `local` (Austin Group bug 767 "Add built-in local" is Closed, Resolution Rejected) ([bug 767](https://austingroupbugs.net/view.php?id=767)), `[[ ]]`, arrays, `function`, `<( )`, `${x//}`, `echo -e`.

Debian Policy 10.4 is still POSIX.1-2017: "Scripts may assume that /bin/sh implements the POSIX.1-2017 Shell Command Language plus the following additional features": `echo -n` builtin must not print a newline, `test -a`/`-o` must work, `local` with multiple names and assignment must work, XSI `kill` and `trap` numerics ([Debian Policy 10.4](https://www.debian.org/doc/debian-policy/ch-files.html)). That is the reason `test -a/-o` still works everywhere measured (21 of 21 images, 11 of 11 interpreters) even though POSIX removed it; it is not a reason to write it.

#### 4.1 Per-interpreter verdict (MEASURED `matrix.sh posix FX/posix2024-utils.sh`, shell features; `y` = works)

Columns are the pinned set from the brief. dash -2 and -6ubuntu5 were measured through the `debian:12` and `ubuntu:24.04` images' `/bin/sh` (identical rows); dash -12 through `debian:13`/`ubuntu:26.04`.

| Feature | dash 0.5.12-2 (deb12) | dash 0.5.12-6ubuntu5 (24.04) | dash 0.5.12-12 (deb13, 26.04) | busybox ash 1.37 | mksh R59c | ksh93u+m 1.0.10 | yash 2.52 | posh 0.14.1 | bash 3.2 `--posix` |
|---|---|---|---|---|---|---|---|---|---|
| `set -o pipefail` | n | n | **y** | y | y | y | **y** | n | y |
| `$'..'` | n (literal) | n | n | y | y | y | n (literal) | n (literal) | y |
| `read -d` | n | n | n | y | y | y | n | n | y |
| `test -nt -ot -ef` | y | y | y | y | y | y | y | **n** | y |
| `test -a -o` | y | y | y | y | y | y | y | y | y |
| `local` | y | y | y | y | y | **n** | y | y | y |
| `echo -n` suppresses newline | y | y | y | y | y | y | **n** (prints `-n`) | y | y |
| `[[ ]]` | n | n | n | y | y | y | y | n | y |

Source: `FX/out/posix2024-utils-interp.txt`, `FX/out/ash-features.txt`, `FX/out/posix2024-utils.txt` (images), `FX/out/dash-0.5.13.5.txt`. The bash 3.2 column ran in the `bash:3.2` image (Alpine userland), so only its shell features are meaningful. Upstream dash 0.5.13.5 built from source in `debian:13` (`FX/build-dash.sh`): `pipefail=y dsq=y read_d=n` (pipefail effect `pipeline-status=1`).

Userland rows of the same battery are per image, not per interpreter; §14 has the 21-image table, §7-8 the per-utility reading.

#### 4.2 Verdict table for `#!/bin/sh` in 2026 (use / probe / never)

Evidence date 2026-10-11; "dash-old" = every dash without pipefail (Debian 11/12, Ubuntu 20.04/22.04/24.04), all still in use.

| Feature | Verdict | Dated evidence |
|---|---|---|
| `set -o pipefail` | **probe** with `(set -o pipefail) 2>/dev/null && set -o pipefail`; never depend on the effect | 4 of 9 dash images have it (deb13, 25.10, 26.04, 26.10); 5 do not (deb11, deb12, 20.04, 22.04, 24.04); posh 0.14.1 does not (§5) |
| `$'..'` | **never** | literal on dash -2/-6ubuntu5/-12, yash 2.52, posh; silent, exit 0 (§6) |
| `read -d` | **never** | `Illegal option -d` on all dash, `not a valid option` yash, `invalid option` posh (§7) |
| `find -print0`, `xargs -0` | **use** (probe `command -v find` in minimal images) | present wherever findutils is; absent entirely on amazonlinux:2023 and opensuse/leap:latest docker images (§7) |
| `xargs -r` | **use** | `y` on 21 of 21; macOS accepts it as a no-op and BSD xargs already skips empty input (read only, [plat §3](../shell-audit/platform-matrix.md)) |
| `realpath file` (no flags) | **use** on Linux; flags `-m`, `-s` **never** | 21 of 21 Linux; macOS 13.0+ (read only) (§8) |
| `readlink -f` | **use on Linux only**; not POSIX | 21 of 21; macOS 12.3+ (read only) (§8) |
| `timeout` | **probe** and accept rc 124, 137 and 143 | 21 of 21 Linux; busybox rc 143; absent from Apple shell_cmds-326 (read only) (§8) |
| `test -nt -ot -ef` | **use** (not for strict POSIX.1-2017 shells such as posh) | posh 0.14.1 `n`; every other interpreter `y` |
| `test -a -o` | **never** | removed in 2024; SC2166 fires on 0.11.0; still works everywhere (Debian Policy) |
| `local` | **allowed** with the directive in SH-DIAL-17 | all but ksh93u+m 1.0.10 (§9) |
| `echo -n`, `echo -e` | **never** (use `printf '%s'`) | yash prints `-n`; dash prints `-e` (§8) |

The map's table said "`xargs -r` use on Linux only; a no-op on macOS, so a macOS-reachable script must not depend on it". That reasoning is inverted: BSD `xargs` already does not run on empty input, so `-r` is safe on both (unverified on macOS: read only). The verdict becomes "use".

### 5. pipefail in sh: the probe, the variants, the dash version chase

#### 5.1 The plant and the twin (a)

`FX/sh-pipefail-bare.sh` (`set -o pipefail || true` then `echo reached`) under `matrix.sh posix`:

```text
== dash 0.5.12 (deb12)     sh-pipefail-bare.sh: 3: set: Illegal option -o pipefail   -> exit 2     (no "reached")
== posh 0.14.1             sh-pipefail-bare.sh:3: set: pipefail: bad option          -> exit 1     (no "reached")
== busybox ash 1.35 / 1.37, mksh, ksh93u+m x2, yash, bash 3.2/5.2 --posix, zsh sh:   reached   -> exit 0
```

Twin `FX/sh-pipefail-probe.sh` (`(set -o pipefail) 2>/dev/null && set -o pipefail`): `reached`, exit 0 on all 11 interpreters. `|| true` does not help: POSIX makes an error in a special built-in exit a non-interactive shell ("Special built-in utility error: shall exit", with the note that the shell exits "only if the special built-in utility is executed directly. If it is executed via the command utility, the shell shall not exit") ([chap02, 2.8.1 consequences of shell errors](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)).

#### 5.2 Which guard shapes survive (MEASURED, nine one-file variants `FX/var/pf-*.sh`, `FX/out/pf-*.txt`)

| Guard | dash 0.5.12-2 | posh 0.14.1 | all other 9 interpreters |
|---|---|---|---|
| `set -o pipefail` | ABORT | ABORT | ok |
| `set -o pipefail \|\| true` | ABORT | ABORT | ok |
| `set -o pipefail 2>/dev/null \|\| true` | ABORT | ABORT | ok |
| `eval "set -o pipefail" 2>/dev/null \|\| :` | ABORT | ABORT | ok |
| `command set -o pipefail 2>/dev/null \|\| :` | **ok** (POSIX exemption) | ABORT | ok |
| `(set -o pipefail) 2>/dev/null && set -o pipefail` | ok | ok | ok |
| `if (set -o pipefail) 2>/dev/null; then set -o pipefail; fi` | ok | ok | ok |
| `set -eu` then the one-line probe | ok | ok | ok |
| `set -e` + `has_pf() { (set -o pipefail) 2>/dev/null; }` + `has_pf && set -o pipefail` | ok | ok | ok |

The probe idiom did not fail anywhere. `command set -o pipefail` is a trap: it survives dash but posh 0.14.1 still aborts, so only the subshell probe is portable.

#### 5.3 The probe silently disables pipefail where it is missing

`FX/sh-pipefail-effect.sh` (probe, then `false | true; echo "pipeline-status=$?"`):

```text
dash 0.5.12 (deb12): pipeline-status=0      posh 0.14.1: pipeline-status=0
busybox ash 1.35/1.37, mksh, ksh93u+m x2, yash, bash 3.2/5.2 --posix, zsh sh: pipeline-status=1
```

So the probe changes behaviour per host. A script whose correctness needs pipefail is a bash script. ShellCheck's own wiki recommends the same probe and states the consequence: "This will set the flag on platforms where sh is linked to ash, busybox, or bash, but do nothing if sh is dash" ([SC3040](https://www.shellcheck.net/wiki/SC3040)); shellspec uses it (`shellspec@f2d13f991885:helper/spec_helper.sh:17-23`, with the comment "TODO: set -o pipefail will be allowed in POSIX issue 8").

#### 5.4 The dash version chase (dash 0.5.12-12 accepts pipefail while 0.5.12-2 aborts)

| Fact | Evidence |
|---|---|
| Upstream dash commit "jobs: Implement pipefail option", Chris Novakovic, 2024-04-05 | [dash.git log grep pipefail](https://git.kernel.org/pub/scm/utils/dash/dash.git/log/?qt=grep&q=pipefail) |
| Debian 0.5.12-7 (2024-05-17): "Upstream patch: - Implement pipefail option (Closes: #1071238)" | [dash 0.5.12-12 changelog](https://metadata.ftp-master.debian.org/changelogs//main/d/dash/dash_0.5.12-12_changelog) lines 79-92 |
| Debian 0.5.12-12 (2025-02-04) is the current package: debian:13 and debian:unstable-slim both print `dash 0.5.12-12` on 2026-10-11 | `docker run --rm debian:unstable-slim sh -c 'dpkg-query -W dash'` -> `dash	0.5.12-12`, `FX/out/posix2024-utils.txt` |
| Ubuntu 24.04 stays at 0.5.12-6ubuntu5 (no pipefail); Ubuntu 25.10/26.04/26.10 carry 0.5.12-12ubuntu2/3 (pipefail) | [plat §1.1](../shell-audit/platform-matrix.md), `FX/out/posix2024-utils.txt`, [Ubuntu2604 readme](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md) line `Dash 0.5.12-12ubuntu3` |
| Upstream tags 0.5.13 ... 0.5.13.5 exist | [dash.git tags](https://git.kernel.org/pub/scm/utils/dash/dash.git/refs/tags) (0.5.13 dated 2025-09-21 by [plat]/[shift]) |

The `-2` abort is the stock `Illegal option -o pipefail` special-builtin error. The version string cannot be used to decide: `dash --version` prints `dash: 0: Illegal option --` and exits 2 on debian:12. The canonical audit that said "Debian 0.5.12-12 lacks pipefail" was wrong; the measured row above is `pipefail=y` for debian:13, ubuntu:25.10/26.04/26.10 and `debian:unstable-slim`.

#### 5.5 ShellCheck interplay

On 0.11.0 the probe itself triggers SC3040 **twice** on `FX/sh-pipefail-probe.sh` (lines 3:9 and 3:41, both `set -o pipefail`). A `# shellcheck disable=SC3040 # reason` placed *inside* the `if` does not cover the subshell probe on the line above it (`FX/sh-probe-suppressed.sh` first version: still `4:12 SC3040`); the directive must sit above the compound command (or above the one-line `&&` list). Green form: `FX/sh-pipefail-probe-lint.sh`, exit 0 on ShellCheck and `reached` on all 11 interpreters. The shellcheck CHANGELOG for unreleased master says "SC3040: Support `pipefail` as specified in POSIX.1-2024" and "Removed: SC3003 ... since ANSI C string is specified in POSIX.1-2024" ([CHANGELOG](https://raw.githubusercontent.com/koalaman/shellcheck/master/CHANGELOG.md)).

### 6. Dollar-single-quote: silent literal output

`FX/sh-dsq.sh` (`printf '%s' $'a\tb' | od -c | head -1`), `matrix.sh posix` (FX/out/sh-dsq.txt):

```text
dash 0.5.12 (deb12)       0000000   $   a   \   t   b      -> exit 0     literal "$a\tb"
yash 2.52                 0000000   $   a   \   t   b      -> exit 0
posh 0.14.1               0000000   $   a   \   t   b      -> exit 0
busybox ash 1.35/1.37, mksh R59c, ksh93u+m x2, bash 3.2/5.2 --posix, zsh sh:   0000000   a  \t   b
```

Twin `FX/sh-dsq-printf.sh` (`printf 'a\tb'`) prints `a  \t   b` on all 11. It is a silent wrong value, not an error, so no run-time alarm exists. ShellCheck 0.11.0 reports it as SC3003 (`FX/out/shellcheck-codes.txt`: `sh-dsq.sh:3:13 ... [SC3003]`, exit 1); [SC3003](https://www.shellcheck.net/wiki/SC3003) suggests `IFS=$(printf ' \n\t')` (careful: `$( )` strips trailing newlines, so a final `\n` needs a literal newline instead).

Chase result: upstream dash added `$'..'` on 2024-06-22 ("parser: Add dollar single quote", Herbert Xu) with follow-ups on 2024-07-24, 2024-11-16, 2025-10-11, 2026-06-07 and 2026-07-18 ([dash.git log grep dollar](https://git.kernel.org/pub/scm/utils/dash/dash.git/log/?qt=grep&q=dollar)). A source build of 0.5.13.5 prints `a  \t   b` (`dsq=y`). No shipped Debian or Ubuntu dash has it yet (debian:unstable-slim: `dsq=n`). Debian backported only pipefail. Until a platform floor of "dash >= 0.5.13" is real, the verdict is **never**.

### 7. read -d, find -print0, xargs -0 and -r

`FX/sh-read-d.sh` (`read -r -d : x` and `read -r -d '' x`), `matrix.sh posix`:

```text
dash 0.5.12:  colon=[] read: Illegal option -d  nul=[]   yash 2.52: `-d' is not a valid option   posh: invalid option -- 'd'
busybox ash 1.35/1.37, mksh, ksh93u+m x2, bash 3.2/5.2 --posix, zsh sh:  colon=[a] nul=[p1]
```

The failure is a diagnostic on stderr with exit status 0 from the script, so `read -d` in a pipeline body silently leaves the variable empty; upstream dash 0.5.13.5 also answers `read_d=n`. POSIX's own example for NUL-separated names is `find . -print0 | while IFS= read -rd "" file` ([find, EXAMPLES](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/find.html)), which is therefore not dash-portable. Dash-portable replacements: `find ... -exec cmd {} +` (the standard's preferred form), or `find -print0 | xargs -0 -r cmd`.

`find -print0` and `xargs -0`: `y` on all 19 images that have findutils; **absent** (`find_print0=n xargs_0=n`, command not found) on amazonlinux:2023 and opensuse/leap:latest ([plat §1.3](../shell-audit/platform-matrix.md) agrees: both lack findutils). busybox 1.37 find and xargs support `-print0`/`-0`/`-r` in the default Alpine build (`FX/out/posix2024-utils.txt` rows alpine:3.22, busybox:1.37); the Kconfig option names were not fetched (git.busybox.net returned 404 for the tag path), so "build option" status is unverified.

### 8. realpath, readlink, timeout, test, env, echo -n

| Utility | POSIX.1-2024 | Measured 2026-10-11 | macOS (unverified: read only) |
|---|---|---|---|
| `readlink` | `readlink [-n] file`, no `-f` | `readlink -f` resolves a symlink on 21 of 21 images (`FX/posix2024-utils.sh` key `readlink_f`) | `-f` added in 12.3: `file_cmds-352.40.6@33b700236334:stat/stat.c:222` (`"n"`) vs `file_cmds-353.100.22@e3cc3ca6d5d3:stat/stat.c:242` (`"fn"`) ([plat §3](../shell-audit/platform-matrix.md)) |
| `realpath` | `realpath [-E\|-e] file`; no `-m`, `-s` | plain `realpath` works on 21 of 21 | absent in 12.3 (`shell_cmds-240.100.15`), present from 13.0 (`shell_cmds-278`) |
| `timeout` | exit 124 on timeout; 125/126/127 for errors | `timeout 1 sleep 5` -> 124 on 18 images; **busybox 1.37 -> 143**; `timeout -s KILL 1 sleep 5`: GNU 9.4 -> 137, **uutils 0.2.2 and 0.10.0 -> 124** (`FX/misc-probe.sh`) | no `timeout` directory in `shell_cmds-326` listing (fetched 2026-10-11) |
| `test -nt/-ot/-ef` | added | all interpreters but posh 0.14.1 | n/a |
| `echo -n` | not specified (XSI) | yash 2.52 prints `-n` | Debian Policy requires builtin `echo -n` (Policy 10.4) |

POSIX itself explains why a status of 143 is not what the standard wants: "Some historical timeout implementations exited with status 128+signal_number" and it chose 124 ([timeout, rationale](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/timeout.html)). A portable wrapper treats `124`, `137` and `143` as timed out.

### 9. local in sh and the has_local probe (conflict 13)

Measured (`FX/has-local-*.sh`, `matrix.sh posix`, `FX/out/has-local.txt`):

| Script | ksh93u+m 2023 / 1.0.10 | all others |
|---|---|---|
| `has-local-none.sh` (bare `local x=1` in a function) PLANT | `f[4]: local: not found` **exit 127** | `2 / after-f x=unset`, exit 0 |
| `has-local-rustup.sh` (`has_local() { (PATH='' local _has_local); }; has_local 2>/dev/null \|\| alias local=typeset`) | `2 / after-f x=2`, exit 0 (alias works; **x leaks global**) | `x=unset` |
| `has-local-ocx.sh` (`has_local() { local _ 2>/dev/null; }; has_local \|\| alias local=typeset`) | same as rustup | same |

Rustup documents the leak: "beware this makes variables global with f()-style function syntax in ksh93" (`rust-lang__rustup@61271d00a979:rustup-init.sh:13-23`), and clears `PATH` so a `local` executable cannot pass for the builtin. www-setup copies the idea without the `PATH=''` clearing (`www-setup/src/install.sh:37-40`) and carries `# shellcheck disable=SC3043  # local verified at runtime by has_local()` at line 5. Debian Policy 10.4 mandates `local` with multiple names and assignment for `/bin/sh` ([Policy](https://www.debian.org/doc/debian-policy/ch-files.html)); POSIX rejected it (bug 767).

Decision: **allowed** in `#!/bin/sh` when ksh93 is not a target, with the exact directive text:

```sh
# shellcheck disable=SC3043 # local: dash, ash, bash, mksh, yash, posh; not ksh93 (see header)
```

Installers (which may meet ksh93) keep the probe and use the rustup form (`PATH=''` guard). The directive needs a reason; GREP-5 flags a bare `disable=SC3043`.

### 10. bash --posix and zsh --emulate sh are not portability checks

`FX/bashisms-twin.sh` (array, `${x,,}`, `[[ ]]`, `function`, `<( )`, each guarded with `|| exit N`), `matrix.sh posix`:

```text
dash 0.5.12      Syntax error: "(" unexpected                       -> exit 2
busybox ash 1.35/1.37   syntax error: unexpected "("                -> exit 2
posh 0.14.1      syntax error: `(' unexpected                       -> exit 1
mksh / ksh93     ${x,,}: bad substitution / `,' unexpected          -> exit 1 / 3
yash 2.52        (no diagnostic)                                    -> exit 11
bash 3.2 --posix ${x,,}: bad substitution                           -> non-zero
bash 5.2 --posix accepted                                           -> exit 0
zsh 5.9 emulate sh   bad substitution                               -> exit 1
```

Bash 5.2 in POSIX mode accepts everything, so it validates nothing. The same truth is visible on the images: the `/bin/sh` of 12 of 21 Linux images (alpine x2, busybox:1.37 and the 9 bash-as-sh images) accepts `[[ ]]`, and 9 accept arrays ([plat §1.2](../shell-audit/platform-matrix.md); `FX/out/ash-features-images.txt`). `bash --posix` does enforce one thing dash also enforces: function names with `-`, `.` or `:` (§12). Process substitution `<( )` in a bash-as-sh image depends on the bash version: absent on almalinux:8 (bash 4.4.20) and amazonlinux:2 (4.2.46), present on 5.1+ (almalinux:9/10, AL2023, fedora, leap, arch, nix) (M-A-19, `FX/out/ash-features-images.txt` key `procsub`).

### 11. busybox ash 1.37 on Alpine 3.22

`FX/ash-features.sh` (`matrix.sh posix`, ash 1.37 on `alpine:3.22`; `FX/out/ash-features.txt`):

| y | n |
|---|---|
| `pipefail`, `$'..'`, `[[ ]]`, `${x/b/-}`, `${x:1:2}`, `<( )`, `local`, `read -d`, `==` in `[ ]`, `function f {`, `source`, `$RANDOM`, `echo -e`, `printf -v`, `trap ... ERR`, `${x#a}` | arrays, brace expansion `{a,b}`, `<<<` here-string, `PIPESTATUS`, `${x,,}` |

Version differences inside the same shell family: ash 1.35 (Debian 12 `busybox`) rejects function names containing `-`, `.` or `:`; 1.37 accepts them (`FX/out/funcnames.txt`). `<<<` arrives in BusyBox 1.38.0 ("ash: implement <<<here_string syntax", 2026-05-13, labelled unstable on the news page) ([busybox.net](https://busybox.net/)); Alpine 3.22 and 3.23 still ship 1.37.0 ([plat §1.1](../shell-audit/platform-matrix.md)). ShellCheck 0.11.0 added SC2330 "Warn about unsupported glob matches with [[ .. ]] in BusyBox" ([CHANGELOG](https://raw.githubusercontent.com/koalaman/shellcheck/master/CHANGELOG.md)). Which of these features are compile-time options was not verified (see §7).

### 12. Function definition syntax

`FX/funcnames.sh`, `FX/out/funcnames.txt` (`y` = accepted):

| Form | dash | ash 1.35 / 1.37 | mksh | ksh93u+m | yash | posh | bash `--posix` 3.2/5.2 | bash plain 3.2-5.3 | zsh sh |
|---|---|---|---|---|---|---|---|---|---|
| `f() { :; }` | y | y/y | y | y | y | y | y | y | y |
| `function f { :; }` | **n** | y/y | y | y | y | **n** | y | y | y |
| `function f() { :; }` | **n** | y/y | y | **n** | y | **n** | y | y | y |
| `run-tests() { :; }` | **n** | **n** / y | y | **n** | **n** | **n** | **n** | y | y |
| `function run-tests { :; }` | n | n / y | y | n | y | n | n | y | y |

So: only `name() { ...; }` with `[A-Za-z_][A-Za-z0-9_]*` names is portable to sh; in bash, `function name()` is a ksh93 failure and `-` in a name works in plain bash but not `bash --posix`. ShellCheck: SC3033 (name outside `[a-zA-Z_][a-zA-Z0-9_]*` in sh), SC2112 (`function` with parens), SC2113 (`function f` without parens; 0.11.0 emits SC2113 for `function g { :; }`, see `FX/out/shellcheck-codes.txt`) ([SC3033](https://www.shellcheck.net/wiki/SC3033), [SC2112](https://www.shellcheck.net/wiki/SC2112)).

### 13. macOS /bin/sh (read only)

Status: **unverified: read only**. No macOS host.

- Apple support documents zsh as the default login shell from 10.15 and lists `/bin/bash`, `/bin/dash`, `/bin/ksh`, `/bin/sh`, `/bin/zsh` as valid `chsh` targets ([Apple 102360](https://support.apple.com/en-us/102360)). It does not say what `/bin/sh` runs.
- Apple's bash project ships 3.2.57 in macOS 26.5 (`bash-144@51bf3fc6f26e:version.h:14`, [plat §3](../shell-audit/platform-matrix.md)); `bash.plist` lists the Apple patches including "Do not echo \e as ESC when in posix mode" and "Add deprecation notice when started as an interactive shell" ([apple-oss-distributions/bash bash.plist](https://raw.githubusercontent.com/apple-oss-distributions/bash/bash-144/bash.plist)); its Xcode post-install links `/usr/local/bin/bash -> /bin/bash` ([project.pbxproj](https://raw.githubusercontent.com/apple-oss-distributions/bash/bash-144/bash.xcodeproj/project.pbxproj) shellScript). That project installs `/bin/bash`; no `/bin/sh` target appears in it.
- Apple's `shell_cmds-326` ships a FreeBSD `sh` (import date 2016-10-27, [sh.plist.part](https://raw.githubusercontent.com/apple-oss-distributions/shell_cmds/shell_cmds-326/sh/sh.plist.part)); which binary the `/bin/sh` shim runs on macOS 26 comes only from secondary sources (the shim reads `/private/var/select/sh`, default `/bin/bash`) ([plat §3](../shell-audit/platform-matrix.md), citing the NixOS and Lix threads).

Verdict for the rule text: "macOS `/bin/sh` runs bash 3.2 in POSIX mode by default and can be switched to dash (unverified: read only)". The fleet sentence "macOS `/bin/sh` is dash" at `ocx/.claude/rules/quality-bash.md:110` (also grimoire, index, grimoire-vscode, grimoire-duo, .probe-libc) is wrong ([cfg §5](../shell-audit/config-inventory.md)); GREP-11 finds the six copies (§17).

### 14. The /bin/sh of the 21 images

Method: `FX/run-images.sh FX/posix2024-utils.sh` and `FX/ash-features.sh` (`docker run --rm -i <image> sh < script`), 2026-10-11. `n` = missing or failing. Image versions and bash/dash packages are in [plat §1.1](../shell-audit/platform-matrix.md).

| image | `/bin/sh` | pipefail | `$'..'` | `read -d` | `[[` | `<( )` | find -print0, xargs -0 | timeout rc 124 | env -S |
|---|---|---|---|---|---|---|---|---|---|
| debian:11 | dash | **n** | **n** | **n** | **n** | **n** | y | y | y |
| debian:12 | dash | **n** | **n** | **n** | **n** | **n** | y | y | y |
| debian:13 | dash | y | **n** | **n** | **n** | **n** | y | y | y |
| ubuntu:20.04 | dash | **n** | **n** | **n** | **n** | **n** | y | y | y |
| ubuntu:22.04 | dash | **n** | **n** | **n** | **n** | **n** | y | y | y |
| ubuntu:24.04 | dash | **n** | **n** | **n** | **n** | **n** | y | y | y |
| ubuntu:25.10 | dash | y | **n** | **n** | **n** | **n** | y | y | **n** |
| ubuntu:26.04 | dash | y | **n** | **n** | **n** | **n** | y | y | y |
| ubuntu:26.10 | dash | y | **n** | **n** | **n** | **n** | y | y | y |
| alpine:3.22 | busybox ash | y | y | y | y | y | y | **n** (143) | **n** |
| alpine:3.23 | busybox ash | y | y | y | y | y | y | **n** (143) | **n** |
| busybox:1.37 | busybox ash | y | y | y | y | y | y | **n** (143) | **n** |
| almalinux:8 | bash 4.4.20 (posix mode) | y | y | y | y | **n** | y | y | y |
| almalinux:9 | bash 5.1.8 | y | y | y | y | y | y | y | y |
| almalinux:10 | bash 5.2.26 | y | y | y | y | y | y | y | y |
| amazonlinux:2 | bash 4.2.46 | y | y | y | y | **n** | y | y | **n** |
| amazonlinux:2023 | bash 5.2.15 | y | y | y | y | y | **n (no findutils)** | y | y |
| fedora:latest | bash 5.3.9 | y | y | y | y | y | y | y | y |
| opensuse/leap:latest | bash 5.2.37 | y | y | y | y | y | **n (no findutils)** | y | y |
| archlinux:latest | bash 5.3.20 | y | y | y | y | y | y | y | y |
| nixos/nix | bash 5.3.9 (store path) | y | y | y | y | y | y | y | y |

Reading: a script that passes on the 12 non-dash `/bin/sh` images and fails on the 9 dash images has bashisms (H1 is refuted for the fleet, [fleet #6](../shell-audit/fleet-shell-shape.md), but the image spread is exactly why an agent's local `sh` run proves nothing). Four dash images have pipefail, five do not.

### 15. Extension convention for authored scripts (M-O-04)

Decision: **authored scripts carry `.sh`** (both sh and bash), **`.bash`** only for sourced bash libraries (ShellCheck infers bash from `.bash`, `.ksh`, `.dash`, never from `.sh`), and **no extension** only for (a) commands installed into `PATH` and (b) tool-managed hooks. The gate discovers shebang-only files with `shfmt -f .` (3.13.1) or `shfmt --detect` (3.14.0+).

Evidence:
- Debian Policy 10.4: "When scripts are installed into a directory in the system PATH, the script name should not include an extension such as .sh or .pl" ([Policy 10.4](https://www.debian.org/doc/debian-policy/ch-files.html)). That governs the installed name, not the source file in a repo, so the two do not conflict: the source is `foo.sh`, the install step drops the extension.
- Exemplar extensionless shell shebang files (`FX/count-noext.py` over the 41-repo corpus): mise 1,338 (e2e test cases, one file per case, shebang picks the shell), nvm 328 (test files), pyenv 49 and rbenv 28 (libexec subcommands, `#!/usr/bin/env bash`), shellspec 30, git 19, bats-core 17, k3s 15. Installers use `.sh`: `k3s-io__k3s@82a6ddcd820b:install.sh`, `denoland__deno_install@41d4676f8677:install.sh`, `docker__docker-install@2b32480025b2:install.sh`.
- Fleet: 6 authored extensionless files, 5 tool-managed `bd` hooks and 1 served bootstrap `setup-grimoire/site/sh` ([fleet #3](../shell-audit/fleet-shell-shape.md)); no glob reaches them (conflict 7).

Verification: GREP-6 lists extensionless shebang files (red on `FX/verif/plant/noext-script`, empty on the `install.sh` twin); `shfmt -f` finds them for the gate.

### 16. Floor-table format and the "tested on" column set

Format precedent: the nix set's `ID | Rule | Rationale | Verification | Severity | Floor / impl` table, where the last cell names the implementation and version and any exception ("CppNix >=2.31.5. Lix 2.95.2 leaves the `formatter` clause unchecked") (`rules/nix-quality/flakes.md:60-65`). SH-DIAL adopts the same six columns with `Floor / shell` as the last: it names the shell and version the rule was watched on, plus exceptions.

Pin set for the "tested on" column (M-A-16), all runnable via `matrix.sh posix|bash`:

| Role | Interpreter | Why |
|---|---|---|
| Strict floor | dash 0.5.12-2 (`shellzoo:deb12`) | rejects pipefail, `$'..'`, `read -d`, `[[ ]]`, arrays; ships on Debian 12 and the 24.04 runner |
| Newer dash | dash 0.5.12-12 (`shellzoo:deb13`) | pipefail present |
| Minimal userland | busybox ash 1.37 (`alpine:3.22`) | Alpine, containers, initramfs |
| System bash | bash 3.2 `bash:3.2` (not `--posix` evidence, see §10) | macOS `/bin/bash` stand-in; Docker image is Alpine-userland, so BSD userland is not covered |
| Strict POSIX | posh 0.14.1 | catches `local`-style gaps, lacks `-nt`; not a floor |
| Coverage | mksh R59c, yash 2.52 | `echo -n`, `$'..'`, `read -d` divergences |
| Runnable but optional | ksh93u+m 1.0.10 | only shell without `local`; the map listed it as read only, but it runs on the matrix |
| Read only | FreeBSD `sh`, macOS `/bin/sh` | no host |

Every row of the floor table names the image and the date it was measured, and is re-measured by `matrix.sh` (M-A-03).

### 17. Fleet and ocx findings

Defects are reported, never fixed (owner Q6). Reproducers are the grep commands in the Normative section run from `/home/mherwig/dev` with the exclusion list in `FX/fleet-greps2.sh`/`FX/fleet-greps3.sh`.

| Finding | Location | Reproducer |
|---|---|---|
| The only `local` in an sh script is probed at runtime, as claimed | `www-setup/src/install.sh:5` (`# shellcheck disable=SC3043 # local verified at runtime by has_local()`), `:37-40` (`set -eu; has_local() { local _ 2>/dev/null; }; has_local \|\| alias local=typeset`) | `FX/has-local-ocx.sh` (ksh93: exit 0, x leaks; without the probe exit 127) |
| `has_local` here lacks rustup's `PATH=''` guard; harmless unless a `local` executable is on PATH | `www-setup/src/install.sh:39` vs `rust-lang__rustup@61271d00a979:rustup-init.sh:15-23` | reading |
| "macOS `/bin/sh` is dash" is asserted in 6 repos | `ocx/.claude/rules/quality-bash.md:110`, same line in grimoire, grimoire-vscode, grimoire-duo, index, .probe-libc | GREP-11 over `/home/mherwig/dev` |
| Fleet sh-shebang `.sh` files have no bare pipefail, no `$'..'`, no multi-argument shebangs, no `read -d`, no `test -a/-o` | n/a (clean, 0 hits for GREP-1, 2, 3, 7, 8 on the raw 196-file scope) | `FX/fleet-greps2.sh`, `FX/fleet-greps3.sh` |
| `echo -n` in an `sh` script | `rust-devcontainer-cli/reference-cli/src/test/container-features/example-v2-features-sets/remote-user/src/whoisremoteuser/install.sh:9` | GREP-9 |
| `readlink -f` in repo scripts (Linux-only, GNU-ism) | `ocx-mirror/test/bazel_accept.sh:26,52`; `rust-devcontainer-cli/reference-cli/scripts/install.sh:427` (guarded by `readlink "$0" \|\| readlink -f "$0" \|\| echo "$0"`) | GREP-10 |
| 154 `#!/usr/bin/env bash` vs 1 `#!/bin/bash` | [fleet #5](../shell-audit/fleet-shell-shape.md) | confirms the `env bash` convention; the single `/bin/bash` file needs the "system bash 3.2" header or a switch |
| 124 `.sh` files carry neither a shebang nor a `# shellcheck shell=` line on the raw scope | doc-example snippets (`ocx/website/src/_scripts/...`), catalog check fixtures, `grimoire-indexer/templates/ci/*.sh` | GREP-4; high false-positive rate, scope it to authored non-fixture directories |

## Normative guidance candidates

Format: `ID | Rule | Rationale | Verification | Run?`. Severity tiers follow the house MUST (Block), SHOULD (Warn), CONSIDER (Suggest); the last column names the shell and version each rule was watched on. All grep verifications print the violation: **empty output is a pass**. They need GNU grep 3.x (`-z`, `-Z`); BSD/macOS grep is unverified: read only. `FX/check-greps.sh` runs every GREP-n against `FX/verif/plant` (must print) and `FX/verif/twin` (must print nothing).

| ID | Rule | Rationale | Verification | Run? | Sev | Floor / shell |
|---|---|---|---|---|---|---|
| SH-DIAL-01 | Give every authored shell file a dialect: a shebang, or for a shebang-less sourced file `# shellcheck shell=sh` or `shell=bash` as the first line. | shfmt 3.13.1 parses a shebang-less `.sh` as bash; only ShellCheck notices (SC2148, exit 1). | GREP-4: `grep -rL -e '^#!' -e '^# shellcheck shell=' --include='*.sh' .` lists files with neither; ShellCheck SC2148 (default checks). | yes: `FX/verif/plant/mixed.sh` listed, ShellCheck exit 1; twins `mixed-twin.sh`, `mixed-directive.sh` not listed, exit 0 | MUST | ShellCheck 0.11.0; shfmt 3.13.1 |
| SH-DIAL-02 | Make the body match the declared dialect: run ShellCheck with the shebang dialect (`#!/bin/sh` -> SC3xxx on) and `shfmt -d` (`#!/bin/sh` -> `tried parsing as posix`). Never treat `shfmt -d` as the dialect gate for a file without a shebang. | A `#!/bin/sh` file with an array is a parse error in shfmt and SC3030/SC3054 in ShellCheck; a shebang-less one is accepted by shfmt. | `shellcheck -f gcc FILE` exit 1 with SC3030, SC3054; `shfmt -d -i 2 FILE` exit 1 `arrays are a bash/mksh/zsh feature; tried parsing as posix`. | yes: `FX/mixed-sh-shebang.sh` (both exit 1), `FX/mixed-twin.sh` (both 0) | MUST | ShellCheck 0.11.0, shfmt 3.13.1 |
| SH-DIAL-03 | Choose dialect by script kind per the table in Findings 2: installer/bootstrap `#!/bin/sh`; repo tool, test helper `#!/usr/bin/env bash` with bash 3.2; pinned CI helper declares its floor; sourced library has no shebang. | Conflict 2: confirmed; `/bin/sh` exists on 21 of 21 images, bash on 18 of 21. | Reading heuristic: line 2 names kind and floor (header convention). | no (heuristic only) | MUST | n/a |
| SH-DIAL-04 | Test an installer or bootstrap `#!/bin/sh` script on dash 0.5.12-2, busybox ash 1.37 and bash 3.2 `--posix`; add posh 0.14.1 when it must be strictly POSIX.1-2017. | These reject what the other 12 of 21 `/bin/sh` images accept. | `matrix.sh posix SCRIPT`: every dash, ash, mksh and posh row exits 0 with the same output. | yes: `FX/bashisms-twin.sh` -> dash exit 2, ash exit 2, posh exit 1 (red) | MUST | dash 0.5.12-2; busybox 1.37 |
| SH-DIAL-05 | Write `#!/usr/bin/env bash` for bash scripts. `#!/bin/bash` only when the header says `Floor: system bash 3.2`. Never `#!/bin/sh` for bash code. | `/bin/bash` is absent on nixos/nix (exit 126) and on Alpine (127); `env bash` fails only where bash is not installed. | Reading heuristic plus `grep -rn -e '^#!/bin/bash' --include='*.sh' .` listing; ShellCheck SC2239 for relative shebang paths. | yes (images): `FX/sb-bin-bash.sh` on nixos/nix exit 126, `sb-env-bash.sh` exit 0 | SHOULD | nixos/nix 5.3.9; alpine:3.22 |
| SH-DIAL-06 | Floor every unpinned bash script at 3.2. A pinned-interpreter script writes `# Floor: bash X (pinned: <image>)` on line 2 and the one-line `BASH_VERSINFO` guard as its first command. | Without the guard, bash 3.2 prints `declare: -A: invalid option`, continues, exits 0 and prints wrong data. | `matrix.sh bash SCRIPT` on 3.2 must exit 1 with the guard message, never exit 0 with stderr; reading heuristic for the guard position. | yes: `FX/guard-none.sh` 3.2 exit 0 + `count=1 a=2 b=2` (red); `guard-first.sh` 3.2 exit 1 clean message (green) | MUST | bash 3.2.57 (image bash:3.2) |
| SH-DIAL-07 | In `#!/bin/sh` code enable pipefail only as `(set -o pipefail) 2>/dev/null && set -o pipefail` on one line. Never bare, never `\|\| true`, never `eval`, never `command set`. Never let correctness depend on it. | Special-builtin errors exit dash 0.5.12 (2) and posh (1); the probe is silent where pipefail is missing. | GREP-1: `grep -rlzZE -e '^#!/bin/sh' -e '^#!/usr/bin/env sh' --include='*.sh' . \| xargs -0 -r grep -nE -e '^[[:space:]]*set [^#]*pipefail'` (prints the bare line). | yes: plant `set -o pipefail \|\| true` printed; twin empty; `matrix.sh posix` dash exit 2, posh exit 1 vs 11/11 exit 0 | MUST | dash 0.5.12-2/-6ubuntu5; posh 0.14.1 |
| SH-DIAL-08 | Suppress SC3040 on the probe with a reason, placed above the `if` or the `&&` list: `# shellcheck disable=SC3040 # probed in a subshell`. Pin ShellCheck 0.11.0 until a dash-with-`$'..'` floor exists, and keep GREP-1/GREP-2. | A directive inside the `if` leaves the probe line flagged; unreleased master relaxes SC3040 and removes SC3003. | `shellcheck FILE` exit 0 on the twin; `shellcheck --version` pinned. | yes: `FX/sh-pipefail-probe.sh` exit 1 (SC3040 x2), `FX/sh-pipefail-probe-lint.sh` exit 0, `sh-probe-suppressed.sh` exit 0 | SHOULD | ShellCheck 0.11.0 |
| SH-DIAL-09 | Never write `$'..'` in `#!/bin/sh`; use `printf`. | dash -2/-6ubuntu5/-12, yash 2.52, posh print the literal text with exit 0. | GREP-2: `grep -rlzZE -e '^#!/bin/sh' -e '^#!/usr/bin/env sh' --include='*.sh' . \| xargs -0 -r grep -nE -e "^[\$]'" -e "[[:space:]=(;&][\$]'"`; ShellCheck SC3003 on 0.11.0. | yes: `FX/sh-dsq.sh` printed; `sh-dsq-printf.sh` empty; matrix shows literal on dash/yash/posh | MUST | dash 0.5.12-12 |
| SH-DIAL-10 | Never use `read -d` in `#!/bin/sh`; use `find -exec cmd {} +` or `find -print0 \| xargs -0 -r cmd`. | `read -d` is absent on every dash incl. upstream 0.5.13.5, yash, posh; the failure is a stderr line and an empty variable. | GREP-7 (`read ... -d` in sh-shebang files); ShellCheck SC3045. | yes: `FX/sh-read-d.sh` printed; `verif/twin/sh-read.sh` empty; matrix dash `Illegal option -d` | MUST | dash 0.5.12-12; yash 2.52 |
| SH-DIAL-11 | Never write `-a` or `-o` inside `[ ]` / `test`; use `[ p ] && [ q ]`. | Removed by POSIX.1-2024 (Defect 1330); ambiguous grammar; Debian Policy keeps them working but that is a compatibility floor, not a style. | GREP-8; ShellCheck SC2166. | yes: `verif/plant/sh-misc.sh:2` printed; twin empty; SC2166 in `sh-features.sh` | SHOULD | POSIX.1-2024 |
| SH-DIAL-12 | Use `printf '%s'` / `printf '...\n'` instead of `echo -n`, `echo -e`, or echo with a backslash in `#!/bin/sh`. | yash 2.52 prints `-n`; dash interprets `\t` and prints `-e`. | GREP-9; ShellCheck SC3037. | yes: `verif/plant/sh-misc.sh:3-4` printed; twin empty | MUST | yash 2.52; dash 0.5.12 |
| SH-DIAL-13 | `find -print0`, `xargs -0` and `xargs -r` are allowed in sh; `command -v find xargs` first in minimal containers (AL2023, Leap 16.0 images lack findutils). Prefer `find -exec ... {} +` where it fits. | POSIX.1-2024 adds them; present wherever findutils is; the standard prefers `-exec`. | Reading heuristic; `FX/run-images.sh FX/posix2024-utils.sh` keys `find_print0`, `xargs_0`. | yes (probe table, 21 images); rule itself is a heuristic | SHOULD | busybox 1.37, GNU findutils |
| SH-DIAL-14 | Do not use `readlink -f` or `realpath -m/-s` in code that can run on macOS. Use plain `realpath FILE` on Linux; for macOS-reachable code probe or resolve with `cd -P` and `pwd -P`. State "unverified: read only" for the macOS claim. | Not POSIX (`readlink [-n]`, `realpath [-E\|-e]`); macOS gained them in 12.3/13.0. | GREP-10: `grep -rnE -e 'readlink[[:space:]]+-[a-zA-Z]*f' -e 'realpath[[:space:]]+-[a-zA-Z]*[ms]' --include='*.sh' .`. | yes: `verif/plant/sh-misc.sh:5-6` printed; twin empty | SHOULD | GNU coreutils; macOS unverified |
| SH-DIAL-15 | Probe `command -v timeout` and treat exit 124, 137 and 143 as "timed out"; never compare against 124 alone. | busybox 1.37 returns 143; `timeout -s KILL` returns 137 on GNU, 124 on uutils; `timeout` is absent on macOS (read only). | Reading heuristic; `docker run --rm alpine:3.22 sh -c 'timeout 1 sleep 5; echo $?'` prints 143. | yes (measurement), no (rule is a heuristic) | SHOULD | busybox 1.37; uutils 0.10.0 |
| SH-DIAL-16 | Use `test -nt/-ot/-ef` freely in sh, but not in code that must run on strictly POSIX.1-2017 shells (posh 0.14.1, Debian package scripts). | POSIX.1-2024 adds them; posh fails all three. | `matrix.sh posix FX/posix2024-utils.sh` keys `test_nt test_ot test_ef`. | yes (measurement) | CONSIDER | posh 0.14.1 |
| SH-DIAL-17 | `local` is allowed in `#!/bin/sh` when ksh93 is not a target, with exactly: `# shellcheck disable=SC3043 # local: dash, ash, bash, mksh, yash, posh; not ksh93 (see header)`. Installers use the rustup probe: `has_local() { (PATH='' local _has_local); }` then `has_local 2>/dev/null \|\| alias local=typeset`. A bare `disable=SC3043` without a reason is a defect. | ksh93u+m 1.0.10 exits 127 on bare `local`; the probe keeps it running but leaks the variable global. | ShellCheck SC3043 red without the directive; GREP-5: `grep -rnE -e 'disable=SC3043[[:space:]]*$' --include='*.sh' .`; `matrix.sh posix` on `has-local-*.sh`. | yes: `verif/plant/sh-local-bare.sh` SC3043 exit 1, `sh-local-reason.sh` exit 0; GREP-5 prints `sh-local-noreason.sh:2`; ksh93 exit 127 vs 0 | MUST | ksh93u+m 1.0.10 |
| SH-DIAL-18 | Put at most one argument after the interpreter in a shebang; set options in the body (`set -eo pipefail`). No `#!/usr/bin/env bash -e`; no `env -S` unless the header pins GNU coreutils >= 8.30 or uutils >= 0.10. | The kernel passes the rest as one argument; busybox env and coreutils 8.22 lack `-S`. | ShellCheck SC2096; GREP-3: `grep -rnE -e '^#![[:space:]]*/[^[:space:]]+[[:space:]]+[^[:space:]]+[[:space:]]+[^[:space:]]' --include='*.sh' .`. | yes: `FX/shebang-args.sh` exit 1 `invalid option`; `shebang-env-flag.sh` exit 127; both SC2096 and GREP-3; twin exit 0 | MUST | Linux 6.18; GNU coreutils 9.4; busybox 1.37 |
| SH-DIAL-19 | Take portability evidence from dash, posh, busybox ash or mksh runs and ShellCheck `-s sh`. Never from `bash --posix`, `zsh --emulate sh` or the author's `/bin/sh`. | bash 5.2 `--posix` accepts arrays, `${x,,}`, `<( )`, `[[ ]]` and `function`; 12 of 21 images' `/bin/sh` accept bashisms. | `matrix.sh posix SCRIPT`: dash/ash/posh rows. | yes: `FX/bashisms-twin.sh` bash 5.2 `--posix` exit 0 `accepted`, dash exit 2 | MUST | bash 5.2.15 `--posix` |
| SH-DIAL-20 | In sh define functions as `name() { ...; }` with `[A-Za-z_][A-Za-z0-9_]*` names; no `function` keyword. | dash and posh reject `function`; dash, bash `--posix` and ash 1.35 reject `-` in names; ksh93 rejects `function f()`. | ShellCheck SC3033, SC2112, SC2113 (default checks, `-s sh`). | yes: `FX/sh-features.sh` lines 8-9 flag SC2113 and SC3033 | SHOULD | dash 0.5.12; ksh93u+m |
| SH-DIAL-21 | Authored scripts carry `.sh` (bash or sh); `.bash` only for sourced bash libraries; extensionless only for installed commands and tool-managed hooks. Discover shebang-only files with `shfmt -f .`. | Conflict 7: no glob matches a shebang; `.sh` alone does not select a dialect, so SH-DIAL-01 still applies. | GREP-6: `grep -rIlE -e '^#!/' --exclude='*.*' --exclude-dir=.git .` lists extensionless scripts; `shfmt -f .` lists them. | yes: GREP-6 prints `verif/plant/noext-script`, empty on `install.sh`; `shfmt -f` lists it | SHOULD | shfmt 3.13.1 |
| SH-DIAL-22 | Never say macOS `/bin/sh` is dash. Write "bash 3.2 in POSIX mode by default, selectable to dash (unverified: read only)". | Apple documents bash 3.2.57 and no dash default; the claim is asserted in six fleet repos. | GREP-11: `grep -rnF -e 'macOS `/bin/sh` is dash' --include='*.md' .`. | yes: `verif/plant/notes.md` printed; twin empty; fleet: 6 hits | SHOULD | n/a |
| SH-DIAL-23 | Floor tables name image or version and date per row, use the `Floor / shell` last column, and cite a `matrix.sh` run. | The nix set's `Floor / impl` precedent; version strings do not identify features (dash 0.5.12-12 vs -2). | Reading heuristic: every row has an image or version and a date. | no (heuristic only) | SHOULD | n/a |
| SH-DIAL-24 | Never decide a feature from a version string (`dash --version`, `dpkg -l dash`). Probe the feature in a subshell. | Debian backported pipefail into 0.5.12-7 only; `dash --version` does not exist. | Reading heuristic; `docker run --rm debian:12 dash --version` prints `dash: 0: Illegal option --`, exit 2. | yes (the command), no (rule is a heuristic) | SHOULD | dash 0.5.12 |

## Verification runs

All run 2026-10-11 from `FX`, using `matrix.sh` at `/home/mherwig/.cache/research-lang/shell-tools/matrix.sh`, `run.sh` for ShellCheck 0.11.0 / shfmt 3.13.1, GNU grep 3.12. "Red" = the planted violation was caught; "green" = the twin passed.

| # | Fixture(s) | Command | On the violation | On the twin | Relevant lines |
|---|---|---|---|---|---|
| V01 | `sh-pipefail-bare.sh` / `sh-pipefail-probe.sh` | `matrix.sh posix FX/sh-pipefail-bare.sh` | dash 0.5.12 **exit 2**, posh 0.14.1 **exit 1**, no `reached` (red) | 11 of 11 `reached`, exit 0 (green) | `set: Illegal option -o pipefail`; `set: pipefail: bad option` |
| V02 | `var/pf-*.sh` (9 guard shapes) | `matrix.sh posix FX/var/pf-<name>.sh` per shape | bare, `\|\| true`, `2>/dev/null \|\| true`, `eval`: ABORT on dash and posh; `command set`: ABORT on posh only (red) | probe forms: ok on 11 of 11 (green) | table in §5.2 |
| V03 | `sh-pipefail-effect.sh` | `matrix.sh posix` | dash, posh `pipeline-status=0` (pipefail silently off) | other 9: `pipeline-status=1` | §5.3 |
| V04 | `sh-dsq.sh` / `sh-dsq-printf.sh` | `matrix.sh posix` | dash, yash, posh print `$ a \ t b`, exit 0 (silent, red) | all 11 print `a \t b` (green) | §6 |
| V05 | `posix2024-utils.sh` | `FX/run-images.sh FX/posix2024-utils.sh` (21 images) and `matrix.sh posix` | measurement table, not a red/green pair | n/a | §4.1, §14 |
| V06 | `shebang-args.sh` / `shebang-args-twin.sh` | `docker run --rm -v "$PWD":/w -w /w <img> sh -c ./shebang-args.sh` on debian:12, alpine:3.22, amazonlinux:2, ubuntu:25.10, 26.04 | `/bin/bash: - : invalid option`, **exit 1** on all 5 (red) | `reached`, exit 0 (green) | §3.2 |
| V07 | `shebang-env-flag.sh` | same | `env: 'bash -e': No such file or directory`, **exit 127** (alpine: `can't execute 'bash -e'`) | `shebang-args-twin.sh` exit 0 | §3.2 |
| V08 | `shebang-env-S.sh` | same | alpine **exit 1** (`unrecognized option: S`), amazonlinux:2 **exit 125** (red where unsupported) | debian:12, ubuntu:25.10, 26.04 exit 0 | §3.2 |
| V09 | `mixed.sh` family | `bash FX/check-mixed.sh` (`shfmt -d -i 2`, `shellcheck`) | `mixed.sh`: shfmt 0, ShellCheck **1** (SC2148); `mixed-sh-shebang.sh`: shfmt **1** + ShellCheck **1** (red) | `mixed-twin.sh`, `mixed-directive.sh`: 0 and 0 (green) | §1 |
| V10 | `sh-features.sh` / `sh-probe-suppressed.sh` | `run.sh shellcheck -f gcc FILE` | exit 1: SC3040, SC3003, SC3045, SC2166, SC3043, SC2113, SC3033, SC3037, SC3010, SC3030 | `sh-probe-suppressed.sh` exit 0; `sh-pipefail-probe-lint.sh` exit 0 | `FX/out/shellcheck-codes.txt` |
| V11 | `sh-pipefail-probe.sh` | same | exit 1, SC3040 at 3:9 and 3:41 (probe line flagged even with a directive inside the `if`) | `-lint` variant exit 0 | §5.5 |
| V12 | `shebang-args.sh` etc. | `run.sh shellcheck -f gcc FILE` | SC2096 **error**, exit 1, on `#!/bin/bash -e -o pipefail` and `#!/usr/bin/env bash -e` | `shebang-env-S.sh`, `shebang-one-flag.sh`, twin: exit 0 | `FX/out/shellcheck-codes.txt` |
| V13 | `bashisms-twin.sh` | `matrix.sh posix` | dash **2**, ash **2**, posh **1**, mksh **1**, ksh93 **3** (red) | bash 5.2 `--posix` **0** `accepted` (the false green) | §10 |
| V14 | `guard-none.sh` / `guard-first.sh` | `matrix.sh bash` and `docker run bash:3.2` | 3.2: stderr `declare: -A: invalid option`, stdout `count=1 a=2 b=2`, **exit 0** (silent wrong) | `guard-first.sh` 3.2 **exit 1** `needs bash >= 4 (found 3.2.57(1)-release)`; 4.0-5.3 exit 0 | §2.1 |
| V15 | `has-local-none.sh` / `-rustup.sh` / `-ocx.sh` | `matrix.sh posix` | ksh93u+m (both) `local: not found`, **exit 127** (red) | probes: exit 0 on 11 of 11 (ksh93 prints `x=2`, leak) | §9 |
| V16 | `sh-read-d.sh` | `matrix.sh posix` | dash, yash, posh: diagnostic and empty variables | busybox, mksh, ksh93, bash, zsh: `colon=[a] nul=[p1]` | §7 |
| V17 | `funcnames.sh`, `ash-features.sh` | `matrix.sh posix` / `matrix.sh bash` / `matrix.sh zsh` | tables in §11 and §12 | n/a | measurement |
| V18 | `sb-*.sh` | `docker run --rm -v "$PWD":/w -w /w <img> sh -c ./sb-bin-bash.sh` | nixos/nix **exit 126**, alpine:3.22 and busybox:1.37 **exit 127** (red) | `sb-env-bash.sh` on nixos/nix **exit 0**; `sb-bin-sh.sh` exit 0 everywhere | §3.1 |
| V19 | `build-dash.sh` | build upstream dash 0.5.13.5 in `debian:13`, run `posix2024-utils.sh`, `sh-dsq.sh`, `sh-pipefail-effect.sh` | n/a (measurement) | `pipefail=y dsq=y read_d=n`; `sh-dsq.sh` prints `a \t b`; `pipeline-status=1` | `FX/out/dash-0.5.13.5.txt` |
| V20 | `verif/` + `check-greps.sh` GREP-1 | `bash FX/check-greps.sh` | `plant/sh-pipefail-bare.sh:3:set -o pipefail \|\| true` (exit 0) | empty (xargs exit 123 = grep found nothing) | `FX/out/check-greps.txt` |
| V21 | GREP-2 | same | `plant/sh-dsq.sh:3:printf '%s' $'a\tb' \| od -c \| head -1` | empty | same |
| V22 | GREP-3 | same | `plant/shebang-args.sh:1:#!/bin/bash -e -o pipefail`; `plant/shebang-env-flag.sh:1:#!/usr/bin/env bash -e` | empty (exit 1) | same |
| V23 | GREP-4 | same | `plant/mixed.sh` | empty (`mixed-twin.sh`, `mixed-directive.sh`, all shebang or directive files absent) | same |
| V24 | GREP-5, GREP-6 | same | `plant/sh-local-noreason.sh:2:# shellcheck disable=SC3043`; `plant/noext-script` | empty (exit 1) both | same |
| V25 | GREP-7, 8, 9, 10, 11 | same, extra block | `plant/sh-read-d.sh:3`; `plant/sh-misc.sh:2` (`-a`); `:3-4` (`echo -n`, `echo -e`); `:5-6` (`readlink -f`, `realpath -m`); `plant/notes.md:1` | empty on every twin | `FX/out/check-greps-extra.txt` |
| V26 | SC3043 | `run.sh shellcheck -f gcc FX/verif/plant/sh-local-bare.sh` | `SC3043 'local' is undefined`, exit 1 | `twin/sh-local-reason.sh` exit 0 | `FX/out/check-tools.txt` |
| V27 | `shfmt -f` | `run.sh shfmt -f FX/verif/plant` | lists `noext-script` and the other shell files in `plant` (exit 0) | `twin` lists `install.sh` and the other twins (exit 0) | `FX/out/check-tools.txt` |

Failures to go red or adjustments made while measuring:

- GREP-1 and GREP-2 first used `^#!(/bin/sh|/usr/bin/env sh)` over `-l` lines; they went red on the plant but also hit 6 fleet files whose `#!/bin/sh` text sat inside a heredoc (`ocx/test/scenarios/package-push/single-layer-new.sh`, etc.). Re-anchored with `grep -z` so `^` matches only at the file start (verified: a `#!/bin/sh` line inside a heredoc is not listed); the final form has 0 fleet hits. The first `-P` form failed because GNU grep `-P` accepts one pattern only.
- GREP-2's first `$'` pattern also matched `*'$'*` (`www-setup/src/install.sh:626`) and `'... $'` in a string (`oils Build.sh:2`). The final pattern requires the `$'` to follow a line start, space, `=`, `(`, `;` or `&`; a residual false positive remains for a `$'` at the end of a single-quoted string preceded by a space.
- The file lists must be NUL-delimited (`-Z` / `xargs -0`) because the nvm corpus has filenames with quotes (`xargs: unmatched single quote`).
- A probe harness that ran the variants through `sh -c` measured the container's `/bin/sh` instead of the interpreter under test (every column was dash); replaced by one file per variant so each interpreter runs it itself.
- A directive placed inside the `if` did not silence the probe's own SC3040 (§5.5); fixed in the twin by moving it above.
- `shfmt -d` without `-i 2` diffs the fixtures' indentation (tabs by default); the dialect checks used `-i 2`.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| SH-DIAL-01, 21 (declare dialect, extension) | installers `k3s-io__k3s@82a6ddcd820b:install.sh`, `denoland__deno_install@41d4676f8677:install.sh:1-5`, `docker__docker-install@2b32480025b2:install.sh` are `.sh` with `#!/bin/sh` and `set -e`; the exemplar histogram has `#!/usr/bin/env bash` 1,927 vs `#!/bin/bash` 79 ([ex](../shell-audit/exemplar-shape.md)) | extensionless by design: pyenv/rbenv libexec (`rbenv__rbenv@07e9b1e297a5:bin/rbenv:1`, 28 files) and mise e2e (1,338 files), nvm tests (328); consistent with Debian Policy for installed commands, contradicting "always `.sh`" only for test cases |
| SH-DIAL-05 (`env bash`) | pyenv, rbenv, bats-core, mise use `#!/usr/bin/env bash` | Homebrew uses `#!/bin/bash` plus a `BASH_VERSION` abort (`Homebrew__install@8ab1549dfa11:install.sh:1,15-19`); k3s 31 and rustup 7 files use `/bin/bash` |
| SH-DIAL-06 (guard first) | `bats-core@0c92eb4c418d:bin/bats:6-15` (guard first, message `needs to be run by Bash >= 3.2`); `pyenv@d28b750767d4:libexec/pyenv-rehash:139` (`((${BASH_VERSINFO[0]} > 3))` around `declare -A`) | none seen; fleet has 0 guards ([fleet #10](../shell-audit/fleet-shell-shape.md)) |
| SH-DIAL-07 (pipefail probe) | `shellspec@f2d13f991885:helper/spec_helper.sh:17-23` (`( set -o pipefail ) 2>/dev/null` with `SC3040` disable); ShellCheck wiki SC3040 recommends the same probe | bare pipefail in sh-shebang exemplar files: 0 hits for GREP-1 over the 41-repo corpus |
| SH-DIAL-09 (no `$'..'` in sh) | most sh exemplars avoid it (GREP-2 finds 3 lines in `#!/bin/sh` files) | `acmesh-official__acme.sh@807da6498377:acme.sh:7387` (`[ "$char" = $'\0' ]`, `#!/usr/bin/env sh`) is a literal comparison on dash 0.5.12 (inside a loop that already uses `read -s -n 1`, a bash feature, so the line is probably bash-only in practice); `git__git@6de20f6092dc:t/t9902-completion.sh:75` (`local IFS=$'\n'`, git's test harness runs `$SHELL_PATH`, usually bash); `oils Build.sh:2` is a false positive (mksh version string) |
| SH-DIAL-17 (`local` probe) | `rust-lang__rustup@61271d00a979:rustup-init.sh:3,13-23` (`# shellcheck disable=SC2039  # local is non-POSIX`, `has_local`, `alias local=typeset`); `www-setup/src/install.sh:5,37-40` | n/a |
| SH-DIAL-04 (strictly POSIX installers) | rustup-init.sh and deno_install avoid bash features and `pipefail` ([ex](../shell-audit/exemplar-shape.md): long-lived POSIX projects avoid errexit tricks) | n/a |
| SH-DIAL-22 (macOS `/bin/sh`) | n/a | six fleet `quality-bash.md` copies assert dash |

## AI-agent angle

What the model characteristically gets wrong in this area, and the smallest mechanical check:

| Mistake | Why an LLM makes it | Check |
|---|---|---|
| Writes bash (arrays, `[[ ]]`, `${x,,}`, `<( )`, `function f`) under `#!/bin/sh` because it passed on the author's `/bin/sh` | 12 of 21 images' `/bin/sh` accept it; training data is bash-heavy | `shellcheck -s sh` (SC3xxx) or `matrix.sh posix` dash row; SH-DIAL-04 |
| `set -euo pipefail` copied into `#!/bin/sh` | cargo-cult strict mode | GREP-1; dash exit 2 |
| Bare `set -o pipefail \|\| true` believing `\|\| true` rescues it | works in bash | GREP-1; probe form |
| `$'\t'` or `$'\n'` in sh | POSIX.1-2024 headlines say "added", assumes the shipped dash has it | GREP-2; SC3003 (until ShellCheck master) |
| `read -d ''` after `find -print0` in sh | the POSIX find page shows it; dash lacks it | GREP-7; SC3045 |
| `#!/bin/bash -euo pipefail` or `#!/usr/bin/env bash -e` | macOS-style multi-word shebang habits | SC2096; GREP-3; exit 1/127 on Linux |
| `#!/usr/bin/env -S bash -eu` as the "fix" | `env -S` is the common answer | busybox/AL2 failure; SH-DIAL-18 |
| Treats `bash --posix` or `zsh --emulate sh` output as proof of sh portability | the names suggest it | `bashisms-twin.sh` bash 5.2 exit 0; SH-DIAL-19 |
| `readlink -f`, `realpath -m`, `timeout` assumed on macOS | GNU habit | GREP-10; macOS facts are read only |
| `[ ... -a ... ]` / `-o` | pre-2024 idiom | SC2166; GREP-8 |
| `echo -e`, `echo -n` | bash habit | SC3037; GREP-9; yash prints `-n` |
| `local` without directive, or `local x=$(cmd)` in sh | assumes bash semantics | SC3043; SH-DIAL-17 (the `$(...)` masking is group errexit's) |
| "macOS `/bin/sh` is dash" | repeats a stale fleet rule | GREP-11 |
| Decides from `dash --version` or package version | assumes version implies features | no such flag; SH-DIAL-24 |
| Omits any shebang on a `.sh` file | editor adds none | GREP-4; SC2148 |
| Bash-4 feature behind `#!/usr/bin/env bash` with no guard (assoc arrays, `mapfile`) | author runs bash 5 | `matrix.sh bash` on 3.2: stderr non-empty; SH-DIAL-06 |
| Cites ShellCheck "clean" as evidence the script is dash-safe after upgrading it | the tool changes under it | SC3040/SC3003 relaxed on master: keep GREP-1/2 |

## Contested / evolving

- **POSIX.1-2024 vs shipped dash (trend: closing slowly).** pipefail reached Debian in 2024-05 and the 26.04 runner is the first GitHub runner with it; `$'..'` is in upstream dash since 2024-06-22 but in no Debian or Ubuntu package as of 2026-10-11, and `read -d` is in none. `ubuntu-latest` flips from 24.04 to 26.04 in November 2026 ([runner-images issue 14748, Ubuntu2604 readme announcement](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md)), but Debian 12 and Ubuntu 24.04 machines persist; the floor stays dash 0.5.12-2 until they are retired (retirement dates not researched).
- **ShellCheck lags then overshoots.** 0.11.0 (2025-08-03) still emits SC3040/SC3003/SC3045 for POSIX.1-2024 features; unreleased master accepts pipefail and removes SC3003. After that upgrade the lint no longer protects Debian 12 and Ubuntu 24.04 dash users (trend: lint follows the standard, platforms follow later). Mitigation: GREP-1/2 plus a pinned ShellCheck.
- **Debian Policy 10.4 vs POSIX.1-2024.** Policy still requires `test -a/-o` and `echo -n` and says POSIX.1-2017; POSIX 2024 removed `-a/-o`. Both are true: the feature works everywhere; the rule says do not write it.
- **`local`.** Austin Group rejected it (bug 767, Closed/Rejected); every measured sh except ksh93u+m has it; Debian Policy mandates it. ShellCheck's SC3043 stays on by default. Trend: de facto standard, never standard.
- **`env bash` vs `/bin/bash`.** Google mandates `/bin/bash` (argued); the fleet and exemplars use `env bash` 24:1; `/bin/bash` pins macOS 3.2 but breaks on NixOS. Settled here by measurement (§3.1).
- **shfmt manual vs source.** The manual says `.sh` implies posix; 3.13.1 treats shebang-less `.sh` as bash (measured). Whether the docs or the code change is unknown; shfmt 3.14.1 is current (2026-09-06) and the fleet pins 3.13.1.
- **BusyBox 1.38.0** (2026-05-13, labelled unstable on busybox.net) adds ash `<<<`; Alpine 3.22/3.23 still ship 1.37.0, so the Alpine floor does not move until Alpine adopts 1.38 (unknown date).
- **uutils drift.** `env -S` (spaced form) broke in 0.2.2 and works in 0.10.0; `timeout -s KILL` differs from GNU; `ubuntu-latest` will move users onto uutils userland in the same November 2026 change. Userland detail belongs to W2-3.
- **macOS.** bash 3.2.57 is frozen through macOS 26.5 (Apple source, read only); no change expected. `/bin/sh` behaviour is documented only through secondary sources.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html | POSIX.1-2024 XCU Shell Command Language (primary) | Issue 8, 2024 | pipefail, dollar-single-quotes, special built-in error table, `#!` unspecified |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/read.html | POSIX.1-2024 `read` (primary) | 2024 | `-d delim`, NUL delimiter, Defect 243 |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/xargs.html | POSIX.1-2024 `xargs` (primary) | 2024 | `-r`, `-0` added |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/find.html | POSIX.1-2024 `find` (primary) | 2024 | `-print0`, `-exec {} +` preference |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/realpath.html | POSIX.1-2024 `realpath` (primary) | 2024 | only `-E`/`-e` |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/readlink.html | POSIX.1-2024 `readlink` (primary) | 2024 | only `-n`, no `-f` |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/timeout.html | POSIX.1-2024 `timeout` (primary) | 2024 | exit 124-127, 128+signal rationale |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/test.html | POSIX.1-2024 `test` (primary) | 2024 | adds `-ef -nt -ot`, removes `-a -o` |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/env.html | POSIX.1-2024 `env` (primary) | 2024 | no `-S` |
| https://austingroupbugs.net/view.php?id=767 | Austin Group bug "Add built-in local" (primary) | closed, rejected | `local` is not and will not be POSIX |
| https://www.debian.org/doc/debian-policy/ch-files.html | Debian Policy 10.4 Scripts (primary) | current | POSIX.1-2017 plus `local`, `echo -n`, `test -a/-o`; no extension for installed scripts |
| https://metadata.ftp-master.debian.org/changelogs//main/d/dash/dash_0.5.12-12_changelog | Debian dash changelog (primary) | 0.5.12-7 2024-05-17 to -12 2025-02-04 | pipefail backport |
| https://git.kernel.org/pub/scm/utils/dash/dash.git/log/?qt=grep&q=pipefail | dash upstream git log (primary) | 2024-04-05 | pipefail commit |
| https://git.kernel.org/pub/scm/utils/dash/dash.git/log/?qt=grep&q=dollar | dash upstream git log (primary) | 2024-06-22 to 2026-07-18 | `$'..'` commit history |
| https://git.kernel.org/pub/scm/utils/dash/dash.git/refs/tags | dash tags (primary) | 0.5.13 to 0.5.13.5 | releases after Debian's 0.5.12 |
| https://www.shellcheck.net/wiki/SC3040 | ShellCheck wiki (primary), local clone `shellcheck.wiki@0b4dfe7bf9dc` | 2026-10-09 | recommends the subshell pipefail probe, states the dash outcome |
| https://www.shellcheck.net/wiki/SC2148 | ShellCheck wiki (primary) | same | dialect inference rules |
| https://www.shellcheck.net/wiki/SC2096 | ShellCheck wiki (primary) | same | one shebang argument; macOS exception |
| https://www.shellcheck.net/wiki/SC3003 | ShellCheck wiki (primary) | same | `$'..'` in sh |
| https://www.shellcheck.net/wiki/SC3043 | ShellCheck wiki (primary) | same | `local` |
| https://www.shellcheck.net/wiki/SC2166 | ShellCheck wiki (primary) | same | `-a/-o`, quotes the POSIX 2024 text |
| https://www.shellcheck.net/wiki/SC3033 | ShellCheck wiki (primary) | same | function names in POSIX sh |
| https://raw.githubusercontent.com/koalaman/shellcheck/master/CHANGELOG.md | ShellCheck CHANGELOG (primary) | Git (unreleased) vs v0.11.0 2025-08-03 | SC3040 changed, SC3003 removed on master |
| https://raw.githubusercontent.com/mvdan/sh/v3.13.1/cmd/shfmt/main.go | shfmt source (primary) | v3.13.1 | `langFromFilename`, bash fallback |
| https://raw.githubusercontent.com/mvdan/sh/master/cmd/shfmt/shfmt.1.scd | shfmt manual (primary) | master | the `.sh implies posix` claim; editorconfig sections |
| https://raw.githubusercontent.com/mvdan/sh/master/CHANGELOG.md | shfmt changelog (primary) | 3.14.1 2026-09-06 | `--detect` in 3.14.0 |
| https://busybox.net/ | BusyBox news (primary) | 1.38.0 2026-05-13 | ash/hush `<<<` |
| https://support.apple.com/en-us/102360 | Apple: Use zsh as the default shell on Mac (read only) | current | zsh default, valid `chsh` shells |
| https://raw.githubusercontent.com/apple-oss-distributions/bash/bash-144/bash.plist | Apple bash open-source metadata (read only) | macOS 26.x | 3.2 patches; posix-mode `\e` change |
| https://raw.githubusercontent.com/apple-oss-distributions/shell_cmds/shell_cmds-326/sh/sh.plist.part | Apple shell_cmds `sh` metadata (read only) | import 2016-10-27 | the FreeBSD sh Apple ships |
| https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md | GitHub runner image readme | image 20260927.149.1 | dash 0.5.12-12ubuntu3, bash 5.3.9, ShellCheck 0.11.0, announcement of the November 2026 flip |
| https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md | GitHub runner image readme | image 20260907.0351.1 | Bash 3.2.57 on macos-26 |
