---
title: Exemplar corpus shape - numbers-first audit of 39 upstream shell codebases
agent: shell-audit / exemplar-shape worker
model: sonnet (claude-sonnet-5-5)
scope: 39 of the 41 directories under ~/.cache/research-lang/exemplars/shell (skipped koalaman__shellcheck.wiki and actions__runner-images, which are documents). POSIX/bash/zsh/ksh scripts, PowerShell, fish/nu/elvish. Exemplars only; the fleet under /home/mherwig/dev was not counted.
method: |
  Every number below is re-runnable. Work dir (throwaway, fixtures only): ~/.cache/research-lang/shell-tools/fixtures/exemplar-shape/ (scripts inv.py classify.py sc.py dis.py err.py feat.py fmt.py ci.py ps.py nuchk.py fchk.sh syn_bash.sh syn_sh.sh pssa1.ps1 and their outputs). Toolchain: shellcheck 0.11.0, shfmt 3.13.1, fish 4.9.3/4.7.0 (ocx), nu 0.116.0/0.105.1 (ocx), elvish 0.21.0, pwsh 7.6.6, PSScriptAnalyzer 1.25.0 (Save-Module into fixtures/exemplar-shape/modules), Windows PowerShell 5.1.26100 on the Windows host, docker bash:3.2/4.4/5.2, shellzoo:deb12/deb13 (fish 3.6.0/4.0.2, dash, posh, mksh, ksh93u+m, yash, busybox ash). Inventory = python3 -I walk of each clone (no .git, no symlinks), dialect = shebang interpreter else extension. Commands are inlined per section.
date_researched: 2026-10-10
---

# Exemplar corpus shape (researched 2026-10-10)

Citation form: `<repo>@<sha12>:<path>:<line>`; SHAs in `shell-audit/scratch/exemplar-shas.md`. Short names used: nvm@b1b3a0038c06, acme.sh@807da6498377, rustup@61271d00a979, brew-install@8ab1549dfa11, dotnet-install@e5cf1dd2d154, pyenv@d28b750767d4, rbenv@07e9b1e297a5, bats-core@0c92eb4c418d, cargo-dist@d1055f48071e, k3s@82a6ddcd820b, shellspec@f2d13f991885, vcpkg@e456309491fd, ohmyzsh@42a4ccb1b14d, oils@57d3f0d088c3, zoxide@86b443cffcd7, direnv@28a73d1df3f3, fzf@25adb674537b, starship@d4d0459c5c24, mise@19e8c8f0d03d, atuin@56525ac6a7a9, conda@66d82122dc63, oh-my-posh@b0a8acd4d402, git@6de20f6092dc, nu_scripts@4033ddf35966, fish-shell@ac50fe526f74, elvish@26a8bd5c4ee1, Scoop@e6aa3b366bde, Pester@98e56d65da16, posh-git@bbc5ac380018, PSScriptAnalyzer@411c3d0b197b, PowerShell@5d871eb5e02c, deno_install@41d4676f8677, docker-install@2b32480025b2.

## Contents

1. Headline numbers
2. Corpus shape and dialect census (axis 1a)
3. Declared floors vs CI (axis 1b)
4. Error-handling census (axis 2)
5. Bash-version features vs declared floors (axis 3)
6. shellcheck (axis 4)
7. Formatting (axis 5)
8. Testing (axis 6)
9. PowerShell (axis 7)
10. fish / nu / elvish and version churn (axis 8)
11. Emitter payload shape (extra: the "emitters" group)
12. Smells (ranked)
13. Patterns worth encoding
14. Contradictions of the frame
15. Gaps

## Headline numbers

| What | Number | Command / source |
|---|---|---|
| Repos audited / regular files walked | 39 / 18,447 | `python3 -I inv.py` (os.walk, no .git, no symlinks) |
| Shell-family files | 10,525: sh-shebang 2,049, bash 2,064, zsh 594, ksh 1, no-shebang `.sh` 615, `.bats` 295, fish 1,657, nu 1,756, elvish 65, ps1/psm1 1,328, psd1 101 | `python3 -I classify.py` |
| Bash shebang forms | `env bash` 1,927 vs `/bin/bash` 79 (4%); `/bin/sh` 1,757 vs `env sh` 292 (287 are acme.sh) | `python3 -I sb.py` |
| shellcheck 0.11.0 `--norc` | 2,174 files (4 repos capped at 300), 13,865 findings, 870 files (40%) clean; info 9,984 / warning 2,659 / style 1,014 / error 208 | `python3 -I sc.py && python3 -I sc_an.py` |
| SC3xxx (bashism-under-sh) | 36 of 1,020 `#!/bin/sh` files (3.5%); 22 (2.2%) once `local` (SC3043) is ignored | `shellcheck` (dialect from shebang), filter 3000-3999 |
| Corpus top codes | SC2086 4,387; SC2016 2,608; SC1091 1,108; SC2329 1,020; SC2034 709; SC2006 422 | same |
| Inline `shellcheck disable=` | 1,185 directives in 21 repos; ~148 (12.5%) carry a justification; `.shellcheckrc` exists in 2 of 39 repos | `python3 -I dis.py` |
| errexit / nounset / pipefail | files with `set -e*`: 835 of 5,072 (16%); `-u` 502 (10%); `pipefail` 425 (8%); all three 231 | `python3 -I err.py` |
| Bash >=4 features outside oils | `declare -A` 4 files, `mapfile` 1, `${x,,}` 3, `[[ -v` 1, `${x@P}` 2 (of 1,676 non-oils bash files) | `python3 -I feat.py` |
| Syntax floor, `bash -n` on bash 3.2 | 19 of 2,062 bash-dialect files fail; 15 oils test fixtures, 3 extglob false positives, 1 real (oh-my-posh omp.bash:34) | docker `bash:3.2 bash -n` loop |
| `#!/bin/sh` files failing `-n` | dash 8, busybox ash 8, mksh 7, ksh93 9, posh 10, yash 11 (94 in C locale) of 1,733 | `syn_sh.sh` in shellzoo:deb12 |
| shfmt 3.13.1 `-d` | 980 of 2,151 parseable files (45.6%) clean at their dominant indent with default style; indent 2sp 54%, tab 32%, 4sp 13% | `python3 -I fmt.py` |
| Test volume | git t/ 1,061 files / 19,917 `test_expect_*`; oils spec 223 files / 3,965 cases; mise e2e 1,366 files; Pester-style 677 `*.Tests.ps1`; bats 295 | `find` + python counts, section 8 |
| PowerShell parse floor | 1,327 ps1/psm1: 52 fail Windows PowerShell 5.1 parse, 6 fail pwsh 7.6.6; 46 of the 47 5.1-only failures are the PowerShell repo's own test fixtures, 1 is vcpkg (leading-pipe line continuation, 7.0+) | `ParseFile` on the Windows host and in pwsh |
| PSScriptAnalyzer 1.25.0 default rules | 1,119 files, 5,051 findings, 357 files (32%) clean | `Invoke-ScriptAnalyzer`, 10 parallel pwsh processes |
| nu version churn | nu_scripts 1,545 files: 69 (4.5%) differ between nu 0.105.1 and 0.116.0 (28 old-only, 41 new-only), 35 fail on both | `nu-check` (planted error verified) |
| fish version churn | 1,657 fish files: 15 fail `fish -n` on 3.6.0, 14 on 4.0.2, 5 on 4.7.0, 5 on 4.9.3; 10 differ 3.6 vs 4.9 (0.6%) | `fish -n` (planted error verified) |

## Corpus shape and dialect census (axis 1a)

```
python3 -I inv.py          # 18,447 files -> inv.json
python3 -I classify.py     # dialect = shebang interp (sh dash ash bash zsh ksh mksh fish nu elvish pwsh) else extension
```

"sh" = shebang is sh/dash/ash; "sh-ext" = `.sh` with no shebang (sourced libraries, git-gui, shellspec specs, oils spec cases).

| repo | sh | bash | zsh | ksh | sh-ext | bats | fish | nu | elvish | pwsh | psd1 | total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Homebrew__install | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| JanDeDobbeleer__oh-my-posh | 0 | 2 | 1 | 0 | 0 | 0 | 2 | 1 | 1 | 6 | 1 | 14 |
| PowerShell__PSScriptAnalyzer | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 228 | 43 | 271 |
| PowerShell__PowerShell | 1 | 10 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 508 | 47 | 568 |
| ScoopInstaller__Install | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 1 | 7 |
| ScoopInstaller__Scoop | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 81 | 1 | 82 |
| acmesh-official__acme.sh | 287 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 287 |
| ajeetdsouza__zoxide | 1 | 1 | 1 | 0 | 0 | 0 | 2 | 1 | 1 | 1 | 0 | 8 |
| atuinsh__atuin | 3 | 18 | 2 | 0 | 3 | 0 | 1 | 1 | 0 | 1 | 0 | 29 |
| axodotdev__cargo-dist | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| bats-core__bats-core | 0 | 69 | 0 | 0 | 0 | 225 | 0 | 0 | 0 | 0 | 0 | 294 |
| conda__conda | 0 | 3 | 0 | 0 | 8 | 0 | 1 | 0 | 0 | 2 | 0 | 14 |
| dahlbyk__posh-git | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 32 | 2 | 34 |
| denoland__deno_install | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 4 |
| direnv__direnv | 2 | 8 | 1 | 0 | 1 | 0 | 2 | 0 | 1 | 1 | 0 | 16 |
| docker__docker-install | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 |
| dotnet__install-scripts | 4 | 22 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 36 | 1 | 63 |
| dylanaraps__pure-bash-bible | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| elves__elvish | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 61 | 0 | 0 | 69 |
| fish-shell__fish-shell | 16 | 3 | 0 | 0 | 0 | 0 | 1627 | 0 | 0 | 0 | 0 | 1646 |
| git__git | 1228 | 4 | 1 | 0 | 94 | 0 | 0 | 0 | 0 | 2 | 0 | 1329 |
| jdx__mise | 5 | 1363 | 10 | 0 | 6 | 0 | 9 | 0 | 0 | 110 | 0 | 1503 |
| jorgebucaran__fisher | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 5 |
| junegunn__fzf | 0 | 7 | 2 | 0 | 2 | 0 | 3 | 3 | 0 | 1 | 0 | 18 |
| k3s-io__k3s | 6 | 36 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 44 |
| microsoft__vcpkg | 11 | 5 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 35 | 1 | 54 |
| nushell__nu_scripts | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 1545 | 0 | 0 | 0 | 1547 |
| nushell__nushell | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 203 | 0 | 2 | 0 | 209 |
| nvm-sh__nvm | 360 | 7 | 1 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 370 |
| ohmyzsh__ohmyzsh | 5 | 4 | 541 | 0 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 559 |
| oils-for-unix__oils | 25 | 388 | 0 | 0 | 273 | 0 | 1 | 0 | 0 | 0 | 0 | 687 |
| pester__Pester | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 268 | 4 | 272 |
| pyenv__pyenv | 2 | 56 | 1 | 0 | 1 | 47 | 1 | 0 | 0 | 0 | 0 | 108 |
| rbenv__rbenv | 0 | 31 | 0 | 0 | 0 | 23 | 0 | 0 | 0 | 0 | 0 | 54 |
| romkatv__powerlevel10k | 2 | 0 | 17 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 21 |
| rust-lang__rustup | 4 | 7 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 2 | 0 | 15 |
| shellspec__shellspec | 72 | 2 | 1 | 1 | 210 | 0 | 0 | 0 | 0 | 0 | 0 | 286 |
| starship__starship | 1 | 5 | 1 | 0 | 0 | 0 | 1 | 1 | 1 | 4 | 0 | 14 |
| zsh-users__zsh-autosuggestions | 1 | 0 | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 14 |
| TOTAL | 2049 | 2064 | 594 | 1 | 615 | 295 | 1657 | 1756 | 65 | 1328 | 101 | 10525 |

