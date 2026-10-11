---
title: Platform matrix — default shells, shell versions and userland across OS images, CI runners, macOS, Windows, BSDs and the oils spec suite
agent: platform-matrix (shell program, wave 1)
model: sonnet (claude-sonnet-5-5)
scope: default /bin/sh and bash per OS image; coreutils flavour; userland presence and behaviour probes; GitHub Actions runner images and `shell:` command lines; macOS (read-only, from Apple source tags); Windows PowerShell 5.1 and Git Bash (measured on the WSL Windows host); FreeBSD/OpenBSD/NetBSD/Android (read-only, man pages); oils spec-suite divergence map
method: see "Method" below — every number carries its command inline; fixtures live in ~/.cache/research-lang/shell-tools/fixtures/platform-matrix/ (probe.sh, probe2.sh, probe.ps1, p2024.sh, oils_count.py, oils_top.py, out/*.txt, web/*)
date_researched: 2026-10-10
---

# Platform matrix

Researched 2026-10-10. Version-specific claims carry the version. "MEASURED" = I ran it;
"SOURCE" = read from a primary source (cited); "UNVERIFIED" = secondary source or inference.
Fixture root `FX=/home/mherwig/.cache/research-lang/shell-tools/fixtures/platform-matrix`.

## Contents

1. [Method](#method)
2. [Headline numbers](#headline-numbers)
3. [Axis 1 — Linux/Alpine/busybox images (MEASURED)](#axis-1--linux-alpine-busybox-images-measured)
4. [Axis 2 — CI runner images and the `shell:` keyword](#axis-2--ci-runner-images-and-the-shell-keyword)
5. [Axis 3 — macOS (READ-ONLY)](#axis-3--macos-read-only)
6. [Axis 4 — Windows (MEASURED on host)](#axis-4--windows-measured-on-host)
7. [Axis 5 — BSDs and Android (READ-ONLY)](#axis-5--bsds-and-android-read-only)
8. [Axis 6 — oils spec-suite divergence map](#axis-6--oils-spec-suite-divergence-map)
9. [Smells (ranked)](#smells-ranked)
10. [Patterns worth encoding](#patterns-worth-encoding)
11. [Contradictions of the frame](#contradictions-of-the-frame)
12. [Gaps](#gaps)
13. [The portability floor table](#the-portability-floor-table)

## Method

Images pulled with `docker pull -q` (script `$FX/pull.sh`, log `$FX/pull.log`): debian:11/12/13,
ubuntu:20.04/22.04/24.04/25.10/26.04/26.10 (plus `ubuntu:devel`), alpine:3.22/3.23,
almalinux:8/9/10, amazonlinux:2/2023, fedora:latest, opensuse/leap:latest, archlinux:latest,
busybox:1.37, nixos/nix. **All 21 probed images pulled; none failed.** (`ubuntu:26.10` reports
"Ubuntu Stonking Stingray (development branch)" in `/etc/os-release` — treat as pre-release.)
`rockylinux:9` and `ubuntu:devel` were pulled but not probed.

| step | command |
|---|---|
| probe (POSIX sh, 95 key=value lines) | `for i in <image>; do docker run --rm -i $i sh < $FX/probe.sh > $FX/out/<image>.txt; done` |
| second probe (package versions, find/xargs/tar presence, rust-coreutils applet count) | same loop with `$FX/probe2.sh` → `$FX/out/out2_<image>.txt` |
| table build | `python3 -I $FX/table.py <keys…>` |
| POSIX-2024-ish shell features | `matrix.sh posix $FX/p2024.sh` |
| bash `--posix` process substitution | `matrix.sh bash $FX/procsub_posix.sh` |
| PowerShell probe | `matrix.sh pwsh $FX/probe.ps1` (7.4.7 in docker ubuntu 22.04, 7.6.6 in WSL Fedora 43, Windows PowerShell 5.1.26100.9444 on the Windows 11 host) |
| Git Bash probe | `matrix.sh win $FX/probe.sh` |
| CI shell command lines | `$FX/ci_body.sh`, `$FX/ci_body.ps1` run under the exact runner command lines (Axis 2) |
| runner images | files under `exemplars/shell/actions__runner-images` @ `8197087fc536` (cited as `runner-images@8197087fc536:<path>:<line>`) |
| Apple source | `git clone --depth 1 --branch <tag> https://github.com/apple-oss-distributions/<project>` into `$FX/web/`; macOS-version-to-tag mapping from `distribution-macOS/<macos-NNN>/release.json` |
| oils | `python3 -I $FX/oils_count.py`, `python3 -I $FX/oils_top.py` over `oils-for-unix__oils@57d3f0d088c3:spec/*.test.sh` |

Caveat that governs Axis 1: these are **Docker base images, not VM/cloud images**. They are
deliberately minimal (no curl on Debian/Ubuntu, no `which` on RHEL family). A runner or cloud
image has more (Axis 2 shows `curl 8.18` in the Ubuntu 26.04 runner image apt list). The
numbers answer "what may a script assume inside a fresh container", which is where
installers and CI jobs get run most.

## Headline numbers

| fact | number | source |
|---|---|---|
| Probed images with `/bin/sh` = dash | 9 / 21 (deb 11-13, ubuntu 20.04-26.10) | `$FX/out/*.txt` `sh_ls=` |
| `/bin/sh` = bash (POSIX-mode) | 9 / 21 (alma 8/9/10, AL2, AL2023, fedora 44, leap 16.0, arch, nixos/nix) | same |
| `/bin/sh` = busybox ash | 3 / 21 (alpine 3.22, 3.23, busybox:1.37) | same |
| Images with bash installed | 18 / 21 (absent: alpine x2, busybox) | `has_bash=` |
| Images with zsh, ksh, mksh or fish | 0 / 21 | `has_zsh/ksh/mksh/fish=` |
| `[[ ]]` accepted by `/bin/sh` | 12 / 21 (all non-dash); rejected on all 9 dash images | `sh_dbrack=` |
| Arrays accepted by `/bin/sh` | 9 / 21 (only the bash-as-sh images) | `sh_arrays=` |
| `set -o pipefail` accepted by `/bin/sh` | 16 / 21; **dash images: 4 of 9** (deb13, ubuntu 25.10/26.04/26.10 yes; deb11, deb12, ubuntu 20.04/22.04/24.04 no) | `sh_pipefail=` |
| `echo "a\tb"` interprets the escape under `/bin/sh` | 9 / 21 (dash only) | `sh_echoescape=` |
| Images with **neither curl nor wget** | 9 / 21 (every Debian and Ubuntu image) | `curl=`,`wget=` |
| Images with Rust uutils coreutils | 3 / 21 (ubuntu 25.10: 107 applets, 26.04: 108, 26.10: 105) | `probe2 cu_rust_links=` |
| `cp`/`mv`/`rm` still GNU under uutils | ubuntu 25.10 and 26.04 yes; 26.10 all Rust | `probe2 cu_gnu_list=` |
| `readlink -f`, `realpath`, `mktemp -d`, `sha256sum`, `date -d`, `stat -c`, `base64 -d`, `install -D`, `timeout` | 21 / 21 each | `$FX/out/*.txt` |
| `grep -P` | 18 / 21 (alpine x2, busybox lack) | `grep_P=` |
| `find -printf` | 16 / 21 | `find_printf=` |
| `shasum` | 0 / 21 | `shasum=` |
| GitHub Actions runner readmes listing zsh, fish or ksh | 0 / 19 | `cat images/*/*Readme.md \| grep -ci '\bzsh\b'` |
| Runner macOS images with Bash | 3.2.57 in 6 / 6 macOS readmes (14, 15, 26; x64 + arm64) | `runner-images@8197087fc536:images/macos/macos-15-arm64-Readme.md:16` |
| Windows runner `bash` | 5.3.15(2) (Git Bash) in 5 / 5 Windows readmes | `runner-images@8197087fc536:images/windows/Windows2025-Readme.md:17` |
| `bash -e {0}` (unspecified shell) lets `false \| true; next` continue | MEASURED, exit 0 | Axis 2 |
| pwsh step: native failure mid-script is invisible if the last native command succeeds | MEASURED, exit 0 on pwsh 7.6.6 and Windows PowerShell 5.1 | Axis 2 |
| macOS 12.2 `readlink` options `"n"`; 12.3 `"fn"` | `readlink -f` arrives in 12.3 | `file_cmds-352.40.6@33b700236334:stat/stat.c:222` vs `file_cmds-353.100.22@e3cc3ca6d5d3:stat/stat.c:242` |
| macOS `realpath(1)` | absent in 12.3 (`shell_cmds-240.100.15`), present from 13.0 (`shell_cmds-278`) | `shell_cmds-278@8ddef153ec48` dir listing |
| macOS 26.5 bash | 3.2.57 | `bash-144@51bf3fc6f26e:version.h:14` |
| macOS `/bin/zsh` | 5.8 (12.x), 5.9 (14.0 through 26.5) | `zsh-90/100.120.1/108/110.1.1/118:zsh/Config/version.mk` |
| oils spec: cases / diverging cases (non-osh) / annotations | 3965 / 1358 / 2714 over 223 spec files | `oils_top.py` |
| oils divergence rate vs the oils reference: yash 54.6%, dash 42.3%, ash 40.2%, zsh 38.0%, mksh 34.4%, bash 13.2% | divergent cases / cases in files that compare that shell | `oils_counts.json` |
| PowerShell 7.4 LTS end of support | 10-Nov-2026 (31 days after research date); 7.6 LTS to 14-Nov-2028 | learn.microsoft.com support-lifecycle table |

---

## Axis 1 — Linux, Alpine, busybox images (MEASURED)

Commands: `docker run --rm -i <img> sh < $FX/probe.sh` and `… sh < $FX/probe2.sh`. Version strings
come from `dpkg-query -W`, `rpm -q`, `pacman -Q`, `apk info`, or `<tool> --version`.

### 1.1 Shells and coreutils

| image | os-release | `/bin/sh` → | bash | dash pkg | coreutils |
|---|---|---|---|---|---|
| debian:11 | 11 bullseye | dash | 5.1.4 (5.1-2+deb11u1) | 0.5.11+git20200708 | GNU 8.32 |
| debian:12 | 12 bookworm | dash | 5.2.15 | 0.5.12-2 | GNU 9.1 |
| debian:13 | 13 trixie | dash | 5.2.37 | **0.5.12-12** | GNU 9.7 |
| ubuntu:20.04 | 20.04.6 | dash | 5.0.17 | 0.5.10.2-6 | GNU 8.30 |
| ubuntu:22.04 | 22.04.5 | dash | 5.1.16 | 0.5.11+git20210903 | GNU 8.32 |
| ubuntu:24.04 | 24.04.5 | dash | 5.2.21 | 0.5.12-6ubuntu5 | GNU 9.4 |
| ubuntu:25.10 | 25.10 | dash | 5.2.37 | 0.5.12-12ubuntu2 | **uutils 0.2.2** (107 applets); GNU 9.5 for cp mv rm |
| ubuntu:26.04 | 26.04.1 LTS | dash | **5.3.9** | 0.5.12-12ubuntu3 | **uutils 0.10.0** (108); GNU 9.5 for cp mv rm |
| ubuntu:26.10 | dev branch | dash | 5.3.9 | 0.5.12-12ubuntu3 | **uutils 0.10.0** (105, incl. cp mv rm) |
| alpine:3.22 / 3.23 | v3.22 / v3.23 | busybox ash | **not installed** | — | busybox 1.37.0 (builds 2025-11-21 / 2025-12-16) |
| almalinux:8 | 8.10 | **bash 4.4.20** | 4.4.20 | — | GNU 8.30 (coreutils-single) |
| almalinux:9 | 9.8 | bash 5.1.8 | 5.1.8 | — | GNU 8.32 |
| almalinux:10 | 10.2 | bash 5.2.26 | 5.2.26 | — | GNU 9.5 |
| amazonlinux:2 | AL2 | **bash 4.2.46** | 4.2.46 | — | GNU 8.22 |
| amazonlinux:2023 | 2023.12.20260930 | bash 5.2.15 | 5.2.15 | — | GNU 8.32 |
| fedora:latest | 44 | bash 5.3.9 | 5.3.9 | — | GNU 9.10 |
| opensuse/leap:latest | Leap 16.0 | bash 5.2.37 | 5.2.37 | — | GNU 9.6 |
| archlinux:latest | rolling | bash 5.3.20 | 5.3.20 | — | GNU 9.12 |
| busybox:1.37 | — | busybox ash | not installed | — | busybox 1.37.0 (2024-09-26) |
| nixos/nix | — | bash 5.3.9 (store path) | 5.3.9 | — | GNU 9.11; **no sed, no awk, no diff** in PATH |

Evidence rows: `sh_ls=`, `sh_real=`, `bash_ver=`, `ls_ver=` in `$FX/out/<img>.txt`; `pkg_*=` in `$FX/out/out2_<img>.txt`.
Other facts:
- `/bin` is a symlink to `usr/bin` on every glibc image except debian:11 (`bin_is=` field); alpine and busybox keep real `/bin`.
- `/usr/bin/env` exists on 21/21; `/bin/env` exists on 21/21 (`env_path=`, `env_bin=`). On Ubuntu 25.10+ and Alpine it is a symlink into the multi-call binary (`../lib/cargo/bin/coreutils/env`, `/bin/busybox`).
- Other shells present by default: dash on the 9 Debian/Ubuntu images only; `ash` and `busybox` on the 3 busybox images; zsh/ksh/mksh/fish/tcsh/csh on **none**.
- `LANG` unset in 20/21 (arch sets `C.UTF-8`) → scripts in containers run in the POSIX locale; `C.UTF-8` exists (`locale -a`) on 17/21 and not on alpine x2, busybox, nix (musl / no `locale` binary: `loc_has=n`).

### 1.2 What `/bin/sh` accepts, per image (MEASURED, `/bin/sh -c '<snippet>'`)

| construct | dash images (9) | bash-as-sh images | alpine / busybox ash |
|---|---|---|---|
| `[[ a = a ]]` | n | y | y |
| `a=(1 2); ${a[1]}` | n | y (not on busybox) | n |
| `$'a'` | n | y | y |
| `${x//b/}` | n | y | y |
| `[ a == a ]` | n | y | y |
| `function f { :; }` | n | y | y |
| `source ./f` | n | y | y |
| `printf %q`, `<<<` | n | y | n |
| `local x` | **y** | y | y |
| `set -o pipefail` | n, except deb13 + ubuntu 25.10/26.04/26.10 = y | y | y |
| `cat <(echo)` | n | **y on 5.1+ (alma9/10, AL2023, fedora, leap, arch, nix); n on alma8 (4.4.20) and AL2 (4.2.46)** | y |
| `echo "a\tb"` | **interprets `\t`** | literal | literal |
| `echo -n x` | supported (all 21) | supported | supported |

`$FX/out/*.txt` keys `sh_dbrack … sh_echoescape`. Process substitution under `bash --posix`
confirmed by `matrix.sh bash $FX/procsub_posix.sh`:

```
== bash 3.2 … 5.0   bash: -c: line 0: syntax error near unexpected token `('
== bash 5.1 / 5.2 / 5.3   ps-ok
```

So on RHEL 8 and Amazon Linux 2 a `#!/bin/sh` script cannot use `<( )` while on RHEL 9+ it can;
`sh` on Debian/Ubuntu rejects it everywhere. The set of constructs a `#!/bin/sh` script "gets
away with" depends on the host: **12 of 21 images silently accept bashisms that 9 reject.**

POSIX.1-2024-flavoured features across the interpreter family (`matrix.sh posix $FX/p2024.sh`, y/n):

| feature | dash 0.5.12 (deb12) | busybox ash 1.35 / 1.37 | mksh R59c | ksh93u+m | yash 2.52 | posh 0.14.1 | bash 3.2 `--posix` | bash 5.2 `--posix` | zsh 5.9 `--emulate sh` |
|---|---|---|---|---|---|---|---|---|---|
| `set -o pipefail` | n | y / y | y | y | y | n | y | y | y |
| `$'…'` | n | y / y | y | y | n | n | y | y | y |
| `${x/a/b}` | n | y / y | y | y | y | n | y | y | y |
| `$((i++))` | **n** | y / y | y | y | y | y | y | y | y |
| `trap … ERR` | n | y / y | y | y | n | n | y | y | y |
| `wait -n` | n | y / y | n | n | n | n | n | y | n |
| `printf -v` | n | y / y | y | y | n | y | y | y | y |
| `local -` | y | y / y | y | n | y | n | n | y | y |
| `PIPESTATUS` | n | n / n | y | n | n | n | y | y | n (lowercase `pipestatus`) |

The Debian-13 dash (0.5.12-12) adds `set -o pipefail` that 0.5.12-2 and -6ubuntu5 lack — the
package version string is the only discriminator (`dash --version` does not exist). Runner
images confirm the same package strings: `runner-images@8197087fc536:images/ubuntu/Ubuntu2604-Readme.md:21`
(`Dash 0.5.12-12ubuntu3`) vs `…/Ubuntu2404-Readme.md:21` (`0.5.12-6ubuntu5`).

### 1.3 Userland presence and behaviour (MEASURED; functional tests, not just `command -v`)

Count is images out of 21 where the probe passed; the exceptions column names the images where it did not.

| probe | pass | exceptions |
|---|---|---|
| `readlink -f` (resolves a symlink), `realpath`, `mktemp -d`, `mktemp -t`, `sha256sum`, `timeout`, `xargs -r`, `date -d @0`, `date -d 'YYYY-MM-DD HH:MM:SS'`, `date -Iseconds`, `stat -c %s`, `install -D`, `base64 -d` | 21 | none (busybox 1.37 included; `nix` still lacks `sed`) |
| `sed -i`, `sed -E` | 20 | nix (no sed binary) |
| `find` / `xargs` present | 19 | amazonlinux:2023, opensuse leap 16.0 (both lack findutils) |
| `xargs -0`, `-P` | 19 | same two |
| `find -print0` | 19 | same two |
| `find -printf` | 16 | alpine x2, busybox:1.37 (busybox find), AL2023, leap |
| `tar` present and `--strip-components` works | 19 | amazonlinux:2, amazonlinux:2023 (no tar at all) |
| `tar --zstd` advertised in `tar --help` | 15 | alpine x2, busybox (busybox tar), alma8 (tar 1.30), AL2, AL2023 (no tar) |
| `grep -P` | 18 | alpine x2, busybox:1.37 |
| `curl` | 9 | deb x3, ubuntu x6, alpine x2, busybox |
| `wget` | 4 | alpine x2, busybox:1.37, nix (busybox/nix wget) |
| `which` | 13 | alma8/9/10, AL2, AL2023, fedora, leap |
| enhanced `getopt` (long options works) | 16 | alma10, AL2, AL2023, fedora, nix (command absent: exit 127); alpine/busybox `getopt -l` accepted via busybox |
| `flock` | 18 | AL2, AL2023, nix |
| `gzip` | 19 | AL2, AL2023 |
| `bzip2` | 6 | most images lack it (present: ubuntu 20.04, alpine x2, fedora, arch, busybox) |
| `xz` | 7 | present: alma x3, fedora, leap, arch, busybox |
| `zstd` | 2 | present: fedora, arch only |
| `unzip` | 3 | present: alpine x2, busybox only; `zip` 0/21 |
| `file` | 1 | arch only |
| `iconv` | 19 | not busybox:1.37, nix |
| `perl` | 9 | the 9 Debian/Ubuntu images only (perl-base); `shasum` 0/21 anyway |
| `python3` | 3 | alma9, alma10, AL2023 |
| `openssl` | 3 | alma9, leap, arch |
| `tput` | 12 | absent on alpine x2, alma x3, AL2023, fedora, busybox, nix |
| `ps` | 11 | absent on deb x3, alma x3, AL2, AL2023, fedora, nix |
| `sudo` | 1 | fedora only |
| `git` | 1 | nixos/nix only |
| `jq`, `zip` | 0 | — |

Flavour notes (rows `sed_ver`, `awk_ver`, `grep_ver`, `tar_ver`, `cp_ver`):
- sed: GNU 4.2.2 (AL2), 4.5 (alma8), 4.7-4.9 elsewhere, 4.10 (arch); busybox on alpine/busybox ("This is not GNU sed version 4.0").
- awk: **mawk** 1.3.4 on every Debian/Ubuntu image (`mawk 1.3.4.20200120` … `20260302`); gawk 4.0.2 (AL2) … 5.4.1 (arch) on RHEL family/leap/arch; busybox awk on alpine. `gawk`-only features (`gensub`, `strftime`, `--version`) fail on 9/21.
- grep: GNU 2.20 (AL2), 3.1 (alma8) … 3.12; busybox grep lacks `-P`.
- tar: GNU 1.30-1.35; busybox tar 1.37.0 on alpine/busybox.
- `sudo-rs` is **available but not installed** in the 25.10/26.04/26.10 docker images: `apt-cache policy sudo-rs` after `apt-get update` → Candidate 0.2.8-1ubuntu5.3 (25.10), 0.2.13-0ubuntu1.2 (26.04), 0.2.14-1ubuntu4 (26.10), with classic `sudo` 1.9.17p2 also in the archive. Whether a full Ubuntu 25.10+ install ships sudo-rs as the default `sudo` is UNVERIFIED here (docker images carry no sudo).

Rust coreutils detail (MEASURED, `ls -l /usr/bin | grep -c cargo/bin/coreutils`):

| image | applets symlinked to `/usr/lib/cargo/bin/coreutils` | `cp mv rm` | `ls cat sort date env readlink realpath mktemp stat install tr head tail wc cut sha256sum` |
|---|---|---|---|
| ubuntu:25.10 | 107 | GNU 9.5 | uutils |
| ubuntu:26.04 | 108 | GNU 9.5 | uutils |
| ubuntu:26.10 | 105 | uutils | uutils |

(`$FX/out/out2_ubuntu_*.txt`, `cu_rust_links=`, `cu_gnu_list=`.) A script that probes
`ls --version | head -1` gets `ls (uutils coreutils) 0.2.2`/`0.10.0` — not "GNU". `readlink -f`,
`mktemp -d`, `date -d`, `stat -c`, `sha256sum`, `install -D`, `base64 -d`, `timeout`, `xargs -r` all
passed on the uutils images, so the uutils switch broke **none of the 20 probed behaviours**; it
breaks version-string sniffing (`--version | grep GNU`) and anything relying on GNU-only
options not probed here.

Reproduce one row: `docker run --rm -i ubuntu:26.04 sh < $FX/probe.sh | grep -E '^(ls_ver|readlink_f|date_d)='`.

Probe self-check: spot-read 3 hits per boolean (e.g. `curl=n` confirmed by `docker run --rm debian:12 sh -c 'command -v curl'` → empty; `find_printf=n` on alpine confirmed by `find: unrecognized: -printf`). False-positive rate observed: 0/9 for presence probes; the two I had to discard were my own test bugs (`source` under `;`-chained `rm` in `p2024.sh`, and `read -d ""` at EOF) — removed from the tables above.

---

## Axis 2 — CI runner images and the `shell:` keyword

### 2.1 What is installed (SOURCE: `runner-images@8197087fc536`)

| label | image | Bash | Dash | pwsh | zsh / fish / ksh | coreutils | cite |
|---|---|---|---|---|---|---|---|
| `ubuntu-22.04` | Ubuntu 22.04 | 5.1.16(1) | 0.5.11+git20210903+057cd650a4ed-3build1 | 7.6.6 | not listed | 8.32-4.1ubuntu1.4 | `images/ubuntu/Ubuntu2204-Readme.md:17,21,245,294` |
| `ubuntu-latest` = `ubuntu-24.04` | Ubuntu 24.04 | 5.2.21(1) | 0.5.12-6ubuntu5 | 7.6.6 | not listed | 9.4-3ubuntu6.3 | `images/ubuntu/Ubuntu2404-Readme.md:17,21,219,267`; label mapping `README.md:25` |
| `ubuntu-26.04` | Ubuntu 26.04, kernel 7.0.0-1012-azure | 5.3.9(1) | 0.5.12-12ubuntu3 | 7.6.6 | not listed | `9.5-1ubuntu2+0.0.0~ubuntu25` (package string only) | `images/ubuntu/Ubuntu2604-Readme.md:17,21,206,257` |
| `ubuntu-slim` | Ubuntu (slim) | 5.2.21(1) | 0.5.12-6ubuntu5 | 7.6.6 | not listed | 9.4-3ubuntu6.3 | `images/ubuntu-slim/ubuntu-slim-Readme.md:16,17,53,66` |
| `macos-14` (deprecated) | macOS 14 | **3.2.57(1)** | none | 7.6.3 (x64) / 7.6.4 (arm64) | not listed | gnu-tar 1.35 as `gtar` only | `images/macos/macos-14-Readme.md:16,63,156`; `macos-14-arm64-Readme.md:149` |
| `macos-15` | macOS 15.7.9 (24G830) | **3.2.57(1)** | none | 7.6.4 / 7.6.5 | not listed | gnu-tar 1.35 as `gtar` only | `images/macos/macos-15-arm64-Readme.md:8,16,59,147` |
| `macos-latest` = `macos-26` (arm64) | macOS 26 | **3.2.57(1)** | none | 7.6.4 / 7.6.5 | not listed | gnu-tar only | `images/macos/macos-26-arm64-Readme.md:16,59,147`; label `README.md:32` |
| `windows-2022` | Windows Server 2022 | 5.3.15(2) (Git Bash) | none | 7.6.6 | not listed | MSYS2 `pacman` 6.1.0 present, not on PATH | `images/windows/Windows2022-Readme.md:16,148-149,492` |
| `windows-latest` = `windows-2025` | Server 2025, 10.0.26100 build 33438 | 5.3.15(2) | none | 7.6.6 | not listed | MSYS2 at `C:\msys64`, "not added to PATH" | `images/windows/Windows2025-Readme.md:7,17,141-152,472`; label `README.md:37` |
| `windows-11-arm` | Win 11 Arm64 | 5.3.15(2) | none | 7.6.6 | not listed | MSYS2 CLANGARM64 | `images/windows/Windows11-Arm64-Readme.md:15,133-134,398` |

Counts: **0 of 19** runner readmes mention zsh, fish or ksh (`cat images/*/*Readme.md | grep -ci '\bzsh\b'` = 0; same for `fish`, `ksh`, `Windows PowerShell`). `/bin/zsh` exists on macOS runners as an OS component but is not an advertised tool. `dash` appears in 7 readmes (all Ubuntu).

Facts worth encoding:
- macOS runner login shell is **forced to `/bin/bash`** (3.2.57): `runner-images@8197087fc536:images/macos/scripts/build/configure-shell.sh:9-10` (`sudo chsh -s /bin/bash $USERNAME`), and on arm64 `eval "$(/opt/homebrew/bin/brew shellenv)"` is appended to `~/.bashrc` (`:14-16`). The macOS toolset installs **no Homebrew bash and no GNU coreutils/sed**: `images/macos/toolsets/toolset-15.json:222` lists only `gnu-tar`. So on a macOS runner `bash` is 3.2.57 unless the workflow installs another.
- Windows `bash` (the `shell: bash` target) is **Git for Windows' bash**: `C:\shells\gitbash.exe → C:\Program Files\Git\bin\bash.exe` (`images/windows/scripts/build/Configure-Shell.ps1:17-18`). Git is installed with `/o:PathOption=CmdTools` (`images/windows/scripts/build/Install-Git.ps1:34`) — only `git` on PATH, not the Unix tools — so in a `pwsh`/`cmd` step `sort`, `find` resolve to the Windows versions (measured analogue on the host: `sort resolves to = Alias` in 5.1, `Application` in 7.x on Linux). `msys2bash.cmd` runs `bash.exe -leo pipefail` (`Configure-Shell.ps1:14`) with `MSYSTEM=MINGW64` (`CLANGARM64` on arm64) (`:6-7,12`); `wslbash.exe → C:\Windows\System32\bash.exe` (`:20-21`). WSL v1 enabled, WSL2 3.0.1.0 (`Windows2025-Readme.md:11-12`).
- Ubuntu 26.04 runner: the apt list names `coreutils` only (`images/ubuntu/toolsets/toolset-2604.json:161`), no `rust-coreutils`. Whether `/usr/bin/ls` is uutils on the runner is **UNVERIFIED** (in the plain ubuntu:26.04 docker image it is, Axis 1). Encode: don't sniff GNU by version string.
- Announcements in the image readmes: `ubuntu-latest` moves to Ubuntu 26.04 in **November 2026** (`images/ubuntu/Ubuntu2604-Readme.md:3`, linked issue 14748); Ubuntu 22 images begin deprecation Sep 17 (unsupported Apr 17) (`:5`); macOS 14 unsupported by Nov 2 (`images/macos/macos-15-arm64-Readme.md:5`). So within weeks of this research `ubuntu-latest` flips from dash 0.5.12-6ubuntu5 (no pipefail) to 0.5.12-12ubuntu3 (pipefail) and bash 5.2→5.3.

### 2.2 The `shell:` keyword — exact command lines

Docs: `docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax`, `jobs.<job_id>.steps[*].shell` (fetched 2026-10-10).

| `shell:` | OS | command run internally | fail-fast |
|---|---|---|---|
| *(unspecified)* | Linux, macOS | `bash -e {0}` (falls back to `sh -e {0}` if bash not on PATH) | `-e` only, **no pipefail** |
| *(unspecified)* | Windows | `pwsh -command ". '{0}'"`; Desktop `powershell -command ". '{0}'"` used if pwsh missing (self-hosted) | `$ErrorActionPreference = 'stop'` prepended |
| `bash` | all | `bash --noprofile --norc -eo pipefail {0}` | `-e` + pipefail |
| `sh` | Linux, macOS | `sh -e {0}` | `-e` (dash on Ubuntu) |
| `pwsh` | all | `pwsh -command ". '{0}'"` | `$ErrorActionPreference='stop'` prepended; `if ((Test-Path -LiteralPath variable:\LASTEXITCODE)) { exit $LASTEXITCODE }` appended |
| `powershell` | Windows | `powershell -command ". '{0}'"` | same prepend/append |
| `cmd` | Windows | `%ComSpec% /D /E:ON /V:OFF /S /C "CALL "{0}""` | docs: "there doesn't seem to be a way to fully opt into fail-fast" |
| `python` | all | `python {0}` | — |
| custom | — | `command [options] {0}`; first word is the command, `{0}` the temp-script path | e.g. `pwsh -File {0}` opts out of the prepend/append |

Source for the OS default: `actions/runner` `src/Runner.Worker/Handlers/ScriptHandler.cs` (fetched via raw.githubusercontent, no line numbers returned): Windows `shellCommand = "pwsh"` falling back to `"powershell"`; non-Windows `shellCommand = "sh"` with `commandPath = WhichUtil.Which("bash", …) ?? WhichUtil.Which("sh", …)`. The argument templates live in `ScriptHandlerHelpers.GetScriptArgumentsFormat` (not fetched — UNVERIFIED beyond the docs table). Notably the docs say "runs a different command to when `bash` is specified explicitly" — confirmed below.

### 2.3 Behaviour under those command lines (MEASURED)

Body `$FX/ci_body.sh`: `echo step-start; false | true; echo after-pipeline-reached`.

```
### unspecified shell: bash -e {0}  (bash 5.2)
step-start
after-pipeline-reached
-> exit 0
### shell: bash -> bash --noprofile --norc -eo pipefail {0}
step-start
-> exit 1
### shell: sh -> sh -e {0} (dash 0.5.12 deb12)
step-start
after-pipeline-reached
-> exit 0
```

pwsh body `$FX/ci_body.ps1` (the runner prepends `$ErrorActionPreference='stop'` and appends the
`LASTEXITCODE` line; `bash -c 'exit 3'` is the failing native, a later `exit 0` the last native):

```
pwsh 7.6.6 -command ". '…/ci_body.ps1'"            step-start / after-native-fail-reached   exit=0
powershell 5.1 -command ". '…\ci_body_win.ps1'"    step-start / after-native-fail-reached   exit=0   (cmd /c exit 3 as the failing native)
```

H5 is **confirmed on every point**: unspecified bash has no pipefail, `sh` is dash on Ubuntu runners
(dash gains pipefail only on the 26.04 runner), and a failing native command in the middle of a
pwsh step is silently dropped — `$ErrorActionPreference='stop'` governs PowerShell errors, not
native exit codes, and `$LASTEXITCODE` only holds the last native command. Fix recipes:
`shell: bash`, or in pwsh `if ($LASTEXITCODE) { exit $LASTEXITCODE }` after each native call, or
`$PSNativeCommandUseErrorActionPreference = $true` (variable measured present = `False` by default on 7.4.7 and 7.6.6, absent on 5.1; the introducing version is UNVERIFIED here — treat as 7.4+).

---

## Axis 3 — macOS (READ-ONLY)

No macOS host. Everything below is read from Apple's open-source tags
(`github.com/apple-oss-distributions`), mapped to macOS versions via `distribution-macOS`
`release.json`; bash 3.2.57 *semantics* are reproducible with `bash:3.2` but BSD userland behaviour is
not run. Mapping (`$FX/web/rel-macos-*.json`, command: `curl -s https://raw.githubusercontent.com/apple-oss-distributions/distribution-macOS/<macos-NNN>/release.json`):

| macOS | bash | zsh (project → `Config/version.mk`) | shell_cmds | file_cmds | text_cmds | basic_cmds |
|---|---|---|---|---|---|---|
| 12.2 | bash-125 | zsh-90 → **5.8** | 234 | 352.40.6 | 118 | 56 |
| 12.3 | bash-125 | zsh-90 → 5.8 | 240.100.15 | 353.100.22 | 138.100.3 | 56 |
| 13.0 | bash-131 | zsh-94 | 278 | 400 | 154 | 67 |
| 14.0 | bash-135 | zsh-100 | 302.0.1 | 428 | 165.0.4 | 67 |
| 14.6 | bash-135.120.1 | zsh-100.120.1 → **5.9** | 309.120.3 | 430.140.2 | 165.100.8 | 67.100.1 |
| 15.0 | bash-138 | zsh-108 → 5.9 | 319.0.1 | 448.0.3 | 190.0.1 | 70 |
| 15.6 | bash-140 | zsh-108 → 5.9 | 326 | 457.140.3 | 195 | 70 |
| 26.0 | bash-140 | zsh-110.1.1 → 5.9 | 326 | 475 | 197 | 70 |
| 26.5 | bash-144 | zsh-118 → 5.9 | 329 | 479 | 199 | 70 |

- **`/bin/bash` is 3.2.57 in every macOS from 10.15 to 26.5**: `bash-144@51bf3fc6f26e:version.h:14` → `#define SCCSVERSION "@(#)Bash version 3.2.57(1) release GNU"`. Runner images agree (Axis 2). H7 confirmed.
- **`/bin/zsh`**: 5.8 on 12.x, 5.9 on 14.0-26.5 (zsh-100.120.1/108/110.1.1/118 `version.mk`: `VERSION=5.9`; zsh-90: `VERSION=5.8`). macOS 13.x not individually checked (zsh-94/97: UNVERIFIED, between 5.8 and 5.9).
- **`/bin/sh`**: a shim, not a symlink to bash. SECONDARY sources only (UNVERIFIED on macOS 26): the shim reads `/private/var/select/sh` and execs it, defaulting to `/bin/bash` (`shell=$(readlink /private/var/select/sh) || shell=/bin/bash`, quoted at `discourse.nixos.org/t/sandbox-issue-with-macos-10-15-and-proposed-fix-looking-for-feedback/4762`; Lix sandbox commit `git.lix.systems/puck/lix/commit/2e9bc1245c125f96ce53210751940067d4cf3f1c`); the target can be switched to `/bin/bash`, `/bin/dash`, `/bin/zsh` (scriptingosx.com, via search; the original article URL returned 404 when fetched). Apple support page states zsh is the default login shell since 10.15 and that `export BASH_SILENCE_DEPRECATION_WARNING=1` hides the bash notice (`support.apple.com/en-us/102360`). Whether `/bin/dash` ships on macOS 26 and from which project is UNVERIFIED (no `dash` project appears in `release.json`).

BSD vs GNU userland — verified against source (all read-only):

| behaviour | macOS (BSD) | evidence | GNU/Linux contrast |
|---|---|---|---|
| `readlink -f` | **added in 12.3** (12.2 option string `"n"`, 12.3 `"fn"`) | `file_cmds-352.40.6@33b700236334:stat/stat.c:222` vs `file_cmds-353.100.22@e3cc3ca6d5d3:stat/stat.c:242`; corroborated by scriptingosx.com/2022/03/some-cli-updates-in-macos-monterey | always |
| `realpath` command | **added in 13.0**: no `realpath/` dir in `shell_cmds-240.100.15` (12.3), present in `shell_cmds-278@8ddef153ec48`, `-326` | directory listings of the three tags | coreutils |
| `sed -i` | `-i` takes a mandatory extension argument: `getopt(…, "EHI:ae:f:i:lnru")` — so `sed -i 's/a/b/' f` eats the script as the suffix; portable form `sed -i.bak … f && rm f.bak` | `text_cmds-197@3342f27ec601:sed/main.c:126` | `-i[SUFFIX]` optional |
| `date -d` | **no `-d`**: option string `"f:I::jnRr:uv:z:"` (`-j`, `-f`, `-v` adjust) | `shell_cmds-326@b33f386ac431:date/date.c:116` | GNU `-d` |
| `stat -c` | **no `-c`**; format is `-f fmt` (`"f:FlLnqrst:x"`) | `file_cmds-475@afe96c16b2d4:stat/stat.c:249` | GNU `-c` |
| `mktemp -t` | `-t prefix` creates `$TMPDIR/prefix.XXXXXX` (optstring `"dp:qt:u"`, `-p` = dir, `-d` = dir) | `shell_cmds-326:mktemp/mktemp.c:84` | GNU `-t` = template relative to TMPDIR (different arg semantics) |
| `grep -P` | **invalid option**: Apple build uses `optstr = "0123456789A:B:C:D:EFGHIJLMOSRUVXZabcd:e:f:hilm:nopqrsuvwxyz"` under `#ifdef __APPLE__` (no `P`); the non-Apple branch has `P` meaning "no symlink follow", not PCRE | `text_cmds-197:grep/grep.c:163-166` | GNU `-P` = PCRE |
| `xargs -r` | accepted, **no-op** ("GNU compatibility"); BSD xargs already skips an empty-input run | `shell_cmds-326:xargs/xargs.c:250-252`, `xargs.1:224` | GNU needs `-r` |
| `base64 -d` / `-D` | `bintrans` implements both `-d`/`-D`/`--decode`; `jq` binary was added to `text_cmds` in 15.0 | `text_cmds-197:bintrans/bintrans.1:235`; `jq` dir present in `text_cmds-190.0.1` (15.0), absent in `text_cmds-165.100.8` (14.6) | GNU `-d` only (`-D` invalid) |
| `sha256sum` | **no applet**: `md5.c` registers `md5 sha1 sha224 sha256 sha384 sha512 … rmd160` and `shasum`-style names only; `shasum -a 256` is Perl's | `text_cmds-197:md5/md5.c:153` (the `"sha256"` entry; `sha256sum` string absent from the file) | coreutils `sha256sum` |
| `timeout`, `flock` | none found in `shell_cmds-326` dirs (`lockf` since 13: `shell_cmds-278`; `stdbuf` since 15.6/26.0) | directory listings | coreutils / util-linux |

The orchestrator's parenthetical "sha256sum availability (added in macOS 14?)" has **no support** in any Apple tag read: no `sha256sum` name in `md5.c` through 26.0, and `text_cmds-165.100.8` (14.6) lacks anything new there. Treat `sha256sum` as absent, `shasum -a 256` (Perl, preinstalled — `perl` is a macOS project) as the portable form. `/usr/bin/shasum` presence on macOS 26 is itself UNVERIFIED (no host).

Not verified (flag as UNVERIFIED in any rule): `find -printf` absence, `readlink` without arguments behaviour, `/bin/dash` existence/version, `/usr/bin/env` path (assumed `/usr/bin/env`), `sed` regex flavour differences beyond `-i`/`-E`.

---

## Axis 4 — Windows (MEASURED on host)

Host: Windows 11 Pro 10.0.26200 (`powershell.exe -NoProfile -Command "(Get-CimInstance Win32_OperatingSystem).Version"`), WSL2 distros present (ocx.sh, Ubuntu, docker-desktop). **PowerShell 7 is not installed on Windows**: `Get-Command pwsh` → nothing, `Test-Path 'C:\Program Files\PowerShell'` → `False`. Git for Windows 2.40.0.windows.1 (`git.exe --version`), Git Bash `bash 5.2.15(1)`, MSYS_NT-10.0-26200 3.3.6 (`uname -a`). Active code page 437 (`chcp`).

### 4.1 PowerShell probe (`matrix.sh pwsh $FX/probe.ps1`, trimmed)

| probe | pwsh 7.4.7 (Ubuntu 22.04 docker) | pwsh 7.6.6 (WSL Fedora 43) | **Windows PowerShell 5.1.26100.9444 (Windows host)** |
|---|---|---|---|
| `PSEdition` | Core | Core | Desktop |
| `$IsWindows` | False | False | **undefined (`$null`)** |
| `[Console]::OutputEncoding` | utf-8 (cp65001) | utf-8 | **IBM437 (cp437), the OEM code page** |
| `$OutputEncoding` (to native stdin) | utf-8, no BOM | utf-8, no BOM | **us-ascii** |
| `'a' \| Out-File` bytes | `61 0A` | `61 0A` | **`FF FE 61 00 0D 00` (UTF-16LE + BOM)** |
| `'a' > file` bytes | `61 0A` | `61 0A` | **`FF FE 61 00 0D 00`** |
| `'a' \| Set-Content` bytes | `61 0A` | `61 0A` | `61 0D 0A` (ANSI/ACP, no BOM) |
| `Add-Content` bytes | `61 0A` | `61 0A` | `61 0D 0A` |
| `Out-File -Encoding utf8` | `61 0A` (no BOM) | `61 0A` | **`EF BB BF 61 0D 0A` (BOM)** |
| `-Encoding utf8NoBOM` | accepted | accepted | **rejected** (`Cannot validate argument … does not belong to the set "unknown,string,unicode,bigendianunicode,utf8,utf7,utf32,ascii,default,oem"`) |
| `Get-Content` of a BOM-less UTF-8 file with `é` (4 chars) | 4 | 4 | **5 (decoded as ANSI)** |
| `[Environment]::NewLine` | `10` | `10` | `13,10` |
| `&&`, `\|\|` pipeline chain | ok | ok | **parse error** |
| ternary `? :` | ok | ok | **parse error** |
| `??` | ok | ok | **parse error** |
| `ForEach-Object -Parallel` | ok | ok | **error** (7.0+, from memory) |
| `ConvertFrom-Json -AsHashtable` | present | present | **absent** (6.0+, from memory) |
| `Invoke-WebRequest -UseBasicParsing` accepted | True | True | True (required on 5.1 in DOM-less contexts; accepted-and-ignored on 7) |
| `$PSNativeCommandArgumentPassing` | `Standard` | `Standard` | **undefined** |
| `$PSNativeCommandUseErrorActionPreference` | `False` | `False` | **undefined** |
| `[Net.ServicePointManager]::SecurityProtocol` | SystemDefault | SystemDefault | **SystemDefault on this 5.1.26100 build** (older .NET builds default to Ssl3,Tls — not measurable here) |
| `curl` resolves to | application `curl` | application | **alias for `Invoke-WebRequest`** (`Alias:curl`) |
| `sort` | application (`/usr/bin/sort`) | application | **alias for `Sort-Object`** |
| `Get-Command pwsh` / `powershell` | True / False | True / False | **False / True** |
| `Get-ExecutionPolicy -List` | all Unrestricted (non-Windows) | all Unrestricted | MachinePolicy Undefined, UserPolicy Undefined, Process Bypass (the harness's `-ExecutionPolicy Bypass`), **CurrentUser RemoteSigned (this user's setting)**, LocalMachine Undefined |
| path separator / `Join-Path a b` | `/` , `a/b` | same | `\` , `a\b` |

Re-run bare (no harness bypass): `powershell.exe -NoProfile -Command 'Get-ExecutionPolicy -List'` → CurrentUser RemoteSigned, rest Undefined. The *default* (all scopes Undefined) is documented as **Restricted on Windows client, RemoteSigned on Windows Server** (`learn.microsoft.com/…/about_execution_policies`, "Undefined" bullet, and the line "If no execution policy is set in any scope, the effective execution policy is Restricted, which is the default for Windows clients"). The same page also says `Default` = "RemoteSigned for Windows clients and servers" and `RemoteSigned` is "The default execution policy for Windows computers" — the page contradicts itself; the Undefined/Restricted statement is the one consistent with Windows PowerShell 5.1 behaviour (execution policy: unmeasurable here because this host's user has already set RemoteSigned). Script files downloaded with `Invoke-WebRequest`/`curl.exe` are **not** zone-marked (`about_execution_policies`, last Note), so RemoteSigned doesn't block them.

Windows PowerShell 5.1 measured behaviours that bite emitters: UTF-16LE with BOM from `>` and `Out-File`; `$OutputEncoding` ASCII when piping non-ASCII to a native program; BOM-less UTF-8 read as ANSI; no `&&`/`||`/ternary/`??`/`-Parallel`/`-AsHashtable`; `curl`/`sort` are aliases. PowerShell 7 on Windows was **not** measured (not installed); the Linux 7.x rows show the cross-platform baseline.

### 4.2 Git Bash on the host (`matrix.sh win $FX/probe.sh`, `$FX/out/gitbash_probe.txt`)

| item | value |
|---|---|
| `/bin/sh` | Git's `sh.exe` = bash `5.2.15(1)` (`sh_bashver=5.2.15(1)-release`) in POSIX-ish mode: `[[`, arrays, `<( )`, pipefail, `$'..'` all accepted |
| present in `…\Git\usr\bin` | dash, sh, bash, env, readlink, stat, sed, find, tar, perl, awk, gawk, file, ssh, unzip, getopt; **absent**: zsh, ksh, busybox, python3, curl (curl from `mingw64\bin`), xz, flock (`ls` of the dir, 398 entries) |
| coreutils / sed / grep / tar | GNU coreutils 8.32, sed 4.9, grep 3.0, tar 1.34, gawk 5.0.0 |
| `grep -P` | **n** (grep 3.0 built without PCRE in this Git) |
| `getopt` enhanced | y (`getopt -T` = 4) |
| my probe's `readlink_f=n`, `stat_c=n` | **probe artifacts, not findings**: `ln -s` without symlink privilege yields a copy, and `/etc/passwd` is absent in Git Bash; ignore those two cells |

The runner's Git Bash is newer (bash 5.3.15(2), Git 2.56.0.windows.1: `runner-images@8197087fc536:images/windows/Windows2025-Readme.md:17,67`) than this host's (5.2.15, Git 2.40.0). Rules should target the Git-Bash bash ≥5.2 line, not assume the host's.

### 4.3 PowerShell lifecycle (SOURCE: `learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle`, page dated 2026-09-09)

| version | release | end of support | .NET |
|---|---|---|---|
| 7.7 (preview) | — | — | 11 |
| **7.6 LTS** | 18-Mar-2026 | 14-Nov-2028 | 10 |
| 7.5 | 23-Jan-2025 | **10-Nov-2026** | 9 |
| **7.4 LTS** | 16-Nov-2023 | **10-Nov-2026** | 8 |
| 7.3 / 7.2 LTS | 2022 / 2021 | 08-May-2024 / 08-Nov-2024 | 7 / 6 |

Current LTS 7.6.6, previous LTS 7.4.20 "still supported until 10-Nov-2026". Windows PowerShell 5.1 is a Windows component with the OS lifecycle (same page, Note). H8 holds; the pwsh floor for non-installer scripts should be **7.4+ until 10-Nov-2026, 7.6+ after**. The same page lists Ubuntu 26.04, 24.04, 22.04, Debian 13/12, RHEL 8-10, Alpine 3.21-3.24 as supported platforms and says Ubuntu 25.10 (interim) is not tested.

---

## Axis 5 — BSDs and Android (READ-ONLY)

No BSD host; man pages only.

| OS | `/bin/sh` | evidence |
|---|---|---|
| FreeBSD 15.0-RELEASE | FreeBSD `sh`: "close to the IEEE Std 1003.1 ("POSIX.1") specification", Almquist-derived ("originally written by Kenneth Almquist", rewritten 1989); has `set -o pipefail`, `local`, `$'…'`, `echo -e`; **no arrays** (no mention in the page); **bash not in base** (ports/pkg only) | `man.freebsd.org/cgi/man.cgi?query=sh&sektion=1&manpath=FreeBSD+15.0-RELEASE` (footer "FreeBSD 15.0 May 1, 2025") |
| OpenBSD (-current) | `sh` is "actually `ksh` in disguise" (the public-domain Korn shell); `ksh(1)`: `pipefail` in `set -o`, arrays via `[expr]`, `[[ ]]`, co-processes `\|&`; **`$'…'` and process substitution are not documented**; bash not in base | `man.openbsd.org/sh` (footer "OpenBSD-current March 6, 2024"), `man.openbsd.org/ksh` (page truncated at 100k chars on fetch, remainder unread) |
| NetBSD (current man) | `sh` is a re-implementation and extension of the Bourne shell, "not a Korn shell clone"; documents `pipefail`, `local`, `$'…'`, `posix` option, intmax_t arithmetic (non-POSIX extension); bash not in base | `man.netbsd.org/sh.1` (page truncated at 100k chars on fetch) |
| Android | **mksh** has been the shell since Ice Cream Sandwich (ash unused before); utilities are **toybox** since Marshmallow (before: toolbox); awk added in Android P is Kernighan's one-true-awk; bzip2 tools from bzip2 distribution | AOSP `platform/system/core/shell_and_utilities/README.md` (via `android.googlesource.com/platform/system/core/+/master/shell_and_utilities/`, search snippet; `source.android.com` URL 404) |

Cross-check from the oils suite (Axis 6): `ash` (busybox 1.35.0, `spec-common.sh:6`, `spec-bin.sh:21`), dash, mksh and yash are the "other POSIX-ish" shells oils compares; there are **no BSD-sh, no ksh93, no fish/nu/pwsh** columns in it. FreeBSD/NetBSD sh behaviour therefore has no measured divergence data in this audit (gap).

---

## Axis 6 — oils spec-suite divergence map

### 6.1 Annotation semantics

From `sh_spec.py` (`oils-for-unix/oils@57d3f0d088c3:test/sh_spec.py:11-32`, fetched raw; not in the sparse clone) and the grammar at `:101`:

```
## <qualifier> <shell1>/<shell2>+… <key>: <value>      qualifier ∈ OK(-n) | BUG(-n) | N-I
```
- **PASS** = the ideal expected value (the unannotated assertion; in practice what bash/OSH do).
- **OK** = "a value that was not ideal, but expected" — a defensible difference.
- **N-I** = "Not implemented (e.g. $''). Assertions still checked (in case it starts working)".
- **BUG** = "we verified the value of a known bug".
- Rule of thumb: "If ALL shells agree on a broken behavior, they are all marked OK … If one shell disagrees with others, that is generally a BUG." Keys: `stdout`, `stdout-json`, `stderr`, `status`, multi-line `STDOUT:`. `compare_shells:` on line 1-ish of each file lists the shells compared (`sh_spec.py:1520-1522`); files without it (85 of 223: `ysh-*`, `hay*`, …) compare only OSH/YSH.
- **Bias warning**: the "ideal" is oils' reference, which targets bash compatibility. Low bash divergence is partly by construction; the numbers rank *how far each shell is from bash-like behaviour*, not an absolute quality.
- `ash` in the suite = busybox 1.35.0 (`test/spec-common.sh:6`, `test/spec-bin.sh:16-21`); `osh` rows excluded below.

### 6.2 Counts by shell × kind (unique case × shell × kind; `python3 -I $FX/oils_count.py`)

Annotation lines by kind (qualifier lines with a `key:`): OK 787, N-I 1164, BUG 703 (a raw `grep -rhoE '^## (OK|N-I|BUG)' spec/*.test.sh` gives the same ordering: 756 + 20 `OK-2` + 8 `OK-3`, 1164, 685 + 18 `BUG-2`; the regex version is what I trust). Files 223, cases (`####` headers) 3965.

| shell | OK | N-I | BUG | total | files comparing it (cases) | divergent cases / cases compared |
|---|---|---|---|---|---|---|
| mksh | 224 | 369 | 203 | 796 | 109 files (2311 cases) | 34.4% |
| dash | 153 | **439** | 94 | 686 | 79 files (1622) | **42.3%** |
| zsh | 147 | 174 | **184** | 505 | 71 files (1328) | 38.0% |
| bash | 154 | 100 | 117 | 371 | 122 + 14 `bash-4.4` files (≈2805) | 13.2% |
| ash (busybox 1.35) | 63 | 170 | 58 | 291 | 34 files (724) | 40.2% |
| yash | 12 | 30 | 17 | 59 | 6 files (108) | 54.6% |
| ksh (93) | 0 | 3 | 3 | 6 | not a standard compare target | — |
| osh (excluded) | 94 | 25 | 0 | 119 | — | — |

(`oils_counts.json`; denominator computed from `compare_shells:` lines and per-file case counts; bash's 2805 double-counts files that list both `bash` and `bash-4.4`.)

Reading it: **dash lacks the most (439 N-I)** — features oils tests that dash simply does not implement; **zsh has the most BUGs (184)** — it implements them *differently* from POSIX/bash; mksh sits between. Divergent-case counts by `key`: N-I `stdout` 508, N-I `status` 359, N-I `stdout-json` 272, BUG `stdout` 487, BUG `status` 159 — most divergences change visible output, not only exit status.

### 6.3 The 30 spec areas with the most divergence (non-osh annotations, `oils_top.py`)

Top 30 carry 1592 of 2714 annotations (58.7%); 99 of 223 files carry none.

| # | spec | cases | divergent cases | annotations | OK | N-I | BUG | leading shells (divergent cases) |
|---|---|---|---|---|---|---|---|---|
| 1 | builtin-read | 64 | 52 | 130 | 25 | 77 | 28 | zsh 38, dash 36, mksh 31, ash 19 |
| 2 | arith | 74 | 50 | 107 | 29 | 52 | 26 | dash 45, zsh 29, mksh 22 |
| 3 | builtin-printf | 63 | 39 | 104 | 23 | 63 | 18 | ash 26, zsh 25, mksh 24, dash 24 |
| 4 | errexit-osh | 35 | 27 | 92 | 10 | 82 | 0 | dash 26, mksh 25, ash 21, bash 20 |
| 5 | ble-idioms | 26 | 20 | 72 | 10 | 55 | 7 | dash 18, ash 18, yash 16, zsh 11 |
| 6 | assign | 48 | 33 | 68 | 32 | 18 | 18 | dash 26, mksh 15, zsh 13, bash 12 |
| 7 | sh-options | 39 | 32 | 65 | 22 | 41 | 2 | dash 30, mksh 23, bash 11 |
| 8 | builtin-vars | 41 | 24 | 61 | 22 | 29 | 10 | dash 22, mksh 16, zsh 16 |
| 9 | vars-special | 42 | 31 | 58 | 6 | 41 | 11 | dash 24, mksh 20, zsh 14 |
| 10 | bugs | 29 | 19 | 57 | 24 | 21 | 12 | dash 16, ash 15, mksh 11 |
| 11 | array | 78 | 40 | 54 | 19 | 28 | 7 | mksh 37, bash 15 |
| 12 | array-sparse | 40 | 34 | 53 | 16 | 36 | 1 | mksh 34, bash 19 |
| 13 | assign-extended | 39 | 32 | 50 | 13 | 32 | 5 | mksh 32, bash 16 |
| 14 | brace-expansion | 55 | 29 | 49 | 8 | 20 | 21 | mksh 23, zsh 17, bash 9 |
| 15 | var-op-test | 37 | 23 | 45 | 10 | 21 | 14 | dash 17, zsh 14, mksh 10 |
| 16 | ble-features | 9 | 9 | 40 | 26 | 14 | 0 | ash 9, dash 9, yash 8 |
| 17 | builtin-echo | 27 | 23 | 38 | 8 | 18 | 12 | dash 18, mksh 7, ash 7, zsh 6 |
| 18 | builtin-eval-source | 23 | 16 | 37 | 19 | 12 | 6 | dash 14, mksh 11, zsh 9 |
| 19 | builtin-bash | 13 | 9 | 36 | 0 | 36 | 0 | dash 9, mksh 9, zsh 9, ash 9 |
| 20 | builtin-meta-assign | 11 | 11 | 36 | 0 | 25 | 11 | dash 10, ash 8, zsh 7 |
| 21 | builtin-process | 26 | 18 | 36 | 4 | 6 | 26 | dash 12, mksh 9, zsh 8 |
| 22 | word-split | 55 | 12 | 36 | 8 | 16 | 12 | yash 10, mksh 7, dash 6 |
| 23 | toysh-posix | 23 | 17 | 35 | 16 | 2 | 17 | zsh 13, dash 6, bash 5 |
| 24 | xtrace | 19 | 17 | 35 | 21 | 10 | 4 | dash 15, mksh 12, bash 8 |
| 25 | redirect-multi | 13 | 12 | 34 | 9 | 21 | 4 | mksh 9, ash 9, zsh 9 |
| 26 | redirect | 41 | 23 | 34 | 14 | 13 | 7 | dash 20, mksh 10 |
| 27 | builtin-meta | 18 | 13 | 33 | 10 | 12 | 11 | dash 10, ash 10, zsh 6 |
| 28 | builtin-special | 12 | 11 | 33 | 9 | 15 | 9 | yash 7, ash 7, bash 6 |
| 29 | builtin-trap | 33 | 15 | 33 | 19 | 5 | 9 | mksh 12, dash 10, ash 9 |
| 30 | glob | 39 | 14 | 31 | 0 | 12 | 19 | dash 10, mksh 9, ash 7 |

Per-shell worst areas: dash — arith (45), builtin-read (36), sh-options (30), errexit-osh (26), assign (26), builtin-printf (24); mksh — array (37), array-sparse (34), assign-extended (32), builtin-read (31); zsh — builtin-read (38), arith (29), builtin-printf (25), regex (21), brace-expansion (17); bash — errexit-osh (20), array-sparse (19), assign-extended (16), array (15); yash — ble-idioms (16), word-split (10). Takeaway for rules: the unportable surface is concentrated in **`read`, `printf`, arithmetic, assignment forms (`local`/`declare`/`export x=$(…)`), `set -o` options, `errexit` edge cases, and arrays** — not in the grammar. `errexit-osh` (rank 4) is the evidence base for "never rely on `set -e` for control flow across shells".

---

## Smells (ranked)

1. **`#!/bin/sh` scripts validated only on a bash-as-sh host.** 12/21 default images accept `[[`, `==`, `$'..'`, `${x//}`, `function`, `source`; the 9 dash images reject every one. Arrays and `<()` depend further on bash version (4.4/4.2 reject `<()` in sh mode; busybox rejects arrays).
2. **`curl | sh` bootstrap on Debian/Ubuntu/Alpine containers.** 9/21 images have neither curl nor wget; 12/21 lack curl. Installers that assume curl need a wget/`busybox wget` fallback or an explicit prerequisite check.
3. **GitHub Actions default shell ≠ explicit `shell: bash`.** Unspecified = `bash -e {0}` (no pipefail, `false | true` passes, measured); `sh` = dash; pwsh = continues past failing natives (measured exit 0 on 7.6.6 and 5.1).
4. **macOS 3.2.57 bash + BSD userland in scripts that otherwise target Linux:** `sed -i` without suffix arg, `date -d`, `stat -c`, `grep -P`, `mktemp -t` semantics, no `sha256sum`, no `timeout`, no `flock`, `readlink -f` before 12.3, `realpath` before 13 — all source-verified.
5. **Version-sniffing GNU by `--version` output.** Ubuntu 25.10+ `ls --version` says `uutils coreutils`; `--version | grep GNU` is false while behaviour is compatible (20/20 probes passed). The probe is the wrong test, `readlink -f`-style capability probes are right.
6. **Assuming `which`, `getopt` (enhanced), `flock`, `tput`, `ps`, `find`, `xargs`, `tar`, `gzip` exist.** `which` missing on 7/21; enhanced getopt missing on 5/21; tar missing on AL2 and AL2023; find/xargs missing on AL2023 and Leap 16.0; `flock` on 3; `tput` on 9; `ps` on 10.
7. **`grep -P` / `find -printf` on Alpine/busybox** (3/21 and 5/21 respectively) and Git Bash `grep -P` (n).
8. **PowerShell 5.1 emitters:** `>`/`Out-File` produce UTF-16LE+BOM, `-Encoding utf8` writes a BOM, `$OutputEncoding` is ASCII to native stdin, `curl`/`sort` are aliases, no `&&`/`??`/ternary/`-Parallel`/`-AsHashtable`/`$PSNative*` variables.
9. **Locale:** `LANG` unset in 20/21 images, `C.UTF-8` absent on Alpine/busybox/nix (musl) — non-ASCII text handling differs; do not assume UTF-8 in `printf %s | wc -m`.
10. **mawk vs gawk:** Debian/Ubuntu `awk` is mawk (9/21); gawk-only functions silently break there.
11. **dash `$((i++))` and `trap … ERR`, `wait -n`, `printf -v`, `${x/a/b}`** — fail on dash 0.5.12 but pass on busybox ash (measured), a common source of "works on Alpine, breaks on Ubuntu".
12. **Using the oils divergence hot spots naively:** `read` (flags `-d`, `-a`, `-n`, `-r` handling), `printf` (`%q`, `%b`, `-v`), `arith` (`++`, `**`, base notation, division by zero status), `set -e` in compound contexts.

## Patterns worth encoding

- **Dialect decision table keyed by *deployment target*, not by habit:** `#!/bin/sh` ⇒ dash 0.5.11/0.5.12-6 semantics (no `[[`, arrays, `$'..'`, `${//}`, `pipefail`, `source`, `==`, `$((i++))`; `local` OK; `echo` unsafe → `printf`). Grade it against the 9-dash/12-nondash split.
- **Capability probes over version sniffing:** `readlink -f`, `date -d`, `sed -i` are not guaranteed on macOS ≤12.3 / BSD; probe with a functional one-liner; `command -v` for presence only. Never `--version | grep GNU`.
- **Portable idioms verified present on 21/21 images:** `mktemp -d`, `readlink -f`/`realpath` (macOS ≥12.3/13), `sha256sum` (Linux) with `shasum -a 256` fallback (macOS), `base64 -d` (macOS 26.0 accepts `-d` and `-D`), `date -d @N` (GNU/busybox) vs `date -r N` (BSD), `install -D`, `stat -c` (GNU) vs `stat -f` (BSD), `xargs -r` (harmless on BSD), `timeout` (not macOS), `sed -i.bak` (works on both).
- **Downloader fallback chain:** `curl -fsSL` → `wget -qO-` → fail with a one-line message naming both (curl absent on 12/21, wget on 17/21; both absent on 9/21).
- **CI hygiene:** always `shell: bash` (or `defaults.run.shell`), explicit `set -euo pipefail` if `sh` is used, and in pwsh steps check `$LASTEXITCODE` after each native or set `$PSNativeCommandUseErrorActionPreference = $true` (present on 7.4.7/7.6.6, absent on 5.1). For Windows, state whether `shell: bash` means Git Bash (5.3.15, MSYS2 tools not on PATH).
- **PowerShell 5.1 floor kit for installers:** no `&&`/`??`/ternary/`-Parallel`; write with `[IO.File]::WriteAllText(path, text, (New-Object Text.UTF8Encoding $false))`; set `$OutputEncoding = [Text.UTF8Encoding]::new($false)` or avoid piping non-ASCII to natives; call `curl.exe`/`sort.exe` explicitly; `-UseBasicParsing` on `Invoke-WebRequest` (5.1).
- **Locale pinning:** `LC_ALL=C` for byte semantics; `C.UTF-8` only after `locale -a` check (absent on Alpine/busybox).
- **Don't encode "dash has no pipefail":** version it: dash packages `0.5.12-12*` (Debian 13, Ubuntu 25.10+/26.04 runner) accept it; `0.5.12-2/-6ubuntu5` and older do not.
- **RHEL 8/AL2 `/bin/sh` is bash 4.4/4.2:** no process substitution in POSIX mode; AL2 additionally lacks tar in the base image.
- **Spec-hot-spot checklist from oils** (read/printf/arith/assign/set options/errexit/arrays) as the review checklist for cross-shell scripts.

## Contradictions of the frame

- **"dash lacks pipefail" (implicit in H6/the POSIX layer):** false for Debian 13 and Ubuntu 25.10/26.04/26.10 (`dash` 0.5.12-12*): `sh -c 'set -o pipefail; false | true; echo $?'` → `1`. 4 of 9 dash images support it. The Ubuntu 26.04 runner (`dash 0.5.12-12ubuntu3`) therefore changes `shell: sh` semantics when `ubuntu-latest` moves (Nov 2026).
- **"Ubuntu 25.10+ ships Rust coreutils by default; verify":** verified, but partial: 25.10 and 26.04 keep GNU `cp`, `mv`, `rm` alongside uutils for everything else (107/108 applets); only 26.10 is fully Rust (105 applets incl. cp/mv/rm, still pre-release). The 26.04 runner image lists the `coreutils` package only; whether uutils is active there is unverified.
- **H5 (partially refined):** all claims hold, with two corrections: Windows' default is `pwsh` *falling back to* `powershell`, never `cmd`; and pwsh's `$ErrorActionPreference='stop'` is irrelevant to native exit codes — measured exit 0 even with a failing `cmd /c exit 3` / `bash -c 'exit 3'` mid-script on both 7.6.6 and 5.1.
- **H7 (mostly confirmed, two nuances):** `/bin/bash` 3.2.57 and `/bin/zsh` 5.9 in macOS 26.x confirmed from Apple source (`bash-144:version.h:14`, `zsh-118` `VERSION=5.9`). "Homebrew's bash is 5.x but not first on PATH": the *runner* image installs **no** Homebrew bash at all (`toolset-15.json` has only `gnu-tar`); macOS runner `bash` = 3.2.57. The `/private/var/select/sh` shim is from secondary sources, not verified on 26.
- **H8 confirmed with dates:** 7.6 LTS (18-Mar-2026, EOS 14-Nov-2028), 7.4 EOS 10-Nov-2026; Windows host has only 5.1.26100.9444, no pwsh.
- **Frame "RHEL/Fedora/Arch `/bin/sh` is bash in POSIX mode":** true for 9/9 including Leap 16.0 and nixos/nix, but the bash *version* spans 4.2.46 to 5.3.20 across those images, and the POSIX-mode feature set changes with it (process substitution accepted in `--posix` only from 5.1: measured).
- **Orchestrator parenthetical "sha256sum added in macOS 14?":** unsupported; no Apple tag through 26.0 has a `sha256sum` applet. `realpath` is 13.0 (not 12.3); `readlink -f` is 12.3 (confirmed).
- **"busybox ash is the Alpine `/bin/sh`":** confirmed, but busybox ash 1.35/1.37 accepts far more than dash (`[[`, `$'..'`, `${x//}`, `local`, `pipefail`, `wait -n`, `printf -v`, `trap ERR`) — it is **not** a conservative POSIX proxy. A script green on Alpine can fail on Ubuntu `sh`.

## Gaps

- No macOS or BSD host: every macOS/BSD cell is source- or man-page-derived; `/bin/dash` on macOS, `/usr/bin/shasum`, `find -printf`, `env` path, and the `sh` shim on macOS 26 are UNVERIFIED. macOS 13.x zsh version not read (zsh-94/97).
- Docker base images, not cloud/VM images; the sudo-rs default on Ubuntu 25.10+ installs is unverified; uutils activation on the 26.04 *runner* is unverified.
- Windows PowerShell 7 on Windows not measured (not installed, no installs allowed); 7.x columns come from Linux. TLS default on older 5.1 builds not measurable (single host, build 26100).
- Execution policy default measured only partially (this user has CurrentUser=RemoteSigned); Windows client default Restricted is from docs, which contradict themselves.
- Git Bash probe has two invalid cells (`readlink_f`, `stat_c`); the host's Git (2.40.0) is older than the runner's (2.56.0).
- AL2 end-of-support date and Debian 11/Ubuntu 20.04 EOL state not verified in this audit although they are in the image list.
- oils suite: no fish, nushell, elvish, PowerShell, ksh93 (6 rows), FreeBSD sh, or bash 3.2 columns; divergence is measured against oils' bash-leaning reference; `bash-4.4`-only files inflate the bash denominator slightly. OpenBSD/NetBSD man pages truncated at 100k chars on fetch.
- `nixos/nix` image is minimal enough (no sed/awk/diff) that most of its userland cells reflect "tool missing", not "tool different".
- The user-owned "bash has a lot of online resources, incl. pitfalls" angle (BashFAQ/BashPitfalls, mywiki.wooledge.org) was not part of these six axes; no web pitfall corpus was ingested here.

## The portability floor table

"Guaranteed" = the shell a script gets as `/bin/sh` (or default `shell:`) on a fresh target. "Safe subset" = userland measured/verified present and behaviour-compatible; everything else needs a probe or fallback.

| target | guaranteed `/bin/sh` | bash | safe userland subset (beyond POSIX) | do not assume |
|---|---|---|---|---|
| Debian 11 | dash 0.5.11+git20200708 | 5.1.4 | GNU 8.32: `readlink -f`, `realpath`, `mktemp -d`, `sha256sum`, `date -d`, `stat -c`, `install -D`, `find -print0/-printf`, `xargs -0 -r -P`, `grep -P`, `sed -i -E`, `timeout`, `flock`, `getopt` (enhanced), perl-base, mawk | curl, wget, `ps`, bzip2/xz/zstd/unzip/file/jq, zsh/ksh, pipefail in sh |
| Debian 12 | dash 0.5.12-2 | 5.2.15 | same as above, GNU 9.1 | same; sh has no pipefail, no `$'..'` |
| Debian 13 | dash 0.5.12-12 (**pipefail yes**) | 5.2.37 | same, GNU 9.7 | curl/wget; `$'..'`, `[[`, arrays in sh |
| Ubuntu 20.04 / 22.04 / 24.04 | dash 0.5.10.2 / 0.5.11 / 0.5.12-6 | 5.0.17 / 5.1.16 / 5.2.21 | GNU 8.30 / 8.32 / 9.4 as Debian + `ps`; (20.04 also bzip2) | curl/wget on fresh container; pipefail in sh; bash 5.0 lacks 5.1+ features |
| Ubuntu 25.10 | dash 0.5.12-12 (pipefail) | 5.2.37 | **uutils** 0.2.2 (+GNU cp/mv/rm): same 20 probed behaviours pass | `--version` sniffing for GNU; GNU-only long options not probed |
| Ubuntu 26.04 / 26.10 | dash 0.5.12-12ubuntu3 (pipefail) | 5.3.9 | uutils 0.10.0 (26.10 incl. cp/mv/rm) | same; 26.10 pre-release |
| Alpine 3.22 / 3.23 | busybox ash 1.37.0 | none | busybox: `readlink -f`, `realpath`, `mktemp`, `sha256sum`, `date -d`, `stat -c`, `xargs -r -0 -P`, `sed -i -E`, `install -D`, `base64 -d`, `timeout`, `flock`, `wget`, `unzip`, `getopt -l` | `bash`, `grep -P`, `find -printf`, `locale`/`C.UTF-8`, `iconv`, `perl`, `curl`, GNU long options, `tar --zstd` |
| busybox:1.37 | busybox ash 1.37.0 | none | as Alpine; no `iconv`, no `curl` | everything GNU-specific |
| AlmaLinux 8 / RHEL 8 | bash 4.4.20 (POSIX mode) | 4.4.20 | GNU 8.30, gawk 4.2.1, curl, openssl, xz, hexdump | `<()` in `#!/bin/sh`; `which`; bash 4.4 lacks 5.0+ features (probe per feature) |
| AlmaLinux 9 / 10 | bash 5.1.8 / 5.2.26 | same | GNU 8.32 / 9.5, gawk 5.1/5.3, curl, python3 (not guaranteed), xz | `which`; `getopt` on 10; zstd |
| Amazon Linux 2 | bash 4.2.46 | 4.2.46 | GNU 8.22, gawk 4.0.2, curl, find/xargs | tar, gzip, flock, `<()` in sh, enhanced `getopt`, `which`; bash 4.2 is old — probe bash features, never assume 4.4+/5.x |
| Amazon Linux 2023 | bash 5.2.15 | 5.2.15 | GNU 8.32, gawk 5.1, curl, python3 | tar, gzip, find, xargs, flock, `which`, `getopt`, `find -printf` |
| Fedora 44 | bash 5.3.9 | 5.3.9 | GNU 9.10, curl, zstd, xz, bzip2, sudo | `which`, `getopt`, `ps`, `tput`, `file` |
| openSUSE Leap 16.0 | bash 5.2.37 | 5.2.37 | GNU 9.6, curl, openssl, xz, tar | find, xargs (absent in container), `which`, `ps` ok, `getopt` ok |
| Arch (rolling) | bash 5.3.20 | 5.3.20 | GNU 9.12, curl, zstd, xz, bzip2, file, openssl | none significant (most complete base) |
| nixos/nix | bash 5.3.9 (store path) | 5.3.9 | GNU 9.11 coreutils, git, ssh, wget | sed, awk, diff, curl, enhanced getopt, locale, flock |
| macOS 14 / 15 / 26 (**read-only**) | bash 3.2.57 as `/bin/sh` (shim; `/private/var/select/sh` UNVERIFIED) | 3.2.57; `/bin/zsh` 5.9 | BSD: `readlink -f` (≥12.3), `realpath` (≥13), `xargs -r` (no-op), `sed -i ''`/`sed -i.bak`, `sed -E`, `date -v/-j/-r`, `stat -f`, `mktemp -t`, `base64 -d/-D`, `shasum -a 256`, `jq` (≥15.0), `lockf` | `date -d`, `stat -c`, `grep -P`, `sha256sum`, `timeout`, `flock`, `find -printf`(UNVERIFIED), bash 4+ features, `${x,,}`, `mapfile`, `declare -A`, `wait -n` |
| Windows + Git Bash (Git 2.40 host / 2.56 runner) | bash 5.2.15 (host) / 5.3.15(2) (runner) as `sh` | same | GNU 8.32 coreutils, sed 4.9, tar 1.34, gawk, perl, curl (mingw), getopt, unzip, ssh | `grep -P`, `flock`, `xz`, python3 (PATH-dependent), symlinks (`ln -s` copies), `/etc/passwd`, MSYS2 tools on PATH (runner: not) |
| Windows PowerShell 5.1.26100 | n/a (`powershell.exe`) | n/a | `curl.exe`, `tar.exe`, `Invoke-WebRequest -UseBasicParsing`, `[IO.File]` APIs | `&&`, `??`, ternary, `-Parallel`, `-AsHashtable`, UTF-8-no-BOM by default, `$IsWindows`, `$PSNative*` |
| PowerShell 7.4 / 7.6 | n/a | n/a | everything above plus `&&`, ternary, `??`, `-Parallel`, `$PSNative*` (present on 7.4.7/7.6.6), UTF-8-no-BOM default | `pwsh` preinstalled on Windows (it is not); 7.4 EOS 10-Nov-2026 |
| FreeBSD 15.0 (**read-only**) | FreeBSD `sh` (Almquist-derived; pipefail, local, `$'..'`, no arrays) | not in base | BSD userland | bash, GNU long options (UNVERIFIED) |
| OpenBSD (**read-only**) | `sh` = ksh (public-domain Korn shell; pipefail, arrays, `[[`) | not in base | BSD userland | bash, `$'..'`/`<()` (not documented) |
| NetBSD (**read-only**) | NetBSD `sh` (Bourne re-impl.; pipefail, local, `$'..'`) | not in base | BSD userland | bash, ksh features |
| Android (**read-only**) | mksh (since ICS) | not present | toybox (since Marshmallow), one-true-awk (since P) | GNU coreutils, bash |
| GH runner `ubuntu-22.04` / `ubuntu-24.04` / `ubuntu-26.04` | `bash -e {0}` default; `sh` = dash 0.5.11 / 0.5.12-6 / 0.5.12-12 | 5.1.16 / 5.2.21 / 5.3.9 | curl 8.18 (26.04 list), pwsh 7.6.6, git, perl, python3 | zsh/fish/ksh (not listed); default `bash -e` has no pipefail |
| GH runner `macos-14/15/26` | `bash -e {0}` = **bash 3.2.57** | 3.2.57 (login shell forced to `/bin/bash`) | pwsh 7.6.x, `gtar` (GNU tar 1.35) only | GNU sed/coreutils, bash 4+, zsh as a documented tool |
| GH runner `windows-2022/2025` | default shell **pwsh 7.6.6** (fallback powershell 5.1); `shell: bash` = Git Bash 5.3.15(2) | 5.3.15(2) | Git, MSYS2 at `C:\msys64` not on PATH, WSL | Git Unix tools on PATH (installed with `CmdTools`), `msys2bash` needs explicit shell |