Extremes: largest by shell volume are mise 1,503 (1,363 bash e2e scripts), nu_scripts 1,547, fish-shell 1,646 (`share/completions` 1,095 + `share/functions` 277), git 1,329 (1,228 `t/*.sh`). Smallest real installers: deno_install 2 sh, Homebrew 2 bash, cargo-dist 1 template. Contamination to know when reading per-repo numbers: oils includes vendored `Python-2.7.13/` shell (libtool `ltmain.sh`, oils@57d3f0d088c3:Python-2.7.13/Modules/_ctypes/libffi/ltmain.sh), spec cases and deliberately broken `test/parse-errors/*.sh`; PowerShell and PSScriptAnalyzer ps1 are mostly test fixtures; git t/ is test scripts, not product code.

Shebang histogram (all shell-dialect files with a shebang; `sb.py`):

| Shebang | Files | Note |
|---|---|---|
| `#!/usr/bin/env bash` | 1,927 | 1,359 mise e2e, 381 oils, 48 pyenv, 35 bats-core |
| `#!/bin/sh` (+ `#! /bin/sh`) | 1,757 | git 1,228, nvm 360, shellspec 72, ohmyzsh 5 |
| `#!/usr/bin/env sh` | 292 | acme.sh 287 (every file) |
| `#!/bin/bash` | 79 | k3s 31, PowerShell 8, rustup 7, vcpkg 4 |
| `#!/usr/bin/env zsh` / `/bin/zsh` | 46 / 7 | mise e2e 10, ohmyzsh 34 |
| `#!/bin/sh -e` / `-eu` / `-eux` / `-u -u` | 24 / 3 / 3 / 1 | errexit in the shebang: 31 files (0.6% of 5,072) |
| no shebang, by extension | `.zsh` 401, `.zsh-theme` 140, `.bash` 58 | zsh plugins and sourced libs |

Finding: `env bash` outnumbers `/bin/bash` 24:1; `env bash` resolves to whatever is first on PATH, so on stock macOS it is 3.2.57 unless a Homebrew bash precedes it, while the 79 `/bin/bash` files are 3.2 on macOS by construction.

## Declared floors vs CI (axis 1b)

```
grep -rEIn --include='*.md' --include='*.yml' --include='*.rst' --include='*.sh' --include='*.bash' --exclude-dir=.git \
  -e 'bash 3\.2|[Bb]ash 3\.x|minimum.{0,20}bash|requires? .{0,12}bash|zsh 5\.[0-9]|PowerShell (v)?5\.1 |#Requires -Version|POSIX[- ]compliant' .
python3 -I ci.py          # per-repo runs-on / matrix os / shell: keys / tool mentions in .github/workflows (crude; only the curated table below is trusted)
```

`#Requires -Version` appears in 15 ps1 files (5.1: 7, 7.x: 3, 5.x: 2, 6.x: 2, 2.0: 1; `ps.py`). Declared floors found by reading (not grep counts):

| Repo | Declared floor (citation) | CI tests the floor? |
|---|---|---|
| bats-core | "Bash 3.2 or above" (bats-core@0c92eb4c418d:docs/source/index.rst:4); runtime gate `needs to be run by Bash >= 3.2` (bin/bats:11-14) | Yes: docker `bash:{3.2,4.0,4.1,4.2,4.3,4.4,4,5.0,5.1,5,rc}` x parallel on/off (.github/workflows/tests.yml:199-216) |
| pyenv | "We are limited to Bash 3.2 features ... the version shipped with MacOS" (pyenv@d28b750767d4:CONTRIBUTING.md:7) | Partly: macos-14 + ubuntu jobs; no bash-version matrix. Code gates 4.x features with `BASH_VERSINFO` (libexec/pyenv-rehash:139, pyenv-versions:90) |
| rbenv | none stated; all 31 bash files free of >=4 features (section 5) | macos-latest + ubuntu bats job |
| Homebrew/install | bash 3.x implied | Syntax only: `/bin/bash -u -n install.sh` on macOS (brew-install@8ab1549dfa11:.github/workflows/tests.yml:60-64); note `-O extglob` needed for uninstall.sh |
| atuin | "requires bash >= 3.1" (atuin@56525ac6a7a9:crates/atuin/src/shell/atuin.bash.d/include-guard.bash:8-9); buildkite scripts "stick to bash 3.2" (.buildkite/scripts/lib.sh:3) | No bash-3 job found in .github/workflows |
| git (completion) | "Compatible with bash 3.2.57" (git@6de20f6092dc:contrib/completion/git-completion.bash:58) | Not on macOS in the checked-out workflows (ubuntu, windows, alpine only) |
| nvm | "any POSIX-compliant shell (sh, dash, ksh, zsh, bash)" (nvm@b1b3a0038c06:README.md:100, PROJECT_CHARTER.md:3) | Yes: matrix `sh bash dash zsh` x `gawk mawk` (tests-fast.yml:22-32), ksh in tests.yml:30, alpine (tests-alpine.yml), xenial (tests-xenial.yml), windows via WSL (windows-nvm.yml); tests-fast.yml:108 notes "/bin/sh and /bin/bash are bash 3.2" on macOS |
| shellspec | POSIX shells incl. "bash 3.2.25- in POSIX mode only" (shellspec@f2d13f991885:docs/shells.md:70) | Yes, widest in corpus: 24 workflows (ubuntu focal/jammy/noble, macOS 12/13/14 + brew, FreeBSD 12-14, NetBSD 9/10, OpenBSD 7.3-7.5, DragonFly 6.4, Solaris 11.4, Windows busybox/cygwin/gitbash/msys), shells sh/dash/bash/ksh/zsh/mksh/posh/yash/busybox |
| acme.sh | "pure POSIX sh (no coproc, no bash arrays)" (acme.sh@807da6498377:deploy/truenas_websocat.sh:15) | Yes: 16 VM workflows over 15 distinct `vmactions/*-vm` OSes (FreeBSD, GhostBSD, OpenBSD, NetBSD, DragonFly, MidnightBSD, HardenedBSD, OPNsense, Solaris, OmniOS, OpenIndiana, Tribblix, Haiku, Hurd, openEuler), alpine container, macOS, Windows |
| rustup-init.sh | "runs on Unix shells like {a,ba,da,k,z}sh ... uses the common `local` extension" (rustup@61271d00a979:rustup-init.sh:8-9) | shellcheck `-s dash` only (.github/workflows/ci.yaml:1676-1678); no multi-shell run |
| mise | bash 3.2 for activate and e2e ("handle empty __MISE_FLAGS array with set -u on bash 3.2", CHANGELOG.md:7466; scripts/pgo.bash:57) | macOS-14 unit job; e2e is Linux, only `*macos*`-named tests run on macOS (test-impl.yml:182-184) |
| zoxide | bash 4.4+ only for `@Q` completion (zoxide@86b443cffcd7:templates/bash.txt:159, README.md:82) | Emitted code is parsed by bash/dash/shellcheck/shfmt in cargo tests (src/shell.rs:57-229) |
| PowerShell side | Pester: "compatible with Windows PowerShell 5.1 and PowerShell 7.4 and newer" (Pester@98e56d65da16:README.md:72); posh-git manifest 5.0; Scoop pins Pester 5.2-5.99 (Scoop/test/bin/init.ps1:4) | Pester ci.yml matrix has a Windows PowerShell 5.1 leg (ci.yml:256); posh-git has `powershell.yml` + `pwsh.yml` |
| fish/nu/elvish | None stated in code; fzf CI pins `nushell=0.114.1-0` (fzf@25adb674537b:.github/workflows/linux.yml:43) | nushell, fzf, oh-my-posh, conda, mise, pyenv run fish/zsh/nu jobs; no repo runs a nu or fish version matrix |

Finding: of the 11 repos with a stated bash/POSIX floor (rbenv states none), 4 actually run it (bats-core, nvm, shellspec, acme.sh); 3 test it only as a syntax parse or a linter (Homebrew, rustup, zoxide); 4 trust discipline plus `BASH_VERSINFO` guards (pyenv, atuin, git completion, mise).

## Error-handling census (axis 2)

```
python3 -I err.py    # line-regexes on non-comment lines, per file, dialects sh/bash/ksh/sh-ext/zsh; oils spec cases skipped
#   errexit: ^\s*set\s+-[a-zA-Z]*e | set -o errexit | shebang -e      pipefail: set .* -o pipefail      nounset: set -[a-z]*u | -o nounset
#   local_mask: ^\s*(local|declare|typeset|readonly|export)\s+(-\w+\s+)*NAME=("?\$\(|`)    or_true: \|\|\s*(true|:)      trap: ^\s*trap\s
```

Columns `f:` = files containing it; `n:` = matching lines.

| repo | files | f:errexit | f:pipefail | f:nounset | f:trap | n:local_mask | n:or_true | n:or_return | n:or_die | n:$? | n:set +e | n:trap ERR | n:inherit_errexit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Homebrew__install | 2 | 0 | 0 | 2 | 2 | 0 | 0 | 11 | 10 | 2 | 0 | 0 | 0 |
| JanDeDobbeleer__oh-my-posh | 3 | 0 | 0 | 0 | 2 | 4 | 0 | 4 | 0 | 8 | 0 | 0 | 0 |
| PowerShell__PowerShell | 13 | 1 | 0 | 0 | 8 | 0 | 0 | 0 | 0 | 7 | 0 | 0 | 0 |
| acmesh-official__acme.sh | 287 | 0 | 0 | 0 | 1 | 4 | 0 | 141 | 6 | 386 | 0 | 0 | 0 |
| ajeetdsouza__zoxide | 3 | 0 | 0 | 1 | 0 | 0 | 3 | 3 | 4 | 2 | 0 | 0 | 0 |
| atuinsh__atuin | 26 | 17 | 13 | 15 | 5 | 1 | 7 | 28 | 2 | 19 | 0 | 0 | 0 |
| axodotdev__cargo-dist | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 6 | 0 | 10 | 0 | 0 | 0 |
| bats-core__bats-core | 69 | 23 | 6 | 7 | 15 | 7 | 13 | 3 | 0 | 22 | 1 | 7 | 0 |
| conda__conda | 11 | 2 | 1 | 1 | 0 | 1 | 0 | 3 | 0 | 0 | 0 | 0 | 0 |
| denoland__deno_install | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| direnv__direnv | 12 | 6 | 5 | 4 | 4 | 2 | 5 | 7 | 0 | 9 | 2 | 0 | 0 |
| docker__docker-install | 5 | 5 | 1 | 1 | 1 | 0 | 3 | 0 | 0 | 1 | 1 | 0 | 0 |
| dotnet__install-scripts | 26 | 9 | 1 | 2 | 0 | 40 | 12 | 9 | 0 | 42 | 1 | 0 | 0 |
| dylanaraps__pure-bash-bible | 2 | 0 | 0 | 0 | 1 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| elves__elvish | 8 | 3 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| fish-shell__fish-shell | 19 | 18 | 1 | 2 | 2 | 0 | 2 | 0 | 3 | 1 | 1 | 0 | 0 |
| git__git | 1327 | 15 | 0 | 0 | 4 | 45 | 64 | 701 | 35 | 153 | 0 | 0 | 0 |
| jdx__mise | 1384 | 177 | 153 | 168 | 91 | 3 | 396 | 156 | 197 | 98 | 13 | 0 | 0 |
| junegunn__fzf | 11 | 3 | 1 | 2 | 1 | 4 | 0 | 7 | 1 | 25 | 1 | 0 | 0 |
| k3s-io__k3s | 44 | 26 | 0 | 3 | 8 | 5 | 21 | 4 | 7 | 10 | 8 | 0 | 0 |
| microsoft__vcpkg | 17 | 10 | 0 | 2 | 0 | 4 | 0 | 6 | 0 | 0 | 0 | 0 | 0 |
| nushell__nu_scripts | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| nushell__nushell | 4 | 3 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| nvm-sh__nvm | 370 | 102 | 0 | 6 | 4 | 31 | 61 | 35 | 1499 | 162 | 44 | 1 | 0 |
| ohmyzsh__ohmyzsh | 557 | 2 | 0 | 0 | 5 | 177 | 10 | 246 | 0 | 135 | 1 | 0 | 0 |
| oils-for-unix__oils | 437 | 269 | 236 | 242 | 14 | 111 | 157 | 29 | 11 | 278 | 2 | 3 | 6 |
| pyenv__pyenv | 60 | 46 | 1 | 2 | 5 | 38 | 73 | 50 | 2 | 16 | 1 | 4 | 0 |
| rbenv__rbenv | 31 | 26 | 0 | 1 | 1 | 2 | 15 | 1 | 1 | 0 | 0 | 0 | 0 |
| romkatv__powerlevel10k | 21 | 2 | 0 | 3 | 7 | 43 | 11 | 467 | 0 | 64 | 0 | 0 | 0 |
| rust-lang__rustup | 11 | 6 | 1 | 3 | 0 | 0 | 2 | 3 | 0 | 10 | 0 | 0 | 0 |
| shellspec__shellspec | 286 | 58 | 0 | 28 | 12 | 1 | 92 | 178 | 19 | 108 | 12 | 0 | 0 |
| starship__starship | 7 | 3 | 2 | 3 | 2 | 0 | 3 | 0 | 0 | 4 | 1 | 0 | 0 |
| zsh-users__zsh-autosuggestions | 14 | 1 | 0 | 0 | 0 | 4 | 0 | 8 | 0 | 10 | 0 | 0 | 0 |
| TOTAL | 5072 | 835 | 425 | 502 | 195 | 527 | 950 | 2109 | 1797 | 1582 | 89 | 15 | 6 |

Totals (5,072 files): errexit 835 files (16%), nounset 502 (10%), pipefail 425 (8%), all three 231, trap 195 (3.8%), `trap ... ERR` 15 lines, `inherit_errexit` 6 lines (5 in oils), `local x=$(..)` 527 lines, `|| true`/`|| :` 950, `|| return|exit` 2,109, `|| die`-family 1,797 (1,499 are nvm test assertions, `nvm@b1b3a0038c06:test/fast/**`).

By dialect and role (`python3 -I` snippet over the same regexes, test = path under test/, spec/, e2e/, demo/, benchmarks/, t/):

| Population | Files | errexit | nounset | pipefail | all three |
|---|---|---|---|---|---|
| bash, product/src | 443 | 302 (68%) | 177 (40%) | 109 (25%) | 105 |
| bash, tests/demos | 1,621 | 284 (18%) | 260 (16%) | 132 (8%) | 126 |
| `#!/bin/sh`, product/src | 503 | 110 (22%) | 39 (8%) | 0 | 0 |
| `#!/bin/sh`, tests | 1,546 | 112 (7%) | 8 (1%) | 0 | 0 |
| no-shebang `.sh` | 366 | 15 (4%) | 7 (2%) | 1 | 1 |

Caveat on bash/tests: mise's e2e harness injects `-euo pipefail` from outside (`bash --noprofile --norc -euo pipefail -c 'source assert.sh && source TEST'`, mise@19e8c8f0d03d:e2e/run_test:173-177), so its 1,363 bash files under-count; 177 of them also repeat `set -euo pipefail` themselves.

Spot-reads (5 random hits each of errexit, trap, `|| true`, `|| return|exit`; plus 6 `local x=$(`): 26/26 syntactically correct matches. Population contamination seen: 1 of 20 in oils vendored Python libtool, others in oils/git/mise test fixtures. False-positive rate of the regexes: 0%; false-population rate (test fixture, vendored, deliberate): about 15-20%.

**Who avoids `set -e`, and why (cited):**

| Project | Evidence | Style instead |
|---|---|---|
| git t/ | 15 of 1,327 files use `set -e`; `--chain-lint` checks that every test line is `&&`-chained "so that a failure in the middle does not go unnoticed by the final exit code" (git@6de20f6092dc:t/README:195-203) | `&&` chains, `\|\| return\|exit` (701 lines in 1,327 files), `test_must_fail` |
| nvm | nvm.sh is sourced into the user's shell, so it must not impose or break errexit: `nvm()` detects the caller's flags with `[ "${-#*e}" != "$-" ]`, does `set +e`, runs, then restores `set -e` (nvm@b1b3a0038c06:nvm.sh:3877-3885, same for `-a` and bash `-E` at 3886-3905); install.sh:13 comments `\|\| true` for shells with errexit-style options (zsh ERR_RETURN). Tests do use `set -e`: 102 of 370 files | explicit `\|\| return`, `nvm_err` helpers |
| rustup-init.sh | `set -u` only (rustup@61271d00a979:rustup-init.sh:29); errors via `ensure()` ("Run a command that should never fail ... terminate with an error showing the failing command", :646-657), `need_cmd`, `assert_nz`, `ignore()` for deliberate ignores | explicit wrapper functions |
| acme.sh | 0 of 287 files use `set -e/-u/pipefail`; 301 `return 1` in acme.sh itself (acme.sh@807da6498377:acme.sh); its CI excludes SC2181 and SC2089 (.github/workflows/shellcheck.yml:29), i.e. `cmd; if [ "$?" != "0" ]` is the house style; no comment states why. Zero `local` in any `.sh` (pure POSIX, `_`-prefixed globals) | `$?` checks, `_err` + `return 1` |
| Homebrew install.sh | `set -u` only (brew-install@8ab1549dfa11:install.sh:7), `abort` helper, `trap ... EXIT` for cleanup (:331, :891, :1088) | helper + trap |
| Counter-examples | deno_install `set -e` (install.sh:5), docker-install `set -e` (install.sh:2), k3s `set -e` + `set -o noglob` (install.sh:2-3), dotnet-install `set -e; set -u; set -o pipefail` (src/dotnet-install.sh:7-12), cargo-dist template `set -u` (installer.sh.j2:24) | upstream installers split roughly evenly; none is "strictly no strict mode" by policy |

Run: three masking/exit behaviours across the posix family (`matrix.sh posix m4.sh`; script: `f(){ local x=$(false); echo "local-mask rc=$?"; }`, split declaration, nvm's `${-#*e}` probe, `h || true` with errexit on). Trimmed:

```
dash 0.5.12 / busybox ash 1.35 + 1.37 / mksh R59c / yash 2.52 / posh 0.14.1 / bash 3.2+5.2 --posix / zsh --emulate sh:
    local-mask rc=0          <- local x=$(false) masks the failure in all of them
    split rc=1               <- local x; x=$(false) reports it
    errexit-detect=on        <- the nvm.sh:3877 idiom works everywhere
    after-false-in-fn        <- errexit is suspended inside `h || true`: the "|| true" disarms the whole function
ksh93u+m 2023 and 1.0.10:  local: not found (rc=127 on both lines)   <- why rustup-init.sh:15-19 aliases local=typeset
```

## Bash-version features vs declared floors (axis 3)

```
python3 -I feat.py     # 23 regexes over the 2,049 bash-dialect files (shebang bash or .bash); comment lines skipped
```

False-positive handling: first-pass `declare -A` regex matched prose (`local Aqua` in mise e2e) and zsh `typeset -A compstate`; fixed by requiring a flag (`-[a-zA-Z]*A`). Re-sampled 3 hits per pattern (51 hits read): 6 are strings/emitted text/test-fixture text rather than executed script (rbenv `echo "typeset -g ..."` is emitted for the user shell; oils `test/runtime-errors.sh` embeds snippets as strings), 45 genuine: ~12% false-positive rate, all concentrated in oils and rbenv.

Files containing the feature (introducing version in brackets):

| Feature | non-oils files | oils files | Where (non-oils) |
|---|---|---|---|
| `printf -v` (3.1) | 18 | 4 | bats-core 9, mise 3, dotnet, fzf, git, pyenv, oh-my-posh, ohmyzsh 1 each |
| `BASH_VERSINFO`/`BASH_VERSION` guard | 19 | 10 | bats-core 4, pyenv 2, atuin 2, brew-install 2, ohmyzsh 2, git, mise, nvm, fzf, starship, zoxide, omp 1 each |
| `EPOCHSECONDS/REALTIME` (5.0) | 4 | 1 | atuin (guarded by `${EPOCHREALTIME-}`), bats-core bin (guarded `[[ -n ${EPOCHREALTIME-} ]]`, libexec/bats-core/bats-exec-test:300), omp (guarded `BASH_VERSINFO[0] >= 5`, omp.bash:52), ohmyzsh kube-ps1 (zsh) |
| `declare/local -A` (4.0) | 4 | 7 | direnv stdlib.sh:1404 (unguarded), pyenv-rehash:141 + pyenv-versions:91 (guarded) |
| `${x,,}` `${x^^}` (4.0) | 3 | 3 | git-completion.bash:2919 (guarded) + ohmyzsh copy, pure-bash-bible build.sh:18 |
| `${x@P}`/`@Q` (4.4) | 2 | 0 | omp.bash:137,148 (unguarded), atuin.bash:169 (guarded, comment ">= 4.4" at :165) |
| `[[ -v ]]` (4.2) | 1 | 0 | omp.bash:34,155 (unguarded) |
| `${a[-1]}` (4.2) | 1 | 6 | omp.bash:173 |
| `mapfile` (4.0) | 1 | 2 | mise e2e/tasks/test_task_artifact_cache_inspect:74 |
| `namerefs`, `wait -n`, `coproc`, `;;&`, `globstar`, `lastpipe`, `inherit_errexit`, `&>>`, `\|&`, `BASHPID`, `SRANDOM` | 0 | 1-3 each | oils only (shell-implementation tests) |

Finding: in 1,676 non-oils bash-shebang files, the entire bash>=4 surface is 4 `declare -A` files, 1 `mapfile`, 3 case-mod, 1 `[[ -v`. Projects that care gate with `((${BASH_VERSINFO[0]} > 3))` (pyenv-rehash:139: `declare -A` only inside the guard, else falls back) or `[ "${BASH_VERSINFO[0]:-0}" -ge 4 ]` (git-completion.bash:2917, else `tr A-Z a-z`).

**Violations of a project's own floor** (run under `matrix.sh bash`, fixtures `m1.sh m2.sh m3.sh`):

1. oh-my-posh `omp.bash:34` uses `[[ -v MC_SID ]]` (and `${prompt@P}` :137, `${arr[-1]}` :173) with no version guard (only `EPOCHREALTIME` is guarded, :52) and no stated floor. `bash -n omp.bash`: bash 3.2.57 and 4.0.44 -> `line 34: conditional binary operator expected`, rc=2; bash 4.2-5.3 rc=0. On stock macOS /bin/bash the file does not parse, so sourcing it breaks the prompt init.
2. direnv `stdlib.sh:1404` `local -A values_to_restore=(` inside `use_nix`: stdlib sources fine on 3.2 (parse is not affected) but `use_nix` dies with `local: -A: invalid option` on bash 3.2.57, works 4.0-5.3. No stated floor, so an undocumented 4.0 requirement for one function.
3. git-completion `:2919` `${varname,,}`: ungated variant fails on 3.2 (`bad substitution`), gated version in git-completion.bash:2917-2921 is correct on all eight versions (control run, `m3.sh`).
4. mise `e2e/tasks/test_task_artifact_cache_inspect:74` uses `mapfile` although the repo changelog records removing mapfile from e2e "to run e2e tests on macOS (bash 3.2)" (mise@19e8c8f0d03d:CHANGELOG.md:12938). Only `*macos*`-named e2e tests run on macOS, so this is latent, not red CI.

Syntax-level floor sweep (all 2,062 bash-dialect files, one docker loop per version):

```
docker run --rm -v $EX:/ex:ro -v $D:/d:ro bash:3.2 bash /d/syn_bash.sh /d/list_bash.txt   # loop: bash -n "/ex/$f"
```

| bash | files failing `-n` | Causes |
|---|---|---|
| 3.2.57 | 19 | omp.bash (real); 15 oils files (deliberate parse-error fixtures, `{fd}`, `coproc`, `;;` demos); 3 false positives: brew-install `uninstall.sh:360`, direnv `stdlib.sh:697`, pyenv `python-build:2183` all use extglob `@(..)`/`+(..)`, which `bash -n` needs pre-enabled (`bash -O extglob -n` passes; brew-install CI already uses `-O extglob`, tests.yml:63-64) |
| 4.4 | 9 | oils fixtures + python-build (extglob) |
| 5.2 | 10 | same |

Lesson: `bash -n` is a parse floor, not a feature floor (`declare -A` and `${x,,}` are runtime errors it cannot see), and scripts that `shopt -s extglob` at runtime need `-O extglob` for the check.

## shellcheck (axis 4)

```
python3 -I sc.py     # per file: shellcheck --norc -f json1 [-s bash if no shebang] FILE ; 16 threads ; zsh/fish/nu/pwsh/bats skipped (unsupported)
python3 -I sc_an.py  # histograms
```

Selection: all `sh/bash/ksh/sh-ext` files with size > 0, oils `spec/` cases excluded, stride-sampled to 300 when more (capped: git 1,326 -> 300, mise 1,374 -> 300, nvm 369 -> 300, oils 437 -> 300). No `-x` (so SC1091/SC1090 are inflated: sourced files not followed). `--norc` shows raw findings; inline directives still apply.

| repo | files | findings | per file | files clean % | top3 |
|---|---|---|---|---|---|
| Homebrew__install | 2 | 0 | 0.00 | 100 |  |
| JanDeDobbeleer__oh-my-posh | 2 | 24 | 12.00 | 0 | SC2086:16, SC2059:3, SC2155:2 |
| PowerShell__PowerShell | 13 | 58 | 4.46 | 38 | SC2086:43, SC1091:8, SC2164:2 |
| acmesh-official__acme.sh | 287 | 432 | 1.51 | 61 | SC2181:186, SC2086:93, SC2119:28 |
| ajeetdsouza__zoxide | 2 | 38 | 19.00 | 50 | SC2207:38 |
| atuinsh__atuin | 24 | 0 | 0.00 | 100 |  |
| axodotdev__cargo-dist | 1 | 9 | 9.00 | 0 | SC1078:2, SC1011:2, SC1079:2 |
| bats-core__bats-core | 69 | 36 | 0.52 | 77 | SC1091:27, SC2034:4, SC2086:2 |
| conda__conda | 11 | 87 | 7.91 | 18 | SC2086:82, SC2123:2, SC2155:1 |
| denoland__deno_install | 2 | 0 | 0.00 | 100 |  |
| direnv__direnv | 11 | 6 | 0.55 | 73 | SC2155:2, SC1003:1, SC2059:1 |
| docker__docker-install | 5 | 5 | 1.00 | 80 | SC1091:4, SC2317:1 |
| dotnet__install-scripts | 26 | 497 | 19.12 | 12 | SC2086:236, SC2155:39, SC2034:34 |
| dylanaraps__pure-bash-bible | 2 | 1 | 0.50 | 50 | SC2004:1 |
| elves__elvish | 8 | 33 | 4.12 | 25 | SC2086:24, SC2038:4, SC2162:2 |
| fish-shell__fish-shell | 19 | 2 | 0.11 | 89 | SC1091:2 |
| git__git | 300 | 3584 | 11.95 | 4 | SC2016:1956, SC2086:441, SC2034:423 |
| jdx__mise | 300 | 111 | 0.37 | 90 | SC2164:62, SC2317:26, SC2088:21 |
| junegunn__fzf | 9 | 94 | 10.44 | 22 | SC2086:36, SC2207:14, SC2016:13 |
| k3s-io__k3s | 44 | 458 | 10.41 | 20 | SC2086:320, SC2046:28, SC2329:13 |
| microsoft__vcpkg | 16 | 69 | 4.31 | 12 | SC2086:23, SC2006:8, SC2034:6 |
| nushell__nu_scripts | 2 | 0 | 0.00 | 100 |  |
| nushell__nushell | 4 | 10 | 2.50 | 25 | SC2086:5, SC2046:3, SC2164:1 |
| nvm-sh__nvm | 300 | 864 | 2.88 | 6 | SC1091:378, SC2329:127, SC2016:52 |
| ohmyzsh__ohmyzsh | 18 | 241 | 13.39 | 17 | SC2086:88, SC2004:16, SC2006:15 |
| oils-for-unix__oils | 300 | 5944 | 19.81 | 17 | SC2086:2932, SC2016:445, SC2006:352 |
| pyenv__pyenv | 59 | 268 | 4.54 | 39 | SC2016:122, SC2207:25, SC2006:13 |
| rbenv__rbenv | 31 | 15 | 0.48 | 87 | SC2016:5, SC2154:3, SC2207:2 |
| romkatv__powerlevel10k | 4 | 77 | 19.25 | 0 | SC2034:27, SC1007:14, SC2021:4 |
| rust-lang__rustup | 11 | 3 | 0.27 | 73 | SC1091:3 |
| shellspec__shellspec | 285 | 886 | 3.11 | 51 | SC2329:794, SC1091:30, SC1090:20 |
| starship__starship | 6 | 12 | 2.00 | 17 | SC2016:4, SC1091:3, SC2086:1 |
| zsh-users__zsh-autosuggestions | 1 | 1 | 1.00 | 0 | SC2086:1 |

Total: 2,174 files, 13,865 findings.

Extremes: worst per file oils 19.8, powerlevel10k 19.3 (4 files), dotnet-install 19.1 (26 files), zoxide 19.0 (2 files), git t/ 11.95; cleanest at scale: mise 0.37 per file over 300 files (90% clean), rbenv 0.48, bats-core 0.52, rustup 0.27 (11 files), fish-shell 0.11 (19 files). Zero findings: atuin (24), deno_install, Homebrew, nu_scripts (2).

By group:

| Group | Files | Findings | Per file | Clean files | Top codes |
|---|---|---|---|---|---|
| installers (brew, deno, docker, dotnet, cargo-dist, k3s, vcpkg, rustup) | 107 | 1,041 | 9.73 | 28% | SC2086 579, SC2034 52, SC2155 48, SC1091 42, SC2046 37, SC2181 29, SC2140 22, SC2006 21 |
| emitters (zoxide, direnv, fzf, starship, mise, atuin, conda, oh-my-posh) | 365 | 372 | 1.02 | 84% | SC2086 136, SC2164 63, SC2207 53, SC2317 26, SC2088 23, SC2016 18 |
| bash tools (pyenv, rbenv, nvm, bats, shellspec, pure-bash-bible, acme.sh) | 1,033 | 2,502 | 2.42 | 43% | SC2329 923, SC1091 441, SC2181 197, SC2016 179, SC2086 136 |
| git t/ | 300 | 3,584 | 11.95 | 4% | SC2016 1,956, SC2086 441, SC2034 423, SC1091 329 |
| oils | 300 | 5,944 | 19.81 | 17% | SC2086 2,932, SC2016 445, SC2006 352, SC1091 276 |
| zsh repos (their bash/sh-shebang files only) | 23 | 319 | 13.87 | 13% | SC2086 91, SC2034 32, SC1007 21, SC2004 16, SC2006 15 |
| other (fish, nushell, elvish, PowerShell repos) | 46 | 103 | 2.24 | 59% | SC2086 72, SC1091 10, SC2046 5 |

Corpus top 30 (all 2,174 files): SC2086 4387, SC2016 2608, SC1091 1108, SC2329 1020, SC2034 709, SC2006 422, SC2154 326, SC2046 252, SC2181 232, SC2155 202, SC2206 140, SC2164 133, SC2004 124, SC2268 104, SC2162 100, SC2317 97, SC2207 94, SC2031 85, SC2035 73, SC1083 70, SC2223 69, SC1090 68, SC3043 68, SC2196 55, SC2121 50, SC2145 49, SC2012 46, SC2143 44, SC2068 43, SC1007 43. Excluding git and oils (the two test-suite giants): SC2086 1014, SC2329 938, SC1091 503, SC2181 231, SC2016 207, SC2034 110, SC2155 108, SC2207 85, SC2046 83, SC2164 79.

Parse failures (SC1071/1072/1073/1088/1089) in 19 files: oils 11 (fixtures), ohmyzsh 3, cargo-dist 1 (jinja template), git 1, fzf 1, pyenv 1, powerlevel10k 1.

`#!/bin/sh` bashism check (H1 for the corpus): 22-36 of 1,020 files (2.2%-3.5%) have SC3xxx. Codes: SC3043 `local` 68 (in 17 files: nvm 7, git 7, k3s 1, ohmyzsh 1, oils 1), SC3037 `echo -n -e` 12, SC3010 `[[` 9, SC3062 9, SC3044 7, SC3045 4. Per repo: nvm 20 of 294, git 7 of 278, oils 4 of 17, k3s 2 of 6, vcpkg 1 of 11, ohmyzsh 1 of 5, acme.sh 1 of 287; every other `#!/bin/sh` repo 0.

**Disable census** (`python3 -I dis.py`: any `# shellcheck disable=` on a comment line or trailing; justification = same-line `# text`/`-- text` or a preceding non-shebang comment line of >12 chars; a first run counted the shebang line as a justification and inflated acme.sh to 210 justified, corrected to 14):

| Repo | Directives | Justified | Files | Top codes |
|---|---|---|---|---|
| shellspec | 372 | 11 | 186 | SC2016 119, SC2034 101, SC2288/2286/2287 (DSL words) 232 |
| acme.sh | 260 | 14 | 222 | SC2034 202 (every `dnsapi/*.sh` plugin line 2), SC2086 16, SC2154 13 |
| bats-core | 218 | 32 | 50 | SC2031 61, SC2030 58, SC2034 45, SC2154 20 |
| mise | 129 | 35 | 110 | SC2016 94, SC2103 10, SC1071 10 |
| nvm | 42 | 3 | 7 | SC2016 13, SC2086 5, SC3044 3, SC2230 3 |
| atuin | 38 | 22 | 13 | SC2016 12, SC2154 9, SC1091 4 |
| direnv | 27 | 3 | 5 | SC1090 11, SC1091 7, SC2329 5 |
| fish-shell | 18 | 2 | 6 | 2086 4, 2059 3, 2030 2 |
| rbenv | 16 | 0 | 8 | SC2016 8, SC1090 5 |
| others (13 repos) | 65 | 26 | - | brew 10 (10 justified), dotnet 14, PowerShell 11, cargo-dist 7, rustup 5, starship 5 |
| Total | 1,185 | 148 (12.5%) | | SC2034 360, SC2016 282, SC2288 78, SC2286 77, SC2287 77, SC2154 70, SC2031 65, SC2086 64, SC2030 61, SC1090 32 |

Codes by number of repos disabling them: SC2016 14, SC2086 11, SC1091 9, SC2034 9, SC1090 8, SC2154 6, SC2046 5, SC3043 4, SC2039 4. Sampled 14 directives: 14/14 real; 4 carried a reason (e.g. `# shellcheck disable=SC2178 # PROMPT_COMMAND is not an array in bash <= 5.0`, atuin@56525ac6a7a9:vendor/bash-preexec/bash-preexec.sh:555; `# shellcheck disable=SC2039  # local is non-POSIX`, cargo-dist@d1055f48071e:cargo-dist/templates/installer/installer.sh.j2:3; `# Always use single-quoted strings with \`exp\` expressions`, brew-install@8ab1549dfa11:install.sh:128).

**Central configs** (the strongest "relax this" signal, 2 `.shellcheckrc` + 3 CI/Makefile lists):

| Where | Disabled | Citation |
|---|---|---|
| mise `.shellcheckrc` | SC1008 SC2002 SC2088 SC2129 SC2164 SC2317 | mise@19e8c8f0d03d:.shellcheckrc:1-6 |
| shellspec `.shellcheckrc` | SC2317 | shellspec@f2d13f991885:.shellcheckrc:1 |
| docker-install Makefile | SC1091 SC1117 SC2317 SC2329 | docker-install@2b32480025b2:Makefile:6 |
| acme.sh CI | SC2181 SC2089 | acme.sh@807da6498377:.github/workflows/shellcheck.yml:29 |
| starship CI | `--severity=warning` (drops info/style) | starship@d4d0459c5c24:.github/workflows/install-script.yml:19 |
| rustup CI | `-x -s dash` for `*.sh`, `-x -s bash` for `*.bash` (no exclusions) | rustup@61271d00a979:.github/workflows/ci.yaml:1676-1678 |
| nvm CI | per-file `-s ${{ matrix.shell }}` over a file matrix | nvm@b1b3a0038c06:.github/workflows/shellcheck.yml:47-48 |

Signal: SC2317 (unreachable command) and SC2329 (function never invoked) are the codes well-maintained projects switch off first, because both mis-fire on functions called via traps, sourcing, DSLs or `eval`; the corpus counts agree (SC2329 1,020 findings, 794 in shellspec alone). SC2034 (unused variable) is the top inline-disable (360) because of sourced-interface variables (acme.sh plugin protocol). SC2016 (single-quote with `$`) is the most widely disabled code (14 repos) because it is intentional in test strings and emitted code. Projects that gate in CI: acme.sh, bats-core, deno_install, docker-install, fish-shell (`cargo xtask shellcheck`), Homebrew, nvm, rbenv (differential-shellcheck), rustup, starship: 10 of 39; k3s explicitly sets `shellcheck: false` for actionlint (k3s@82a6ddcd820b:.github/workflows/actionlint.yaml:20).

## Formatting (axis 5)

```
python3 -I fmt.py   # per file: dominant indent (tab / 2sp / 4sp by counting leading-whitespace lines), then shfmt -d -i {0|2|4} [style flags]
```

Same 2,174-file selection. "unparsed" = shfmt syntax error (mostly templates and fixtures).

| repo | files | unparsed | tab | 2sp | 4sp | clean@dominant indent | +ci | +ci,bn,sr | +ci,sr,s | clean@any of 0/2/4 |
|---|---|---|---|---|---|---|---|---|---|---|
| Homebrew__install | 2 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| JanDeDobbeleer__oh-my-posh | 2 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 1 |
| PowerShell__PowerShell | 13 | 0 | 3 | 0 | 10 | 2 | 2 | 2 | 2 | 2 |
| acmesh-official__acme.sh | 287 | 0 | 0 | 275 | 12 | 275 | 234 | 124 | 75 | 287 |
| ajeetdsouza__zoxide | 2 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 1 |
| atuinsh__atuin | 24 | 0 | 2 | 13 | 9 | 15 | 15 | 7 | 7 | 15 |
| axodotdev__cargo-dist | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| bats-core__bats-core | 69 | 0 | 13 | 48 | 8 | 48 | 44 | 35 | 32 | 50 |
| conda__conda | 11 | 0 | 5 | 3 | 3 | 6 | 6 | 8 | 7 | 6 |
| denoland__deno_install | 2 | 0 | 2 | 0 | 0 | 2 | 1 | 1 | 1 | 2 |
| direnv__direnv | 11 | 0 | 4 | 7 | 0 | 3 | 3 | 3 | 3 | 3 |
| docker__docker-install | 5 | 0 | 3 | 0 | 2 | 0 | 2 | 1 | 1 | 0 |
| dotnet__install-scripts | 26 | 0 | 0 | 13 | 13 | 0 | 0 | 0 | 0 | 0 |
| dylanaraps__pure-bash-bible | 2 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| elves__elvish | 8 | 0 | 0 | 3 | 5 | 6 | 6 | 2 | 5 | 6 |
| fish-shell__fish-shell | 19 | 0 | 1 | 0 | 18 | 2 | 2 | 2 | 2 | 2 |
| git__git | 300 | 2 | 294 | 0 | 4 | 123 | 122 | 118 | 118 | 124 |
| jdx__mise | 300 | 0 | 162 | 116 | 22 | 284 | 286 | 36 | 36 | 296 |
| junegunn__fzf | 9 | 1 | 0 | 5 | 3 | 0 | 0 | 2 | 5 | 0 |
| k3s-io__k3s | 44 | 0 | 5 | 17 | 22 | 12 | 12 | 10 | 9 | 12 |
| microsoft__vcpkg | 16 | 1 | 6 | 2 | 7 | 2 | 2 | 4 | 4 | 2 |
| nushell__nu_scripts | 2 | 0 | 0 | 1 | 1 | 0 | 0 | 1 | 1 | 0 |
| nushell__nushell | 4 | 0 | 0 | 0 | 4 | 1 | 1 | 1 | 1 | 1 |
| nvm-sh__nvm | 300 | 0 | 103 | 194 | 3 | 30 | 30 | 38 | 35 | 30 |
| ohmyzsh__ohmyzsh | 18 | 6 | 1 | 7 | 4 | 3 | 3 | 2 | 2 | 4 |
| oils-for-unix__oils | 300 | 11 | 28 | 247 | 14 | 46 | 47 | 43 | 43 | 48 |
| pyenv__pyenv | 59 | 0 | 2 | 48 | 9 | 11 | 10 | 8 | 7 | 11 |
| rbenv__rbenv | 31 | 0 | 4 | 25 | 2 | 20 | 20 | 13 | 12 | 20 |
| romkatv__powerlevel10k | 4 | 0 | 0 | 2 | 2 | 0 | 0 | 0 | 0 | 0 |
| rust-lang__rustup | 11 | 0 | 3 | 4 | 4 | 4 | 5 | 5 | 5 | 4 |
| shellspec__shellspec | 285 | 1 | 52 | 132 | 100 | 78 | 80 | 83 | 79 | 79 |
| starship__starship | 6 | 0 | 5 | 0 | 1 | 5 | 4 | 0 | 0 | 5 |
| zsh-users__zsh-autosuggestions | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| TOTAL | 2174 | 23 | 699 | 1164 | 288 | 980 | 937 | 549 | 492 | 1011 |

Totals: 2,151 parseable; 980 (45.6%) clean with default style at the dominant indent; `-ci` 937 (43.6%); `-ci -bn -sr` 549 (25.5%); `-ci -sr -s` 492 (22.9%); clean under some indent in {tab,2,4}: 1,011 (47.0%). Indentation: 2 spaces 1,164 (54%), tab 699 (32%), 4 spaces 288 (13%).

Adoption evidence:

| Repo | shfmt gate | Config | Clean under shfmt 3.13.1 |
|---|---|---|---|
| acme.sh | `shfmt -l -w -i 2 .` then `git diff --exit-code`, pinned v3.1.2 (.github/workflows/shellcheck.yml:36-38) | CLI flags | 0 dirty of 287 (`shfmt -l -i 2 .`): stable across 3.1.2 -> 3.13.1 |
| bats-core | `./shfmt --diff .`, pinned v3.5.1 (tests.yml:36-43) | `.editorconfig` 2 spaces | 48 dirty under 3.13.1: version drift, e.g. 3.13.1 rewrites `>\| "$f"` to `>\|"$f"` (install.sh:27) and re-indents `if ... \|\|` continuations (bin/bats:11-14) |
| deno_install | `shfmt -d .` (ci.yml:21) | none | 0 dirty |
| starship | `shfmt -d install/**/*.sh` (install-script.yml:30-33) | none | 0 dirty |
| zoxide | `shfmt --diff --indent=4 --language-dialect=posix --simplify *.sh` (justfile:25) and a cargo test pipes every emitted bash/posix payload through shfmt (src/shell.rs:83-96, :224) | flags | 0 dirty |
| direnv | `shfmt -i 2 -w stdlib.sh` (GNUmakefile:83) | flags | 1 dirty (stdlib.sh) |
| fzf | shfmt installed in linux.yml:43 | `.editorconfig` `[*.{sh,bash,fish}]` with `simplify`, `switch_case_indent`, `space_redirects`, `binary_next_line = false` | 2 of 4 checked files dirty under 3.13.1 |
| mise | not in workflows | `.editorconfig` `[{*.sh,.mise/tasks/**/*,e2e/**/*,*.pkl}]` indent 2, `switch_case_indent`, `simplify` | 0 dirty of 1,396 (`shfmt -l e2e scripts`, editorconfig-driven): best formatted bulk corpus |
| Homebrew | shfmt installed in tests.yml:181 | none | n/a |
| git | `.editorconfig` tab_width 8 for `*.sh` | tab | 123 of 298 clean at default tab style |

shfmt reads `.editorconfig` when no style flags are passed, which is how `simplify = true` and `switch_case_indent = true` become `-s` and `-ci` (mise's 0 dirty used that path; `fmt.py` passes explicit flags and so ignores it). 17 of 39 repos ship an `.editorconfig` (atuin's covers only `*.rs`); shell-specific shfmt keys (`simplify`, `switch_case_indent`, `binary_next_line`, `space_redirects`, `function_next_line`) appear in 2 (mise, fzf); `indent_size`/`indent_style` for shell in bats-core, direnv, fish-shell, git, nvm (`tab_width`).

## Testing (axis 6)

```
find <repo> -name '*.bats' | wc -l ; find git__git/t -name 't[0-9]*.sh' ; python3 -I (regex ^\s*test_expect_(success|failure) ; ^#### in oils spec/*.test.sh)
grep -rIl kcov --exclude-dir=.git .  -> bats-core 2 files, shellspec 48 files
```

| Repo | Framework | Volume | Shell matrix in CI | Coverage |
|---|---|---|---|---|
| git | own test-lib (`test_expect_success`, `--chain-lint`) | 1,061 `t[0-9]*.sh`, 19,917 cases, 43 `lib-*.sh` | ubuntu, windows, alpine container | none in CI |
| oils | own spec harness (`spec/*.test.sh`, `####` cases, executed under several shells by `test/spec-runner.sh`) | 223 files, 3,965 cases | ubuntu-22.04 `soil` container only | none |
| bats-core | bats (self-hosted) | 225 `.bats` | bash 3.2-5.x+rc docker matrix, 3 Ubuntus, Windows 2022/2025 | kcov v42 (tests.yml:351-354, `--filter-tags '!no-kcov'`) |
| shellspec | shellspec | 105 `*_spec.sh` | 24 workflows, 10+ shells, 10+ OSes (section 3) | kcov + codecov (coverage.yml, 48 files mention kcov) |
| pyenv / rbenv | bats | 47 / 23 `.bats` | macos-14 + ubuntu / macos + ubuntu | none |
| nvm | urchin (`Makefile:6`) + plain scripts | 415 files under test/ | sh bash dash zsh ksh, gawk/mawk, alpine, xenial, WSL | none |
| mise | own e2e: one file per case, `assert_*` helpers, shebang picks the shell (zsh/fish/bash) | 1,366 files | ubuntu + a macOS subset | none seen |
| acme.sh | CI integration scripts, no unit framework in tree | n/a | 33 workflows incl. 16 BSD/Solaris VMs | none |
| zoxide, starship, atuin, direnv | cargo/go tests that execute emitted payloads | zoxide 20 rstest fns over 9 shells; direnv 4 `shell_*_test.go` + 63 files in test/ | ubuntu/macos/windows | codecov (starship) |
| Pester family | Pester 5 | Pester 101, PowerShell 433, PSScriptAnalyzer 114, Scoop 13, posh-git 14, Install 2 `*.Tests.ps1` | Windows PS 5.1 + pwsh matrix (Pester, posh-git, Scoop, PowerShell) | codecov (Pester, PowerShell) |
| fish-shell | littlecheck `tests/checks/*.fish` | 224 | ubuntu, macos, windows(msys2), alpine | none |
| nushell / nu_scripts | nu tests, `nu-std` | 120 `*.nu` under test dirs in nushell + 32 nu-std + 8 in nu_scripts | ubuntu, macos, windows | none seen |
| elvish | `.elvts` transcripts + Go tests | 39 + 25 | ubuntu | codecov |
| ohmyzsh / p10k / autosuggestions | zunit (`.zunit.yml` in a few plugins, e.g. dotenv, alias-finder), none, Ruby rspec + tmux (`spec/**/*_spec.rb`, 27 files) | small | zsh container (autosuggestions), 3 ohmyzsh zsh jobs | none |

Finding: only bats-core and shellspec measure shell-script coverage (both kcov); no repo gates on a coverage number. Three styles: framework (bats, shellspec, Pester), harness-in-the-language (git, oils, mise, fish), and test-the-emitted-payload (zoxide, direnv, starship, mise snapshots: 36 `.snap` files in `src/shell/snapshots`).

## PowerShell (axis 7)

```
pwsh -NoProfile -c 'Save-Module PSScriptAnalyzer -Path <fixtures>/modules'     # 1.25.0 installed OK
for f in ps_list: Invoke-ScriptAnalyzer -Path $f                                # default rules, 10 pwsh procs  (pssa1.ps1)
[Parser]::ParseFile($p,[ref]$t,[ref]$e)                                         # parse.ps1 on Windows PowerShell 5.1.26100 (host) and pwsh 7.6.6
python3 -I ps.py ; pwsh psd.ps1 (Import-PowerShellDataFile on every .psd1)
```

**Parse floor.** 1,327 ps1/psm1 files copied to `C:\Users\ecom\shell-wintest\exemplar-shape\src` and parsed (no execution):

| repo | ps1/psm1 files | fail parse 5.1.26100 | fail parse 7.6.6 | fail 5.1 only |
|---|---|---|---|---|
| JanDeDobbeleer__oh-my-posh | 6 | 0 | 0 | 0 |
| PowerShell__PSScriptAnalyzer | 228 | 4 | 4 | 0 |
| PowerShell__PowerShell | 508 | 47 | 2 | 46 |
| ScoopInstaller__Install | 6 | 0 | 0 | 0 |
| ScoopInstaller__Scoop | 80 | 0 | 0 | 0 |
| ajeetdsouza__zoxide | 1 | 0 | 0 | 0 |
| atuinsh__atuin | 1 | 0 | 0 | 0 |
| conda__conda | 2 | 0 | 0 | 0 |
| dahlbyk__posh-git | 32 | 0 | 0 | 0 |
| denoland__deno_install | 2 | 0 | 0 | 0 |
| direnv__direnv | 1 | 0 | 0 | 0 |
| dotnet__install-scripts | 36 | 0 | 0 | 0 |
| git__git | 2 | 0 | 0 | 0 |
| jdx__mise | 110 | 0 | 0 | 0 |
| junegunn__fzf | 1 | 0 | 0 | 0 |
| microsoft__vcpkg | 35 | 1 | 0 | 1 |
| nushell__nushell | 2 | 0 | 0 | 0 |
| pester__Pester | 268 | 0 | 0 | 0 |
| rust-lang__rustup | 2 | 0 | 0 | 0 |
| starship__starship | 4 | 0 | 0 | 0 |
| TOTAL | 1327 | 52 | 6 | 47 |

The 46 PowerShell-repo failures are `test/powershell/Language/**` fixtures for 7-only syntax (`TernaryOperator.Tests.ps1`, `PipelineChainOperator.Tests.ps1`: `?:`, `??`, `&&`). The single real production hit is vcpkg's `ports/vulkan-sdk-components/get-vulkan-sdk-components-info.ps1:54-55` (a line starting with `|`, pipeline continuation is 7.0+): "An empty pipe element is not allowed" on 5.1. Everything else, including all installers (deno_install, dotnet install-scripts 36 files, Scoop Install, rustup, starship, zoxide, atuin) and all of Pester (268 files) and Scoop (80), parses under 5.1.

A first-pass regex for 7.0 syntax (`&&`, ternary) was 6/6 false positives (all in the PowerShell repo's own test fixtures); replaced by the parser measurement.

**Idioms** (file counts; PSSA `Tests/` excluded; PowerShell's 508 files are build scripts plus tests):

| repo | ps files (excl. PSSA Tests/) | Set-StrictMode | EAP=Stop | #requires -Version | PSVersionTable | PSEdition | $IsWindows/$IsLinux/$IsMacOS | Invoke-WebRequest | -UseBasicParsing | Write-Host | Invoke-Expression/iex | LASTEXITCODE | Out-File/Set-Content -Encoding | [CmdletBinding()] |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| JanDeDobbeleer__oh-my-posh | 6 |  | 1 |  | 1 |  | 1 | 1 |  | 2 | 2 |  | 2 | 1 |
| PowerShell__PSScriptAnalyzer | 10 | 1 | 1 |  | 5 | 1 | 3 |  |  |  |  | 2 | 4 | 3 |
| PowerShell__PowerShell | 508 | 21 | 13 | 5 | 15 | 10 | 200 | 13 | 1 | 37 | 36 | 21 | 37 | 82 |
| ScoopInstaller__Install | 6 |  | 2 | 3 | 2 |  |  |  |  |  |  | 1 | 2 |  |
| ScoopInstaller__Scoop | 81 |  |  | 5 | 4 | 1 | 2 | 4 | 3 | 38 | 1 | 6 | 8 | 11 |
| ajeetdsouza__zoxide | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| atuinsh__atuin | 1 |  |  |  | 1 |  |  |  |  | 1 |  |  | 1 |  |
| conda__conda | 2 |  |  |  |  |  |  |  |  | 1 | 1 | 1 |  | 1 |
| dahlbyk__posh-git | 32 | 1 |  |  | 9 |  | 8 |  |  | 8 | 4 | 3 | 3 | 3 |
| denoland__deno_install | 2 |  | 2 |  |  |  |  |  |  |  |  | 1 |  |  |
| direnv__direnv | 1 |  |  |  |  |  |  |  |  | 1 | 1 | 1 |  | 1 |
| dotnet__install-scripts | 36 | 19 | 21 |  | 1 |  |  | 7 | 7 | 33 |  | 15 | 1 | 15 |
| git__git | 2 |  | 1 |  |  |  |  | 2 |  | 1 |  |  |  |  |
| jdx__mise | 110 | 3 | 2 |  |  |  |  |  |  | 2 | 5 | 61 | 49 |  |
| junegunn__fzf | 1 |  |  |  | 1 |  |  | 1 |  | 1 |  |  |  |  |
| microsoft__vcpkg | 35 | 3 | 6 | 2 | 1 |  | 2 | 2 | 1 | 13 |  | 4 | 8 | 12 |
| nushell__nushell | 2 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| pester__Pester | 268 | 104 | 13 |  | 22 | 3 | 6 | 1 |  | 16 |  | 5 | 8 | 80 |
| rust-lang__rustup | 2 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| starship__starship | 4 | 1 | 3 |  | 1 |  |  |  |  | 3 | 2 | 1 |  |  |

Totals over 1,110 files: Set-StrictMode in 153 (`Latest` 117 calls, `3.0` 19, `2.0` 17); `$ErrorActionPreference = 'Stop'` in 65, other values in 14 (`Continue` 11, `SilentlyContinue` 7); `Write-Host` in 157; `Invoke-Expression` in 52; Invoke-WebRequest in 31 files but `-UseBasicParsing` in only 12 (dotnet install-scripts 7 of 7, Scoop 3 of 4); `-Encoding` values: `utf8NoBOM` 106 (7+ only), `ascii` 92, `utf8` 67, `Unicode` 14, `utf7` 18. `$PSVersionTable.PSVersion` checks 63 files, `$IsWindows/$IsLinux/$IsMacOS` 222 files (200 in PowerShell).

**PSScriptAnalyzer 1.25.0 default rules** (`pssa1.ps1`; PowerShell capped to 300 of 508 files; 3 tool errors):

| repo | files | clean | findings | Error | Warning | Info | top3 |
|---|---|---|---|---|---|---|---|
| JanDeDobbeleer__oh-my-posh | 6 | 2 | 82 | 0 | 81 | 1 | PSAvoidGlobalVars:33, PSAvoidUsingEmptyCatchBlock:18, PSAvoidUsingWriteHost:12 |
| PowerShell__PSScriptAnalyzer | 228 | 47 | 1075 | 13 | 783 | 260 | PSUseDeclaredVarsMoreThanAssignments:423, PSAvoidTrailingWhitespace:197, PSReviewUnusedParameter:152 |
| PowerShell__PowerShell | 300 | 64 | 1783 | 9 | 1611 | 159 | PSUseDeclaredVarsMoreThanAssignments:831, PSReviewUnusedParameter:199, PSAvoidUsingWriteHost:131 |
| ScoopInstaller__Install | 6 | 4 | 7 | 0 | 7 | 0 | PSUseDeclaredVarsMoreThanAssignments:7 |
| ScoopInstaller__Scoop | 80 | 20 | 489 | 0 | 428 | 61 | PSAvoidUsingWriteHost:239, PSAvoidUsingCmdletAliases:106, PSAvoidUsingPositionalParameters:60 |
| ajeetdsouza__zoxide | 1 | 0 | 1 | 0 | 1 | 0 | PSReviewUnusedParameter:1 |
| atuinsh__atuin | 1 | 0 | 10 | 0 | 8 | 2 | PSAvoidUsingEmptyCatchBlock:3, PSAvoidUsingWriteHost:2, PSProvideCommentHelp:2 |
| conda__conda | 2 | 1 | 0 | 0 | 0 | 0 |  |
| dahlbyk__posh-git | 32 | 12 | 169 | 0 | 169 | 0 | PSAvoidGlobalVars:68, PSAvoidUsingInvokeExpression:28, PSAvoidUsingWriteHost:26 |
| denoland__deno_install | 2 | 0 | 2 | 0 | 1 | 1 | PSAvoidTrailingWhitespace:1, PSUseDeclaredVarsMoreThanAssignments:1 |
| direnv__direnv | 1 | 0 | 19 | 0 | 19 | 0 | PSAvoidUsingWriteHost:14, PSUseShouldProcessForStateChangingFunctions:3, PSAvoidUsingInvokeExpression:1 |
| dotnet__install-scripts | 36 | 11 | 361 | 0 | 255 | 106 | PSAvoidUsingWriteHost:138, PSAvoidTrailingWhitespace:81, PSUseDeclaredVarsMoreThanAssignments:43 |
| git__git | 2 | 1 | 2 | 0 | 2 | 0 | PSAvoidUsingWriteHost:2 |
| jdx__mise | 110 | 80 | 76 | 0 | 65 | 11 | PSUseDeclaredVarsMoreThanAssignments:31, PSAvoidTrailingWhitespace:11, PSAvoidGlobalVars:11 |
| junegunn__fzf | 1 | 0 | 12 | 0 | 12 | 0 | PSAvoidUsingWriteHost:7, PSAvoidUsingCmdletAliases:3, PSUseDeclaredVarsMoreThanAssignments:2 |
| microsoft__vcpkg | 35 | 13 | 88 | 0 | 79 | 9 | PSAvoidUsingWriteHost:53, PSAvoidUsingCmdletAliases:11, PSUseOutputTypeCorrectly:8 |
| nushell__nushell | 2 | 2 | 0 | 0 | 0 | 0 |  |
| pester__Pester | 268 | 99 | 866 | 2 | 763 | 101 | PSUseDeclaredVarsMoreThanAssignments:165, PSUseApprovedVerbs:136, PSReviewUnusedParameter:132 |
| rust-lang__rustup | 2 | 1 | 1 | 0 | 1 | 0 | PSAvoidUsingCmdletAliases:1 |
| starship__starship | 4 | 0 | 8 | 0 | 7 | 1 | PSAvoidUsingWriteHost:4, PSAvoidUsingEmptyCatchBlock:2, PSAvoidTrailingWhitespace:1 |

Total 5,051 findings: Warning 4,292, Information 712, Error 24, ParseError 23. Top rules: PSUseDeclaredVarsMoreThanAssignments 1,580, PSAvoidUsingWriteHost 753, PSReviewUnusedParameter 546, PSAvoidTrailingWhitespace 321, PSAvoidUsingCmdletAliases 211, PSAvoidGlobalVars 204, PSUseApprovedVerbs 174, PSUseShouldProcessForStateChangingFunctions 152, PSAvoidUsingPositionalParameters 150, PSUseOutputTypeCorrectly 145.

**Settings files found** (6, all `.psd1`): posh-git `Severity = Error,Warning`, ExcludeRules PSAvoidUsingWriteHost, PSAvoidGlobalVars, PSAvoidUsingInvokeExpression, PSReviewUnusedParameter (posh-git@bbc5ac380018:PSScriptAnalyzerSettings.psd1); Scoop `Severity = Error` + exclude PSAvoidUsingWriteHost (Scoop@e6aa3b366bde:PSScriptAnalyzerSettings.psd1); Scoop Install Error,Warning + exclude PSUseDeclaredVarsMoreThanAssignments, PSAvoidUsingPositionalParameters; Pester Error,Warning, `IncludeDefaultRules`, a custom rule path, exclude PSUseShouldProcessForStateChangingFunctions, PSUseApprovedVerbs (+ a custom `Measure-SafeCommands` rule; the workflow copy excludes `*Manifest*`); dotnet install-scripts uses an `IncludeRules` allow-list of 9 (PSAvoidUsingCmdletAliases, PSAvoidUsingWMICmdlet, PSAvoidUsingPositionalParameters, PSAvoidUsingInvokeExpression, PSUseDeclaredVarsMoreThanAssignments, PSUseCmdletCorrectly and 3 DSC rules). Rules relaxed: PSAvoidUsingWriteHost 2 repos (it is also the count leader for installers: dotnet 138, Scoop 239, vcpkg 53), PSUseApprovedVerbs, PSUseShouldProcessForStateChangingFunctions, PSAvoidGlobalVars, PSUseDeclaredVarsMoreThanAssignments. PSScriptAnalyzer's own shipped presets: `Engine/Settings/{PSGallery,ScriptSecurity,CmdletDesign,CodeFormatting*,ScriptingStyle,DSC}.psd1`.

**Module manifests** (`psd.ps1`, 60 manifests among 101 `.psd1` (24 non-manifest data files, 16 not loadable as data), most are PSScriptAnalyzer fixtures; 18 production): `PowerShellVersion`: 5.1 for Pester (src/Pester.psd1, ModuleVersion 6.2.0), vcpkg posh-vcpkg, PSScriptAnalyzer; 5.0 for posh-git (src/posh-git.psd1) and PowerShell packaging; 3.0 for helper modules. `CompatiblePSEditions` is `Core` in 12 manifests: PowerShell's 11 in-box modules (PowerShellVersion 3.0, ModuleVersion 7.0.0.0) and one PowerShell test tool (7.3.0); none of the third-party manifests declares editions. `FunctionsToExport` is explicit in every third-party manifest (Pester 66 names, posh-git 23).

**Pester**: v5 syntax everywhere. `Should -Be` style 1,365 lines (Pester), 14,433 (PowerShell), 482 (Scoop), 575 (posh-git), 1,756 (PSScriptAnalyzer) versus legacy `Should Be` 1/5/0/0/2 lines; v5 constructs (`BeforeAll`, `-ForEach`, `-TestCases`, `New-PesterConfiguration`, `Should -Invoke`) 335/855/55/64/215 lines. posh-git pins `Install-Module Pester -MinimumVersion 5.0.0 -MaximumVersion 5.99.99` (.github/workflows/pwsh.yml:30), Scoop pins 5.2-5.99 (test/bin/init.ps1:4-8): the consumers pin the 5.x major while Pester's own tree is at 6.2.0 (src/Pester.psd1), so a loose `Install-Module Pester` would cross a major version.

## fish / nu / elvish and version churn (axis 8)

**fish idioms** (fish-shell `share/`, 1,387 `.fish` files; `grep -rhoE -e PATTERN`): `complete -c` 28,637 lines in 914 files (completions are 1,095 files = 79% of share); `set -l/-g/-U/-x` 2,524 in 497 files; `string` builtin 1,629 in 411 files; `contains` 1,433 in 128; `set -q` 607 in 156; `function ... --description/-d` 353 in 219; `argparse` 99 in 62; `command -q/-sq/type -q` 144 in 86; `math` 89 in 35; `path ...` builtin (3.5+) 85 in 54; `status is-interactive` 9 in 5; event handlers `--on-event` 9, `--on-variable` 12, `--on-signal` 3, `--on-job-exit` 1, `--on-process-exit` 0; `fish_add_path` 12; `abbr --add` 0 in share. fisher (jorgebucaran@791da644d33d) is one 5-file plugin: `functions/fisher.fish` + completions; plugins use `conf.d/` + `functions/` + `completions/`.

**nu idioms** (nu_scripts, 1,545 `.nu`; 781 custom-completions, 461 themes, 134 modules): `export def` 2,004 in 624 files; `export extern` 1,604 in 75; `export-env` 480 files; `export def --env` 498; `use` 510 files; `$in` 4,873 occurrences in 565 files; `export alias` 371; `const` 216; `@example/@category` attributes 27 in 8; hooks (`$env.config.hooks`, `env_change`) 32 in 15 files; `let-env` 0 (removed); the deprecated `str upcase|downcase|capitalize` still in 5 files.

**elvish** (65 `.elv`, 61 in elvish): 342 `fn`, 130 `edit:` references, `use` 17, `after-chdir` in elvish and mise. `elvish -compileonly` over 65 files: 38 pass, 27 fail, but every failure checked (8 read) is a false positive for scripts that touch the interactive `edit:` namespace (`$edit:after-readline not found`, `edit:completion:arg-completer`), which does not exist non-interactively; the emitter payloads oh-my-posh `omp.elv`, zoxide `zoxide.elv`, starship `starship.elv` therefore cannot be validated by compile-only (zoxide filters out `edit:` lines before running, src/shell.rs:98-112).

**Version churn (H9)**, parse-only, each detector first verified on a planted error:

```
nu:    nu --no-config-file -c "nu-check [--as-module] --debug '<file>'"   cwd = file dir ; module mode if file has export def/use/const/env
       planted: bad.nu -> false, ok.nu -> true on both 0.105.1 and 0.116.0
fish:  fish -n FILE   (planted bad.fish -> "Missing end" on 3.6.0 4.0.2 4.7.0 4.9.3; ok.fish passes)
```

| Corpus | n | ok on older | ok on newer | both | old-only (regression) | new-only (forward-incompatible) | neither |
|---|---|---|---|---|---|---|---|
| nu_scripts, all `.nu` (nu 0.105.1 vs 0.116.0) | 1,545 | 1,469 | 1,482 | 1,441 | 28 (1.8%) | 41 (2.7%) | 35 (2.3%) |
| nu_scripts, 30-file stride sample | 30 | 29 | 28 | 28 | 1 | 0 | 1 |
| nushell repo `*.nu` | 192 | 147 | 179 | 147 | 0 | 32 | 13 |

nu_scripts regressions on 0.116 (28): `extra_positional` 5 (`make_release/bump-version.nu`), `parse_mismatch` 4 (`modules/maths/math_functions.nu`), `output_type_mismatch` 3 (`stdlib-candidate-archive/std-rfc/aggregate/mod.nu`), `type_mismatch` 2 (`sourced/fun/spark.nu`), `name_is_keyword` (auto-generated `custom-completions/auto-generate/completions/{alias,break,continue,for}.nu`: a completion file named after a parser keyword no longer parses). 41 new-only: 30 are `custom-completions/op/op-completions.nu`-style and 11 `benchmarks/gradient_benchmark.nu`-style syntax that 0.105.1 rejects. "Neither" is mostly environment (module_not_found 18, sourced file not found 3: `NU_LIB_DIRS` not set), not churn.

| fish files (1,657: fish-shell 1,627, 30 elsewhere) | fail `fish -n` |
|---|---|
| 3.6.0 (Debian 12) | 15 |
| 4.0.2 (Debian 13) | 14 |
| 4.7.0 | 5 |
| 4.9.3 | 5 |

The 5 failures on 4.9.3 are fish-shell HEAD files that use `$(...)` in command position (share/functions/help.fish:231, `__fish_apropos.fish:38`, `fish_git_prompt.fish:183`, `fish_update_completions.fish:29`, tests/checks/cmdsub.fish:82): HEAD is ahead of 4.9.3. The 10 extra failures on 3.6.0 are `share/functions/{isatty,psub,setenv,umask,__fish_cygwin_noacl}.fish` (command substitution in a position 3.6 rejects, e.g. `printf (_ "...")` at isatty.fish:14) and `tests/checks/{cd,redirect,time,fish_key_reader,indent}.fish` (`time a=b true`; `fish_key_reader`/`fish_indent` unknown as builtins).

Reading: at parse level nu changed for 4.5% of its own script corpus across 11 releases (about one year; 69/1,545) against 0.6% for fish across 3 years (10/1,657). H9 holds directionally (nu is about 7x churnier per file in this probe), but absolute breakage at parse level is small; runtime/command-removal churn (e.g. the 0.114 `str upcase` deprecation, 5 files still use it) is not measured by `nu-check` and `fish -n` (Gaps).

## Emitter payload shape (the "emitters" group)

Counted from file trees (`ls`), not from behaviour:

| Tool | Shells with a payload | Mechanism | Tests the payload |
|---|---|---|---|
| zoxide | bash, elvish, fish, nushell, posix, powershell, tcsh, xonsh, zsh (9) | askama templates `templates/*.txt` | 20 cargo test fns (each parameterised over cmd/hook/echo/symlink options): bash/dash/shellcheck/shfmt, `elvish -c` (edit: lines filtered), fish + `fish_indent`, nu, pwsh, tcsh, xonsh (black/mypy/pylint) , zsh (src/shell.rs:57-340) |
| starship | bash, elvish, fish, ion, lua(cmd), nu, ps1, tcsh, xonsh, zsh (10) | `src/init/starship.*` + `mod.rs` | bash bootstrap workaround documented in comment (src/init/mod.rs:128-152: bash 3.2, 4.0 vs 4.1 differences) |
| oh-my-posh | bash, elvish, fish, lua, nu, ps1, xonsh, yash, zsh (9) | `src/shell/scripts/omp.*` with `::OMP::` placeholders | no Go test referencing the scripts found (`grep -rl omp.bash src --include=*_test.go` empty); omp.bash fails bash 3.2 parse (section 5) |
| atuin | bash(+`atuin.bash.d/`), fish, nu, ps1, xonsh, zsh (6) | static scripts + vendored bash-preexec | include-guard declares bash >= 3.1 |
| fzf | bash, fish, nu, zsh (4 x key-bindings/completion) | static scripts, `shell/update.sh` | linux.yml installs zsh fish tmux shfmt nushell |
| mise | bash, elvish, fish, nushell, pwsh, xonsh, zsh (7) | Rust `src/shell/*.rs` generating text | 36 insta snapshots in `src/shell/snapshots` + e2e per shell (shebang dispatch) |
| direnv | bash, elvish, fish, gha, gzenv, json, murex, pwsh, systemd, tcsh, vim, zsh (12 targets) | Go `internal/cmd/shell_*.go` | `shell_{test,hook_test,pwsh_test,systemd_test,zsh_test}.go` |
| conda | posix `conda.sh`, csh, fish `conf.d/conda.fish`, xonsh, ps1 hook, several `.bat` | hand-written scripts under `conda/shell/` plus `conda/activate.py` (not read) | slow-tests jobs with fish/zsh/pwsh (workflow lines mention each) |

Finding: only zoxide, in the files read, renders each payload and feeds it to the real interpreter and linters; mise snapshots the text; direnv has Go unit tests (not read in detail). None of the test files read exercises escaping of interpolated data (single quote, `$`, newline); that is a gap for the shell-integration skill, not measured here.

## Smells (ranked)

Ranked by corpus prevalence x agent-failure likelihood (H6), with evidence:

1. Unquoted expansion (SC2086): 4,387 findings, 32% of all; the worst installers (dotnet-install 236, k3s 320).
2. Declare-and-assign masking (SC2155): 202 findings, 527 `local|declare|export x=$(...)` lines in 88 bash and 43 sh files; run proves `local x=$(false)` reports rc=0 in all 11 posix-family shells.
3. `|| true` and `||`-lists inside functions under errexit: 950 `|| true` lines; run shows errexit is suspended for the whole function body inside `h || true`.
4. `$?` checks instead of `if cmd` (SC2181): 232, 186 in acme.sh where it is house style (CI excludes it).
5. Unguarded bash >=4.x syntax in scripts that run on macOS /bin/bash: omp.bash `[[ -v` (4.2) fails to parse on 3.2 and 4.0; direnv `local -A` fails at call time; 2 of ~1,676 non-oils bash files, both in emitters that run in the user's login shell.
6. `read` without `-r` (SC2162) 100; `cd` without `|| exit` (SC2164) 133 (mise disables it); word-splitting arrays (SC2206/2207) 234.
7. Backticks (SC2006) 422, 352 of them oils testdata; rare in product code.
8. `function f()` keyword+parens (bash only, 14 files), `echo -e` (4 in `#!/bin/sh`, 17 in bash), `which` (5/16), `[[` in a `#!/bin/sh` file (4 of 796 outside git/oils), `sed -i` in `#!/bin/sh` (7 files, 2 of them already use the BSD `''` form): the H6 list is rare in this upstream corpus; the agent failure mode is not what maintained projects do.
9. Non-ASCII bytes in `#!/bin/sh` scripts: 86 files fail `yash -n` in a C or en_US.UTF-8 locale (pass under C.UTF-8), 94 vs 11 total fails (mostly acme.sh comments with box-drawing characters, e.g. deploy/byteplus_alb.sh:12-13).
10. Pinned formatter drift: bats-core pins shfmt 3.5.1, current 3.13.1 reformats 48 files; acme.sh pins 3.1.2 and stays clean: pin the version, and pick a style that survives upgrades.

## Patterns worth encoding

1. **Gate bash features by version, do not avoid them silently**: `((${BASH_VERSINFO[0]} > 3))` around `declare -A` (pyenv-rehash:139-141) with a real fallback, `${BASH_VERSINFO[0]:-0} -ge 4` (git-completion.bash:2917), `((BASH_VERSINFO[0] >= 5))` for `EPOCHREALTIME` (omp.bash:52). 29 of 2,049 bash files carry such guards.
2. **Version gate that parses everywhere** (bats-core bin/bats:8-15): a POSIX-parsable preamble (`[ -z "${BASH_VERSION-}" ] || [[ -z ... ]] || ((BASH_VERSINFO[0] < 3 || ...))`) that prints `needs to be run by Bash >= 3.2` and exits; the comment at bin/bats:8-9 explains `[[`/`(( ))` do not cause syntax errors in POSIX shells.
3. **Sourced libraries preserve the caller's shell options** (nvm.sh:3877-3905: probe `${-#*e}`, `set +e`, restore). Never `set -e` in anything that is sourced.
4. **Explicit-error wrapper instead of errexit for bootstrap scripts** (rustup-init.sh `ensure`/`need_cmd`/`ignore`, :628-662; Homebrew `abort`; acme.sh `_err` + `return 1`).
5. **`local` detection and alias** (rustup-init.sh:12-19): probe with `(PATH='' local _has_local)`, `alias local=typeset` for ksh93; verified here: ksh93u+m 2023 and 1.0.10 both report `local: not found`.
6. **Test the floor, not just the head**: docker `bash:3.2..5.x` matrix (bats-core), `sh/bash/dash/zsh` x `gawk/mawk` (nvm), shell list per OS incl. BSDs (shellspec, acme.sh via `vmactions`), plus `/bin/bash -n` of the file on macOS when a full run is too costly (Homebrew).
7. **Tests choose their shell by shebang** (mise e2e/run_test:170-178: zsh -f, fish --no-config, bash --noprofile --norc -euo pipefail), with strictness injected by the harness.
8. **Test emitted shell code with the real interpreter plus lint** (zoxide src/shell.rs: bash, dash, shellcheck, shfmt, fish + fish_indent, elvish minus `edit:` lines, nu, pwsh, tcsh, xonsh, zsh): one test per (shell, check).
9. **Central lint config, small and justified**: mise `.shellcheckrc` six codes, shellspec one (SC2317); disable inline with a reason (atuin bash-preexec SC2178 comment). Start from SC2317/SC2329/SC1091/SC2016 as the relaxable set; keep SC2086, SC2155, SC2164, SC2162 on.
10. **`bash -n` needs `-O extglob`** when the script enables extglob at runtime (Homebrew tests.yml:63-64).
11. **PowerShell: pin Pester to the 5.x major and keep 5.1 parse-clean**; use the parser (`[Parser]::ParseFile` on 5.1) as the floor check (this audit: 590 of 591 third-party ps1 files outside the PowerShell and PSScriptAnalyzer repos pass 5.1).
12. **PSScriptAnalyzer settings**: `Severity = Error,Warning` with explicit `ExcludeRules` (posh-git, Scoop Install, Pester) beats an `IncludeRules` allow-list; the commonly excluded rules are PSAvoidUsingWriteHost, PSUseApprovedVerbs, PSUseShouldProcessForStateChangingFunctions, PSAvoidGlobalVars.
13. **Pin the formatter**: acme.sh and bats-core both pin shfmt by URL; drift measured above.

## Contradictions of the frame

| Frame claim | Measurement |
|---|---|
| H1 `#!/bin/sh` scripts contain bashisms that `shellcheck -s sh` finds in a large share | Not in the exemplars: 36 of 1,020 `#!/bin/sh` files (3.5%) have any SC3xxx, 22 (2.2%) without `local`; upstream sh files are clean. The frame's H1 is a fleet claim; this audit does not test the fleet. |
| H2 `set -euo pipefail` is "present in most bash scripts" | Not in the exemplars: errexit 28% of bash files (68% of bash product code, 18% of bash tests), pipefail 12%, all three 11%. Long-lived POSIX projects (git, acme.sh, nvm.sh, rustup-init.sh) avoid it deliberately or by design (section 4). Cargo-cult is plausible for agent output, not for upstream. |
| H4 "upstream installers (rustup, deno, cargo-dist) are strictly POSIX" | "POSIX plus `local`": rustup-init.sh (`shellcheck shell=dash`, SC2039 disabled, `local=typeset` alias), cargo-dist installer (SC2039 disabled for `local`), k3s and docker-install use `local`; Homebrew install and dotnet-install are bash (22 bash files in dotnet). Only acme.sh and deno_install avoid `local` entirely. Of 1,733 `#!/bin/sh` files only 8 fail `dash -n`: 7 in git (git-gui/gitk Tcl-wrapper scripts and t9902-completion.sh), 1 cargo-dist jinja template. |
| H6 failure list (bashisms in sh, `echo -e`, `which`, `function f()`, `[[` in sh) | These are rare in maintained code: `[[` in 4 of 796 `#!/bin/sh` files outside git/oils, `echo -e` in 4, `which` in 5, `function f()` in 0. They remain valid agent-failure modes but the corpus offers few positive examples to anchor on; the corpus's real recurring risks are SC2086 and SC2155. |
| H8 "Windows still ships only 5.1, so installers must target 5.1" | Confirmed for the 591 third-party ps1 files outside the PowerShell and PSScriptAnalyzer repos: all but vcpkg's one file parse on 5.1.26100 (PSScriptAnalyzer's 4 failures are deliberately broken fixtures); but `-UseBasicParsing` appears in 12 of 31 Invoke-WebRequest files, so parse-clean is not run-clean. |
| H9 nu emitters/code break across 0.10x more than any other shell | Directionally yes (4.5% of nu_scripts differ between 0.105.1 and 0.116.0 vs 0.6% of fish files across 3.6 -> 4.9), but small in absolute terms and the nu_scripts maintainers keep HEAD near-current: 95.9% parse on 0.116.0 and 95.1% on 0.105.1. |
| Frame: "41 upstream repos" | 39 repos plus the two document clones (runner-images, shellcheck.wiki) = 41 directories. |
| Implicit: bash `printf -v`, `${x@Q}` etc. are common modern features | In 1,676 non-oils bash files: `printf -v` 18 (3.1, safe), `${x@Q\|P}` 2, `declare -A` 4, `mapfile` 1. bash >= 4 is almost absent outside shell-implementation tests (oils) and pure-bash-bible. |

## Gaps

- Fleet not measured here; every H1/H2 verdict above is about the upstream exemplars, not `/home/mherwig/dev`.
- shellcheck ran per file without `-x`, so SC1091/SC1090 and SC2329/SC2034 are inflated for sourced libraries; no zsh/fish/nu/pwsh/bats file was checked (unsupported); git, mise, nvm, oils are 300-file stride samples.
- Feature greps are line regexes (comments skipped, strings not parsed): ~12% false-positive population rate; no AST-level census (a `python3 -I` bash parser was not built).
- `bash -n`, `dash -n`, `fish -n`, `nu-check`, `elvish -compileonly`, `ParseFile` measure syntax only; runtime-only breakage (`declare -A` on 3.2, `local` on ksh93, `str upcase` deprecations, removed fish builtins) is not counted except where run by hand.
- No macOS host: `/bin/sh`-is-bash-3.2-posix and BSD userland claims (`sed -i ''`, `stat -f`, `date -v` in 2 / 12 / 0 files) are counts of source patterns only, unverified on macOS.
- `ci.py`'s tool-mention columns are crude (`posh` matched oh-my-posh); only the curated floor/CI table is trusted; workflows were read statically, never run.
- PowerShell: PSScriptAnalyzer ran default rules, not each repo's own settings; no run of any ps1 (only parse); Pester 6 vs 5 behaviour not tested.
- nu `module_not_found` failures (35 "neither") reflect missing `NU_LIB_DIRS`, not churn; fish-shell HEAD is newer than 4.9.3, so "5 failing on 4.9.3" are from the repo being ahead.
- oils `spec/` cases (223 files, 3,965 cases) were treated as fixtures, not scripts; vendored `Python-2.7.13/` shell inside oils inflates its counts.
- Emitter escaping edge cases (H3) were out of scope for this worker; only payload shape and test presence were counted.
