---
title: Installer and bootstrap scripts audit (curl|sh and irm|iex), fleet vs exemplar corpus
agent: research subagent, axis "installers" (workflow wf_938b7059-603)
model: claude-sonnet-5-5
scope: >-
  Fleet = /home/mherwig/dev (60 top-level dirs after exclusions, 59 distinct git remotes; grimoire-duo is a
  second checkout of the grimoire remote and is deduped). Exemplars = 11 shell installers and 5 PowerShell
  installers under /home/mherwig/.cache/research-lang/exemplars/shell/. Syntax, static analysis and offline
  or stubbed runs only; no installer was run against the network. macOS claims are read-only and marked.
method: |
  FX=/home/mherwig/.cache/research-lang/shell-tools/fixtures/installers  (fixtures are byte-identical copies, cmp-checked,
  so fixture line numbers equal source line numbers; exception noted under "Source key" for the cargo-dist snapshot)
  1 inventory     bash -c 'python3 $FX/tools/inv.py'   (os.walk, excludes per brief, name regex
                  ^(install|get|bootstrap|setup)[-_.a-zA-Z0-9]*\.(sh|ps1)$) ; bash -c 'python3 $FX/tools/scan.py' (content scan)
                  bash -c 'python3 $FX/tools/oneliner2.py'  (curl|sh and irm|iex one-liner census)
  2 features      cd $FX/src && python3 ../feat.py *.sh ; python3 ../gnu.py *.sh ; python3 $FX/tools/g.py <file> <regex> [n]
  3 parse (POSIX) bash $FX/parse.sh $FX/src/*.sh   (11 shells, `<shell> -n`; contract = non-zero exit, codes differ per shell)
                  bash $FX/parse.sh $FX/plant/*.sh (5 planted errors + 1 good file, verifies the invocation per shell)
                  bash $FX/bashparse.sh            (bash 3.2 4.0 4.2 4.4 5.0 5.1 5.2 5.3, `bash -n`)
                  bash $FX/other/pcheck.sh         (fish -n x4 versions, nu-check x2, elvish -compileonly, with planted files)
  4 shellcheck    shellcheck 0.11.0 (ocx.sh/shellcheck/shellcheck:0.11.0): -s sh and -s bash -f json per file -> $FX/sc/*.json
  5 PowerShell    bash matrix.sh pwsh $FX/parse_ps.ps1 ; bash matrix.sh pwsh $FX/scan_ps.ps1 ; probes p7 p8 p9 probes/p4
                  (matrix.sh pwsh = pwsh 7.4.7 docker, pwsh 7.6.6 ocx toolchain, Windows PowerShell 5.1.26100.9444 on the WSL host)
  6 runtime       bash $FX/hatch.sh ; bash $FX/helprun.sh <file> --help ; bash matrix.sh posix $FX/probes/p{2,3,3b,5,6}.sh [args]
  7 detection     bash $FX/detect/run.sh   (uname/ldd/sysctl stubs, 13 scenarios x 6 installers x {alpine ash 1.37, debian dash, bash:3.2})
  8 busybox wget  docker run --rm --network none -e HOME=/tmp/h -v $C:$C alpine:3.22 sh $FX/src/fleet-www-setup.sh
  raw outputs    $FX/out/*.txt (feat, parse_ps, scan_ps, probes_posix, probes_ps, detect, hatch, helprun, bashparse, other_parse, plant_parse.tsv)
  tool versions   dash 0.5.12, busybox ash 1.35 (deb12) and 1.37 (alpine 3.22), mksh R59c, ksh93u+m 2023 (deb12) and 1.0.10 (deb13),
                  yash 2.52, posh 0.14.1, bash 3.2 and 5.2 --posix, zsh 5.9 --emulate sh, shellcheck 0.11.0, fish 3.6.0/4.0.2/4.7.0/4.9.3,
                  nu 0.105.1/0.116.0, elvish 0.21.0, pwsh 5.1.26100.9444 / 7.4.7 / 7.6.6
date_researched: 2026-10-10
---

# Installer and bootstrap scripts audit

Conclusion first. The fleet's flagship installer (`www-setup/src/install.sh`) is the cleanest POSIX installer in the
corpus on the checks that machines can run (0 shellcheck findings, 10/12 shells run it end to end offline), but it
has three reproducible defects: a BusyBox-wget crash on stock Alpine, `exit` inside `irm | iex`, and non-ASCII bytes
that break yash in the C locale. The Grimoire path is the weaker one: its PowerShell front door claims SHA-256
verification that the pinned cargo-dist 0.33.0 PowerShell template does not contain. Hypotheses H1, H2 and H4 do not
survive the counts. All dates and version-specific claims are 2026-10-10.

## Table of contents
1. Headline numbers
2. Source key and conventions
3. Axis 1: locating the installers (funnel, per-repo, false-positive rates)
4. Axis 2: comparison table (2a dialect, 2b platform detection, 2c download and integrity, 2d lifecycle, 2e PowerShell)
5. Axis 3: RUN parse matrix (3a POSIX, 3b verification of the invocations, 3c shellcheck, 3d bash family, 3e fish/nu/elvish, 3f PowerShell)
6. Axis 4: platform detection in isolation
7. Axis 5: ranked defensive patterns and fleet gaps
8. Smells (ranked)
9. Patterns worth encoding
10. Contradictions of the frame
11. Gaps

## Headline numbers

| # | Number | Where |
|---|---|---|
| 1 | 60 fleet dirs, 59 remotes; 127 filename hits and 14 content hits resolve to **10 authored installers** (4 sh, 3 ps1, 3 fish/nu/elv) in 4 repos, plus 1 inline template and 2 vendored copies | Axis 1 |
| 2 | Name heuristic: 127 hits, 111 false positives (87%), recall 7/10 (misses fish, nu, elvish). Content heuristic: 5/14 false positives, recall 5/10 | Axis 1 |
| 3 | Declared-POSIX files: 11 x 11 shells = 121 parse cells, **119 pass**; both failures are yash 2.52 in the C locale on non-ASCII bytes | 3a |
| 4 | Non-ASCII bytes: **3 of 6 fleet sh files, 0 of 11 exemplar sh files**, 0 of 5 exemplar ps1; the 3 fleet files fail yash C-locale 3/3 | 3a |
| 5 | The parse invocation is verified: 5 planted syntax errors x 11 shells = 55/55 rejected, good file 11/11 accepted | 3b |
| 6 | shellcheck 0.11.0 `-s sh` on the 11 declared-POSIX files: 568 findings, **4 files clean** (2 fleet: frontdoor, www-setup); 181 are SC3xxx, of which 178 (98%) are SC3043 `local` in cargo-dist (136) and rustup (42), polyfilled on purpose | 3c |
| 7 | Fleet `#!/bin/sh` installers with SC3xxx findings: **0 of 2** (H1 contradicted) | 3c |
| 8 | PowerShell: 8 files x 3 engines = 24/24 parse; 7-only parameters in 1 file (4 hits, setup-grimoire.ps1:52-53, pwsh-only by design); `exit` in `irm \| iex` kills the host on **3/3** engines | 3f |
| 9 | Detection stubs: 13 scenarios x 6 installers x 3 shells = 234 runs, **0 divergences between shells**; silently wrong targets: deno 7/13, oras-www 5/13, www-setup 0/13 (5 explicit exit 7) | Axis 4 |
| 10 | Integrity classes over 17 sh files: pinned in script 2, manifest from another origin 1, same-origin sidecar 3, GPG 1, delegated 1, **none 9** | 2c |
| 11 | Truncation guard 10/17; trap cleanup 8/17 (neither rustup nor cargo-dist traps); exit-code taxonomy 1/17; script-level rc-file editing 3/11 exemplars, 0/4 fleet | 2a, 2d |
| 12 | Reproduced defects: cargo-dist Rosetta precedence bug, BusyBox wget crash (www-setup, rc=3), k3s `{1..3}` runs once in 7/11 shells, docker `--setup-repo` swallows the next flag in 11/11, posh `"$@"` under `set -u`, yash C-locale | Axis 4, Smells |

## Source key and conventions

Fleet cites are `repo-relative-path:line` under `/home/mherwig/dev`. Exemplar cites use a key, `KEY:line`, expanded here
to `<repo>@<sha12>:<path>`; the line is the line in that path unless noted. Fleet HEADs: www-setup@a251c3631047,
grimoire@4650ad830375, setup-grimoire@1259e35b2550, oras-www@3f9c279bdd83, ocx@5de9d777eb7d, grimoire-indexer@19fe2dcb5dc1,
uv@72e1fc88f354. `rust-devcontainer-cli` is not a git repo.

| Key | Expansion |
|---|---|
| RUSTUP | rust-lang/rustup@61271d00a979:rustup-init.sh |
| DENO / DENO-PS | denoland/deno_install@41d4676f8677:install.sh / install.ps1 |
| BREW | Homebrew/install@8ab1549dfa11:install.sh |
| DOCKER / DOCKER-RL | docker/docker-install@2b32480025b2:install.sh / rootless-install.sh |
| K3S | k3s-io/k3s@82a6ddcd820b:install.sh |
| CDIST | axodotdev/cargo-dist@d1055f48071e:cargo-dist/tests/snapshots/axolotlsay_basic.snap, the rendered sh installer of cargo-dist 0.33.0; **snapshot line = fixture line + 5**, all CDIST lines below are converted |
| CDIST-T / CDIST-PS | same repo, cargo-dist/templates/installer/installer.sh.j2 / installer.ps1.j2; CDIST-PS lines are snapshot lines (fixture line + 1914) |
| DOTNET / DOTNET-PS | dotnet/install-scripts@e5cf1dd2d154:src/dotnet-install.sh / .ps1 |
| SCOOP | ScoopInstaller/Install@1e2f334083d6:install.ps1 |
| NVM | nvm-sh/nvm@b1b3a0038c06:install.sh |
| ACME | acmesh-official/acme.sh@807da6498377:acme.sh (the client, whose `--install-online` is the installer) |
| VCPKG / VCPKG-PS | microsoft/vcpkg@e456309491fd:scripts/bootstrap.sh / bootstrap.ps1 |
| MOLD | uv/scripts/install-mold.sh (astral-sh/uv@72e1fc88f354, vendored into the fleet) |
| DCLI | rust-devcontainer-cli/reference-cli/scripts/install.sh (vendored, no git) |
| WS / FD / SG / ORAS | www-setup/src/install.* / grimoire/docs/public/install.* / setup-grimoire/.github/scripts/install.* / oras-www/tools/install.sh |

## Axis 1: locating the installers

`bash -c 'python3 $FX/tools/inv.py'` (name regex over the fleet minus excluded dirs) gave 127 files; `scan.py` (content: download
verb plus extract/PATH verb in .sh/.ps1/shebang files) gave 14. Dedupe: `grimoire` and `grimoire-duo` share the remote
`grimoire-rs/grimoire` (HEADs 4650ad83 vs c045c195); the 8 copies of `install.{sh,ps1}` under `docs/public` and `docs/dist` in both
checkouts are byte-identical (md5 da727d923e for sh, aec134d593 for ps1) and `docs/dist/` is gitignored (grimoire/.gitignore:102).

| Repo | Name hits | Authored installers | Notes |
|---|---|---|---|
| rust-devcontainer-cli | 82 | 1 vendored (reference-cli/scripts/install.sh, 672 lines) | 80 of 82 are `src/test` fixtures; not a git repo |
| ocx | 19 | **0** | doc cast scripts (`getting-started__install.sh`), manual-test scripts; `installers = []` at ocx/dist-workspace.toml:11 |
| www-setup | 5 | 5 (sh 913, ps1 951, fish 650, nu 547, elv 566 lines) + 1 CI helper (tests/ci/install-ocx.sh, 107) | fish/nu/elv are not matched by the name regex |
| grimoire | 5 | 2 (docs/public/install.sh 35 lines, install.ps1 12 lines) | `docs/dist/` copies are gitignored duplicates; `test/manual/scripts/bootstrap.sh` is a test script |
| grimoire-duo | 5 | 0 distinct | duplicate checkout |
| uv | 4 | 1 vendored (scripts/install-mold.sh, 60 lines) | |
| setup-grimoire | 3 | 2 (.github/scripts/install.sh 121, install.ps1 74) | third hit is a Pester test |
| ocx-marketing | 2 | 0 | keychain helper scripts |
| oras-www | 1 | 1 (tools/install.sh, 13 lines) | |
| grimoire-lore | 1 | 0 | research scratch |
| grimoire-indexer | 0 (content hit) | 1 inline template (templates/ci/gitlab-enrich.sh, 35 lines, renders curl + `sha256sum -c` into CI YAML) | found by `scan.py` only |
| **Total** | **127** | **10 authored + 1 inline + 2 vendored** | setup-ocx is TypeScript (src/download.ts), not a script installer |

Extremes: largest authored = www-setup/src/install.sh (913 lines, 35,294 B) and install.ps1 (951 lines); smallest = oras-www (13 lines).
Corpus extremes: ACME 9,785 lines (294,737 B) vs the 12-line FD ps1. Generated vs hand-written: grimoire ships cargo-dist-generated installers
behind a 35-line front door (grimoire/dist-workspace.toml:7 `cargo-dist-version = "0.33.0"`, :11 `installers = ["shell", "powershell"]`);
ocx hand-writes five dialects in www-setup and sets `installers = []` (ocx/dist-workspace.toml:7 dist 0.31.0, :11, two minors behind).

False-positive rates (spot-read 3 hits per pattern, then population counts where the population is small):

| Pattern | Hits | Spot-read | FP rate | Note |
|---|---|---|---|---|
| name regex (`install\|get\|bootstrap\|setup` `.sh\|.ps1`) | 127 | ocx/test/doc_scripts/getting-started__install.sh (FP, docs cast), ocx-marketing setup-keychain.sh (FP), uv/scripts/install-mold.sh (TP) | 111/127 = 87% (population) | recall 7/10 authored |
| content scan (`scan.py`) | 14 | debug-nu.sh (FP), init-vscode-server.sh (FP), tests/docker/install-shells.sh (FP) | 5/14 = 36% (population) | recall 5/10 |
| one-liner census (`curl\|sh`, `irm\|iex`) | 334 | FD install.sh:9 (TP), grimoire/.github/workflows/release.yml:66 and :126 (TP), grimoire-indexer/.lighthouseci report (FP artifact) | 181/334 = 54% sit in notes, fixtures or build artifacts | 153 in product docs, workflows and source |
| `sudo` feature regex | 36 | acme:167 (URL var), acme:8560 (help text), vcpkg:78 (echo hint) all FP; brew:282, mold:48 TP | 4/6 = 67% | table 2d uses only TP lines |
| `which` GNU-ism regex | 11 | deno:98, docker:456, nvm:449 prose FP; nvm:420 TP | 3/4 = 75% | |
| `$'..'` regex | 22 | WS:626 (`*'$'*` pattern), SG:20, RUSTUP:754 FP; SG:10 `IFS=$'\n\t'` TP | 3/4 = 75% | bash-only construct, SG is bash |
| `[ a == b ]` regex | 46 | dotnet:176, :353, :355, SG:74 all `[[ ]]` | 4/4 = 100% | regex matches inside `[[`; intended single-bracket form has 0 hits |
| `timeout N` regex | 6 | dotnet:1111, :1129 (`--connect-timeout`) FP | 2/2 | k3s:411,413 are TP (GNU coreutils `timeout`) |
| `trap`, `uname`, `musl` | - | k3s:353/357/928, vcpkg:44/106, dotnet:187/188/208 | 0/8 | table cells cite only these |

## Axis 2: comparison table

Rows are the 17 shell installers (4 fleet-authored, 2 vendored, 11 exemplar; `CDIST` is cargo-dist's rendered output, which is what grim ships)
and, in 2e, the 8 PowerShell installers. Every cell carries its citation; "n/f" means the feature regex and a manual read found nothing.

### 2a Dialect, floor, errexit, truncation guard, exit codes
`cd $FX/src && python3 ../feat.py *.sh` plus `sed -n` reads of the last 3 non-blank lines of each file.

| Id | Lines | Shebang / dialect | Floor evidence | `set` | Truncation guard | Exit codes |
|---|---|---|---|---|---|---|
| WS sh | 913 | `#!/bin/sh` WS:1 | POSIX plus `local` polyfill WS:39-40 (`has_local() { local _ 2>/dev/null; }`, `alias local=typeset`); header lists bash/zsh/ash/ksh/dash WS:6 | `-eu` WS:37 | `main "$@"` WS:913 | taxonomy 0-7 documented WS:27-36 |
| FD sh | 35 | `#!/bin/sh` FD:1 | POSIX, delegates | `-eu` FD:14 | not needed: downloads to a temp file, then `sh "$tmp"` FD:18-35 | 0/1 FD:20,32 |
| SG sh | 121 | `#!/usr/bin/env bash` SG:1 | bash 3.2 floor stated SG:46-50, :94-96; e2e on bash 3.2/4.0/4.4/5.3 4/4 | `-euo pipefail` SG:9 | `main "$@"` SG:121 | 1 (5 sites) |
| ORAS | 13 | `#!/usr/bin/env bash` ORAS:1 | none | none | none | none |
| MOLD | 60 | `#!/usr/bin/env bash` MOLD:1 | none stated | `-euo pipefail` MOLD:7 | none | 1 MOLD:23 |
| DCLI | 672 | `#!/bin/sh` DCLI:1 | POSIX, parses 11/11 | `-e` DCLI:19 | `main "$@"` DCLI:672 | 0 (4 sites) / 1 (19) |
| CDIST | 1834 | `#!/bin/sh` CDIST:6 | POSIX plus `has_local` CDIST:22, `shellcheck shell=dash` | `-u` CDIST:29 | `download_binary_and_run_installer "$@" \|\| exit 1` CDIST:1838 | 0/1 |
| RUSTUP | 933 | `#!/bin/sh` RUSTUP:1 | POSIX plus `has_local` RUSTUP:15, `shell=dash` RUSTUP:2 | `-u` RUSTUP:29 | `main "$@" \|\| exit 1` RUSTUP:931 | 0/1 |
| DENO | 128 | `#!/bin/sh` DENO:1 | POSIX | `-e` DENO:5 | **none**; file ends in `echo` DENO:127-128 | 0/1 DENO:9,35 |
| BREW | 1243 | `#!/bin/bash` BREW:1 | bash only; guard BREW:17-20 | `-u` BREW:7 | none (run as `bash -c "$(curl ...)"`) | 1 (7 sites) |
| DOCKER | 813 | `#!/bin/sh` DOCKER:1 | POSIX | `-e` DOCKER:2 | `do_install` DOCKER:813, comment DOCKER:811-812 | 0/1 |
| DOCKER-RL | 283 | `#!/bin/sh` DOCKER-RL:1 | POSIX | `-e` DOCKER-RL:2 | `do_install "$@"` DOCKER-RL:283 | 0/1 |
| K3S | 1218 | `#!/bin/sh` K3S:1 | **bashism** `for i in {1..3}` K3S:408 | `-e` K3S:2, `-o noglob` K3S:3 | `{ ... }` block K3S:1206-1218 | 1 K3S:118, `$code` K3S:355 |
| DOTNET | 1887 | `#!/usr/bin/env bash` DOTNET:1 | bash | `-e` :7, `-u` :9, `pipefail` :12 | none | 0/1 |
| NVM | 536 | `#!/usr/bin/env bash` NVM:1 | bash, but wrapper: `{` NVM:3 ... `}` NVM:536 | none | brace block, comment NVM:536 | 1 (10), 2 (6) |
| ACME | 9785 | `#!/usr/bin/env sh` ACME:1 | POSIX | `-f` ACME:5213 | `main "$@"` ACME:9785 | 0/1, `$_ret` |
| VCPKG | 270 | `#!/bin/sh` VCPKG:1 | POSIX | none | none (run from a checkout) | 0/1 (10) |

Counts: truncation guard 10/17 (WS, SG, DCLI, CDIST, RUSTUP, DOCKER, DOCKER-RL, K3S, NVM, ACME); declared POSIX 11, declared bash 6;
only WS uses more than two distinct non-zero exit codes (1/17); `set -e` present in 10/17, `pipefail` in 3/17 (DOTNET, SG, MOLD), all bash.

### 2b Platform detection
Executed results are in Axis 4; this table cites the mechanism.

| Id | OS / arch source | Rosetta | musl | Windows-ish | Unsupported behaviour |
|---|---|---|---|---|---|
| WS sh | `uname -s` Linux\|Darwin WS:249-253, `uname -m` WS:255-259 | `sysctl -n hw.optional.arm64 \| grep -q 1` WS:263-264 | `ldd --version` `*musl*`, else `/lib/ld-musl-*.so.1`, else `/etc/alpine-release` WS:272-278 | rejected, exit 7 | explicit `err ... 7` |
| FD sh | none, delegates | n/a | n/a | n/a | n/a |
| SG sh | `case "$(uname -s)/$(uname -m)"` SG:32-41 | none | none (glibc asset on Alpine) | rejected | `::error::` exit 1 SG:37-39 |
| ORAS | `uname -s \| tr`, `[ "$(uname -m)" = x86_64 ] && amd64 \|\| arm64` ORAS:6-7 | none | none | passes garbage through | **silent fall-through to arm64** |
| MOLD | `uname -m` MOLD:11, `case ${VERSION}:${arch}` MOLD:14-25 | n/a | n/a | n/a | explicit exit 1 MOLD:21-23 |
| DCLI | `uname -s` DCLI:152, `-m` DCLI:172-184 | yes DCLI:191-192 | n/f | MINGW rejected, points to WSL DCLI:159-162 | `error` |
| CDIST | `uname` CDIST:91, `get_architecture` CDIST:1419 | **buggy precedence** CDIST:1460 (template CDIST-T:1316) | `ldd --version \| grep -q musl` CDIST:1431 | MINGW\|MSYS\|CYGWIN CDIST:89-92 | `err` CDIST:615,618 |
| RUSTUP | `uname -s/-m` RUSTUP:352-357 | correct `( ... \|\| true) \| grep` RUSTUP:386 | `ldd` RUSTUP:360-361 | MINGW RUSTUP:451 | `RUSTUP_CPUTYPE` override RUSTUP:552-559 |
| DENO | `case "$OS $ARCH"` DENO:15-19 | none | none | `MINGW` branch DENO:13 | **default arm = x86_64 linux gnu** DENO:19 |
| BREW | `uname` BREW:157-160, `arm64` test BREW:170 | n/f | `ldd` BREW:565 (glibc check) | n/f | `abort` BREW:622 |
| DOCKER | `/etc/os-release` DOCKER:312-316, WSL check DOCKER:282-285 | n/a | os-release read DOCKER:315-316 | WSL only | `exit 1` |
| K3S | `uname -m` K3S:302 | n/a | `/etc/alpine-release` K3S:603 | n/a | `fatal` |
| DOTNET | `uname` DOTNET:141,194 | `pgrep oahd` DOTNET:409 | `ldd --version \| grep -q musl` DOTNET:187-188 | WSL DOTNET:1344 | `say_err` |
| NVM | none (git or tarball of source) | n/a | n/a | n/a | n/a |
| ACME | none | n/a | n/a | MINGW ACME:1389 | n/a |
| VCPKG | `uname -s` VCPKG:44, `uname` VCPKG:106 | n/a | `-musl` flag VCPKG:26, alpine VCPKG:109 | MINGW VCPKG:44-45 | `exit 1` |
| DOCKER-RL | `uname` DOCKER-RL:84-88 | n/a | n/a | rejects non-Linux DOCKER-RL:88 | `exit 1` |

### 2c Download tool, TLS, retry, integrity
Integrity root-of-trust vocabulary: **pinned** (hash in the script), **manifest** (hash from a different origin than the asset), **sidecar** (hash file next to the asset, same origin), **GPG**, **none**.

| Id | Downloader and flags | TLS floor | Retry | Integrity |
|---|---|---|---|---|
| WS sh | curl or wget autodetect, `OCX_INSTALL_DOWNLOADER` override WS:303-335, snap curl demoted WS:320-326 | curl `--proto '=https' --tlsv1.2` WS:343-345; wget `--secure-protocol=TLSv1_2 --https-only` WS:352-354; `assert_https_url` WS:296 | custom 3 attempts, 1s/2s WS:359-378 | **manifest** (dist.json on setup.ocx.sh, assets on GitHub) WS:90-98, :394-420; pinned content-addressed manifest URL, missing tool fatal WS:393-403; **fail-open** WS:405, :861 |
| FD sh | `curl --proto '=https' --tlsv1.2 -LsSf` FD:27, `wget --https-only -qO` FD:29 | yes | none | delegated (claims verification FD:5-6) |
| SG sh | curl array SG:58 | `--proto '=https' --tlsv1.2` SG:58 | `--retry 3 --retry-delay 2 --retry-connrefused`, `--retry-all-errors` forbidden SG:51-57 | **sidecar** `.sha256` SG:92-103, size check SG:79-82, fail-closed |
| ORAS | `curl -s -o ... -LO` ORAS:11 (no `-f`) | none | none | none |
| MOLD | `wget` with timeout/tries/waitretry MOLD:34-41 | none | `--retry-on-http-error=429,500,502,503,504` MOLD:39 | **pinned** sha256 per version and arch MOLD:14-25, :43, fail-closed |
| DCLI | `curl -fSL --retry 3 --retry-delay 2` / `wget --tries=3 --waitretry=2` DCLI:242-244 | none | yes | none |
| CDIST | `curl -sSfL` CDIST:1749, `wget "$1" -O "$2"` CDIST:1755, snap check CDIST:1716-1722 | **none** (no `--proto`, no `--tlsv1.2`) | none | **sidecar/manifest** sha256, sha512, sha3-256 CDIST:1761-1790; skipped if tool missing CDIST:1773 or no checksum CDIST:354 |
| RUSTUP | capability-probed `check_help_for` RUSTUP:706-747, `--retry 3` RUSTUP:822-830 | `--proto '=https' --tlsv1.2` plus ciphers RUSTUP:706-717; wget RUSTUP:738-747 | yes, with `-C -` fallback | **none**: 0 hash tokens, TLS only; `RUSTUP_UPDATE_ROOT` RUSTUP:31-32 |
| DENO | `curl --fail --location` DENO:87; version probe `curl -s` (no `-f`) DENO:67 | none | none | none |
| K3S | `curl -o $1 -sfL $2` K3S:440, `wget -qO` K3S:444 (unquoted) | none | none | **sidecar** `sha256sum-<arch>.txt` K3S:468-481, fail-closed |
| DOCKER | `curl -fsSL` for repo keys DOCKER:590,604 | none | none | **GPG** apt/yum repo keys DOCKER:596-605 |
| BREW | git clone, `curl` BREW:501-510 | n/f | `retry` BREW:353 | none (git transport) |
| DOTNET | `curl ... --retry 20 --retry-delay 2 --connect-timeout 15 -sSL -f` DOTNET:1198; comment on curl `--retry` regression curl#1755 DOTNET:1209 | none | yes | **none** (version check only DOTNET:1631) |
| NVM | `curl --fail --compressed -q` NVM:121, wget emulation NVM:123-148 | none | none | none (git clone default) |
| ACME | `curl --silent --dump-header` ACME:2161, `wget -q` ACME:2193 | none | n/a | none |
| VCPKG | `curl -L ... --tlsv1.2 --retry 3 --fail` VCPKG:156 | `--tlsv1.2` only | `--retry 3` | **pinned** sha512 per artifact VCPKG:124-144 |
| DOCKER-RL | `curl` DOCKER-RL:269-270 | none | none | none |

Totals over 17: pinned 2 (MOLD, VCPKG), manifest 1 (WS), sidecar 3 (SG, K3S, CDIST), GPG 1 (DOCKER), delegated 1 (FD), none 9
(RUSTUP, DENO, BREW, DOTNET, NVM, ACME, DCLI, ORAS, DOCKER-RL). TLS floor flags present in 5 (WS, FD, SG, RUSTUP, VCPKG partial); absent in the
cargo-dist installer that grim actually ships (CDIST:1749, :1755), so the front door's `--proto` protects only the hop that fetches the installer.

### 2d Temp files, root, install location, PATH, knobs, uninstall

| Id | Temp and cleanup | Root / sudo | Install location | PATH and rc files | Non-interactive and knobs | Uninstall |
|---|---|---|---|---|---|---|
| WS sh | `mktemp -d` WS:793, `trap cleanup EXIT INT TERM HUP` WS:794 | user space, no sudo, no `id -u` check | `$OCX_HOME` default `~/.ocx` WS:220 | **delegates** to `ocx self setup` (exit 6 on failure); `--no-modify-path`, `OCX_NO_MODIFY_PATH` WS:215-221; GITHUB_PATH WS:572-575 | 11 `OCX_INSTALL_*` plus 3 shared knobs (`OCX_HOME`, `OCX_NO_MODIFY_PATH`, `OCX_MANAGED_CONFIG`) WS:78-115; `--version` flag; offline hatch `__OCX_TESTING_INSTALL_BINARY` WS:597-604 | prints `rm -rf $_ocx_home` hint WS:662-664 |
| FD sh | `mktemp` FD:18, `trap ... EXIT INT TERM` FD:24 (expanded at definition) | n/a | by cargo-dist | by cargo-dist | forwards `"$@"` FD:35 | n/a |
| SG sh | `mktemp -d` SG:63, `trap "rm -rf \"$tmp\"" EXIT` SG:67 | runner | `$RUNNER_TEMP/grim-bin` SG:115 | `>>"$GITHUB_PATH"` SG:118 | env only SG:6-8, :26, :43-44 | n/a |
| ORAS | none (caller's dir) | n/a | cwd | none | positional args ORAS:3-4 | n/a |
| MOLD | `mktemp` MOLD:31, `trap` MOLD:32 | `whoami` then `SUDO` MOLD:45-49 | `/usr/local` MOLD:51 | symlinks `ld` MOLD:54-56 | `MOLD_VERSION` MOLD:9 | n/a |
| DCLI | `mktemp` DCLI:314, `trap` DCLI:315,359,384 | n/f | `$DEVCONTAINERS_INSTALL_DIR` default `~/.devcontainers` DCLI:22 | prints instructions DCLI:96, :601-604 | `--prefix`, `--node-version`, `--uninstall` DCLI:9-13 | `--uninstall` DCLI:132 |
| CDIST | `ensure mktemp -d` CDIST:338, `rm -rf` at end only CDIST:404, **no trap** | n/f | `$..._INSTALL_DIR`, receipt in `$RECEIPT_HOME` CDIST:408-411 | **edits rc files**, idempotent via `grep -F` CDIST:1202-1221, `.profile` CDIST:914; `NO_MODIFY_PATH` CDIST:56-68 | env `..._NO_MODIFY_PATH`, `--quiet`, `-h` CDIST:145-171 | install receipt only |
| RUSTUP | `mktemp` RUSTUP:76,111,301, **no trap** | n/f | by rustup binary | **delegates** to `rustup-init` | `-y`, `--no-modify-path`, `/dev/tty` redirect RUSTUP:119-206 | n/f |
| DENO | n/f | n/f | `$DENO_INSTALL` default `~/.deno` DENO:79 | **delegates**, `/dev/tty` redirect DENO:116-117 | `--no-modify-path`, help DENO:23-35 | n/f |
| BREW | `mktemp` BREW:1087, `trap` BREW:331,891,1088 | refuses root unless CI BREW:435-443, requires sudo BREW:287-340 | `HOMEBREW_PREFIX` BREW:102-243 | **prints** shellenv per shell BREW:1141-1153 | `NONINTERACTIVE`, `CI`, `INTERACTIVE` conflict check BREW:28-146 | n/f |
| DOCKER | n/f | root or `sudo -E sh -c` DOCKER:470-477 | package manager | n/a | `--channel --mirror --version --setup-repo --no-autostart --dry-run` DOCKER:155-182, `DRY_RUN` env DOCKER:138 | n/f |
| DOCKER-RL | `mktemp` DOCKER-RL:264, `trap` DOCKER-RL:265 | **refuses root** DOCKER-RL:93-94 | `$DOCKER_BIN` default `~/bin` DOCKER-RL:73 | prints PATH, DOCKER_HOST DOCKER-RL:130 | `FORCE_ROOTLESS_INSTALL`, `SKIP_IPTABLES` DOCKER-RL:93,161 | n/f |
| K3S | `mktemp` K3S:346, `cleanup` K3S:350, `trap cleanup INT EXIT` K3S:357 | `SUDO=sudo` unless `id -u` is 0 K3S:218-220 | `/usr/local/bin` K3S:57 | symlinks | 20 distinct `INSTALL_K3S_*` names K3S:53-276, `K3S_URL`, `K3S_TOKEN` | **writes** `k3s-uninstall.sh` K3S:253, :901 |
| DOTNET | `mktemp` DOTNET:971,1050,1566 | n/f | `DOTNET_INSTALL_DIR` DOTNET:924, `--install-dir` DOTNET:1681 | **process only** `export PATH` DOTNET:1880 | `--dry-run`, `--no-path` DOTNET:1710-1713 | n/f |
| NVM | n/f | n/f | `$NVM_DIR` | **edits** profile, idempotent `grep -qc` NVM:484-485 | `NVM_INSTALL_VERSION` NVM:90 | uninstall instructions NVM:391-396 |
| ACME | `mktemp` ACME:2119 | warns on sudo ACME:9587 | `$LE_WORKING_DIR` ACME:3323 | **edits** profile, cron ACME:7952-7958 | many flags ACME:8560 | `uninstall()` ACME:8282 |
| VCPKG | n/f | prints `sudo apt-get ...` hints VCPKG:78-93 (text only) | checkout | none | `-disableMetrics`, `-musl` VCPKG:16-26 | n/a |

Totals: trap 8/17 (WS, FD, SG, MOLD, DCLI, BREW, DOCKER-RL, K3S); rc-file editing in the script 3/11 exemplars (CDIST, NVM, ACME), delegated to the installed
binary 2 (RUSTUP, DENO) plus WS in the fleet, printed instructions 2 (BREW, DCLI); fleet in-script editing 0/4. Automated uninstall: K3S, DCLI, ACME (3/17); fleet 0/4.
Root handling: refuses root 2 (BREW, DOCKER-RL), escalates 3 (K3S, MOLD, DOCKER); fleet user-space 4/4 and none checks `id -u`.

### 2e PowerShell installers (8)
`bash matrix.sh pwsh $FX/scan_ps.ps1` (AST scan) plus line reads; `CDIST-PS` lines converted to snapshot numbering.

| Id | Lines | Floor | TLS | Retry | Integrity | Extraction | Error exit | PATH |
|---|---|---|---|---|---|---|---|---|
| WS ps1 | 951 | `#Requires -Version 5.1` www-setup/src/install.ps1:50 | Tls12 -bor Tls13 :337,:355 | custom loop :360-397 (no `-MaximumRetryCount`, 5.1-safe) | **manifest** `Get-FileHash` :415 | .NET `ZipFile` with zip-slip checks :438-466 (avoids `Expand-Archive`) | `exit $Code` :182, `exit 2` :734 | `ocx self setup`; `$GITHUB_PATH` |
| FD ps1 | 12 | none | none | none | delegated, **claims SHA-256 verification** FD ps1:4-5 | n/a | none | n/a |
| SG ps1 | 74 | pwsh only, stated :48; `shell: pwsh` setup-grimoire/action.yml:55 | none | `-MaximumRetryCount 3 -RetryIntervalSec 2` :52-53 (7+ only) | **sidecar** `Get-FileHash` :54-56 | `Expand-Archive` :61 | `exit 1` inside try, finally cleans :23,:58 | `$env:GITHUB_PATH` |
| CDIST-PS | 645 | none | none | none | **none**: 0 hits for checksum, sha256, FileHash, hash (also absent from CDIST-T installer.ps1.j2) | `Expand-Archive` CDIST-PS:2231 | `exit 1` | registry edit CDIST-PS:2462-2465, GITHUB_PATH CDIST-PS:2456 |
| DENO-PS | 69 | none | none | none | none | `curl.exe` DENO-PS:26,46, `tar.exe` :48 | none | user PATH `SetEnvironmentVariable` :55 |
| DOTNET-PS | 1486 (CRLF) | none | none | `Invoke-With-Retry` DOTNET-PS:209 | none | tar | `exit` | process PATH :1061 |
| SCOOP | 788 (CRLF) | none declared | Tls12 check SCOOP:180-181 | none | none | n/a | **`Exit-Install`: `$Global:LASTEXITCODE` + `break`, not `exit`** SCOOP:91-102 | n/a |
| VCPKG-PS | 89 | none | none | none | none | n/a | `Write-Error` VCPKG-PS:62 | n/a |

## Axis 3: RUN parse matrix

### 3a POSIX installers under 11 shells
`bash $FX/parse.sh $FX/src/*.sh` -> `$FX/parse/results.tsv` (187 rows). Cell = exit code of `<shell> -n file` (0 = parses).
Invocations: dash `-n`; `busybox ash -n`; `sh -n` (alpine 1.37); mksh `-n`; ksh `-n` (93u+m 2023 and 1.0.10); yash `-n`; posh `-n`; `bash --posix -n` (3.2 and 5.2); `zsh --emulate sh -n`.

| File (declared) | dash | ash1.35 | ash1.37 | mksh | ksh23 | ksh1.0.10 | yash | posh | bash3.2p | bash5.2p | zsh-sh |
|---|---|---|---|---|---|---|---|---|---|---|---|
| WS sh (sh) | 0 | 0 | 0 | 0 | 0 | 0 | **2** | 0 | 0 | 0 | 0 |
| FD sh (sh) | 0 | 0 | 0 | 0 | 0 | 0 | **2** | 0 | 0 | 0 | 0 |
| CDIST, RUSTUP, DENO, DOCKER, DOCKER-RL, K3S, ACME, VCPKG, DCLI (sh, 9 files) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| SG sh (bash) | 2 | 2 | 2 | 1 | 0 | 0 | 2 | 1 | 0 | 0 | 0 |
| DOTNET (bash) | 2 | 2 | 2 | 1 | 0 | 0 | 2 | 1 | 0 | 0 | 1 |
| BREW (bash) | 2 | 2 | 2 | 1 | 3 | 3 | 2 | 1 | 2 | 0 | 1 |
| NVM, ORAS, MOLD (bash) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Declared-POSIX: **119/121 pass**. Fleet declared-POSIX 20/22, exemplar and vendored declared-POSIX 99/99. Both failures: `yash: cannot read input: Invalid or incomplete multibyte or wide character`
(yash 2.52 in the C locale on UTF-8 bytes). Cause: 114 non-ASCII bytes in WS (first at WS:6, runtime strings at WS:264, :326, :402, :405, :861, :880, :891), 3 in FD (FD:2). The same file runs under `LC_ALL=C.UTF-8 yash`
(`hatch.sh` row `yash-2.52-UTF8` rc 0). Declared-bash files fail where expected: dash line 681 DOTNET (here-string), :178 BREW (array), SG:58 (`curl_args=(`). BREW survives `sh BREW` because the guard at BREW:17-20 runs before
the first bashism is parsed: `dash BREW` prints `Bash is required to interpret this script.`. Methodology caveat: `bash --posix -n` is stricter than `bash -n` on 3.2 (BREW:556 fails with `--posix` only).

### 3b The invocations were verified
`bash $FX/parse.sh $FX/plant/*.sh`: 5 planted errors (`bad_brace`, `bad_case`, `bad_noFi`, `bad_quote`, `bad_strayfi`) x 11 shells = **55/55 non-zero**; `good.sh` 11/11 zero. Non-zero codes differ (dash 2, mksh 1, ksh93 3, yash 2, posh 1, bash 2, zsh 1), so the contract is "non-zero", never "2".
`bash $FX/other/pcheck.sh`: fish `-n` returns 127 on the bad file and 0 on good (4 versions); `nu-check` always exits 0, so the wrapper `if not (nu-check F) { exit 1 }` is required (bad 1, good 0, 2 versions); `elvish -compileonly` bad 2, good 0.

### 3c shellcheck 0.11.0 (`-s sh` and `-s bash`, JSON)
| File | `-s sh` total | SC3xxx | `-s bash` total | Note |
|---|---|---|---|---|
| WS sh | **0** | 0 | 1 | `# shellcheck disable=SC3043` WS:5 backed by runtime `has_local` WS:39 |
| FD sh | **0** | 0 | 0 | |
| DENO, DOCKER-RL | 0, 0 | 0 | 0, 0 | clean |
| DOCKER | 5 | 0 | 5 | info only |
| DCLI | 1 | 0 | 1 | |
| VCPKG | 12 | 0 | 12 | |
| K3S | 86 | 1 (SC3009 brace expansion K3S:408) | 85 | |
| RUSTUP | 48 | 42 (all SC3043) | 0 | polyfilled, `shell=dash` |
| CDIST | 142 | 136 (all SC3043) | 9 | polyfilled |
| ACME | 274 | 2 (SC3045 `read -p` ACME:7386, SC3003 `$'..'` ACME:7387) | 288 | 4 error-level |
| **Declared-POSIX total (11)** | **568** | **181** | | 4/11 clean; SC3043 is 178/181 |
| DOTNET (bash) | 474 | 317 | 149 | |
| BREW (bash) | 293 | 293 | 0 | |
| NVM (bash) | 25 | 25 | 0 | |
| SG sh (bash) | 18 | 18 | 0 | |
| ORAS (bash) | 7 | 0 | 7 | unquoted `${OUTPUT_FILE}`, `cd ${TEMPDIR}` ORAS:9-13 |
| MOLD (bash) | 1 | 1 | 0 | |

### 3d bash family
`bash $FX/bashparse.sh`: SG sh, ORAS, BREW, DOTNET, NVM x bash 3.2/4.0/4.2/4.4/5.0/5.1/5.2/5.3 = **40/40 `bash -n` ok**. Runtime on the pinned floor: SG e2e through a stub `curl` shim
(`$FX/sg/run.sh`, `.tar.xz` 404 forces the `.tar.gz` fallback): rc 0, binary installed, `$GITHUB_PATH` written on bash 3.2, 4.0, 4.4, 5.3 (4/4).
Probes `p3b` under bash 3.2 --posix vs 5.2 --posix: empty-array expansion under `set -u` is `a[@]: unbound variable` on 3.2 and `[]` on 5.2; `${x,,}` is `bad substitution` on 3.2; SG avoids both (SG:46-50, :94-97).
The SG checksum fallback `sha256sum f 2>/dev/null \| awk ... \|\| shasum -a 256 f \| awk ...` (SG:98-99) works only because of `pipefail` (SG:9): with it, fallback fires (`actual='deadbeef'`); without it `actual=''` (probe `p3b`, same on mksh, bash 3.2, bash 5.2 and zsh, the 4 shells that parse the probe).

### 3e fish, nu, elvish (www-setup)
`install.fish` 650 lines, `install.nu` 547, `install.elv` 566: parse **7/7** (fish 4/4 versions, nu 2/2, elvish 1/1). Parse only; never executed (Gaps).

### 3f PowerShell
`bash matrix.sh pwsh $FX/parse_ps.ps1` (`Parser::ParseFile`, no execution): **8 files x 3 engines = 24/24, 0 parse errors** on 5.1.26100.9444, 7.4.7, 7.6.6.
7-only hazard AST scan (parameters `-MaximumRetryCount`, `-RetryIntervalSec`, `-AsHashtable`, `-Encoding utf8NoBOM`, `$IsWindows`): **4 hits, 1 file**, setup-grimoire/.github/scripts/install.ps1:52-53, runtime `A parameter cannot be found that matches parameter name 'MaximumRetryCount'` on 5.1 (probe `p4`); pwsh-only by design (:48, action.yml:55).
5.1-sensitive scan (`Join-Path` with 3 positional arguments, `$IsWindows|$IsLinux|$IsMacOS`, `Expand-Archive`, missing `-UseBasicParsing`): `Join-Path` 0/8, `$Is*` 0/8 (WS uses `$script:OcxIsWindows` :96-102), `Expand-Archive` in SG ps1, CDIST-PS and SCOOP (zip-slip fixed only in 7.4+; WS avoids it), `-UseBasicParsing` missing on 3 `irm`/`iwr` calls (FD, SG x2; `irm` is unaffected, so 0 real hazards).
Probe `p4` on 5.1 (all measured): `Join-Path a b c` FAIL, `$IsWindows` under StrictMode FAIL, `-AsHashtable` FAIL, `utf8NoBOM` FAIL, ternary FAIL, `&&` FAIL; `Tls13` enum OK; `Out-File` default is UTF-16LE (`FF FE`) vs UTF-8 on 7.
Encoding (`p9`): a no-BOM UTF-8 em dash read as `226,8364,8221` on 5.1 (mojibake) and `8212` on 7.4/7.6. WS ps1 has 0 non-ASCII bytes (deliberate); FD ps1 and SG ps1 carry em dashes in comments only (FD ps1:1, SG ps1:26,31), harmless.
`irm | iex` (`p7`): `exit` inside the iex'd script terminated the host before the next statement on **3/3 engines** (`AFTER iex` never printed, exit 2): WS ps1:182 and :734, documented usage WS ps1:25 (`irm https://setup.ocx.sh/pwsh | iex`). SCOOP:91-102 shows the safe form.
Offline hatch (`p8`): WS ps1 with `__OCX_TESTING_INSTALL_BINARY` places the binary and prints the bin dir on 5.1, 7.4, 7.6 (3/3, exit 0).

## Axis 4: platform detection in isolation

`bash $FX/detect/run.sh`: the detection function of each installer is extracted verbatim (`detect/build.py`) and run with stub `uname`, `ldd`, `sysctl` in alpine:3.22 ash 1.37, Debian dash 0.5.12 and bash:3.2. 13 scenarios.
Results were identical across the 3 shells for all 6 installers (**0 divergences in 234 runs**). 3 of the 234 runs (RUSTUP `linux-armv7l`) read the host `/proc/cpuinfo`, cannot be stubbed, and are recorded as non-stubbable.

| Scenario | WS | RUSTUP | CDIST | DENO | SG | ORAS |
|---|---|---|---|---|---|---|
| linux x64 glibc | x86_64-gnu | x86_64-gnu | x86_64-gnu | x86_64-gnu | x86_64-gnu | linux_amd64 |
| linux arm64 glibc | aarch64-gnu | aarch64-gnu | aarch64-gnu | aarch64-gnu | aarch64-gnu | linux_arm64 |
| linux x64 musl | x86_64-musl | x86_64-musl | x86_64-musl-dynamic | **x86_64-gnu (wrong libc)** | **x86_64-gnu (wrong libc)** | linux_amd64 |
| linux arm64 musl | aarch64-musl | aarch64-musl | aarch64-musl-dynamic | **aarch64-gnu** | **aarch64-gnu** | linux_arm64 |
| no `ldd` | x86_64-gnu | x86_64-gnu | x86_64-gnu | x86_64-gnu | x86_64-gnu | linux_amd64 |
| armv7l | exit 7 | not stubbable | arm gnueabihf | **x86_64-gnu (wrong arch)** | exit 1 | **linux_arm64 (wrong)** |
| i686 | exit 7 | i686-gnu | i686-gnu | **x86_64-gnu (wrong)** | exit 1 | **linux_arm64 (wrong)** |
| riscv64 | exit 7 | riscv64gc-gnu | riscv64gc-gnu | **x86_64-gnu (wrong)** | exit 1 | **linux_arm64 (wrong)** |
| darwin arm64 | aarch64-darwin | aarch64-darwin | aarch64-darwin | aarch64-darwin | aarch64-darwin | darwin_arm64 |
| darwin x64 intel | x86_64-darwin | x86_64-darwin | x86_64-darwin | x86_64-darwin | x86_64-darwin | darwin_amd64 |
| darwin x64 under Rosetta | aarch64-darwin | aarch64-darwin | aarch64-darwin **plus stray stdout `hw.optional.arm64: 1`** | x86_64 (no detection) | x86_64 (runs under Rosetta) | darwin_amd64 |
| MINGW64 | exit 7 | x86_64-pc-windows-gnu | x86_64-pc-windows-gnu | **x86_64-linux-gnu (wrong)** | exit 1 | **`mingw64_nt-10.0-26100_amd64` (garbage)** |
| FreeBSD amd64 | exit 7 | x86_64-freebsd | x86_64-freebsd | **x86_64-linux-gnu (wrong)** | exit 1 | **freebsd_arm64 (wrong)** |

Silently wrong or unrefined: DENO 7/13 (5 wrong arch or OS, 2 wrong libc; DENO:19 default arm), ORAS 5/13 (ORAS:7 fall-through), WS 0/13 (8 supported, 5 explicit exit 7 with message), SG 0 wrong-arch (5 explicit exit 1; 2 musl rows pick the glibc asset, runner-only).
Rosetta idiom probe (`p2`, 3 sysctl scenarios x 3 idioms x 11 shells, identical everywhere):

| Scenario | CDIST `sysctl .. \|\| true \| grep -q` | RUSTUP `(sysctl .. \|\| true) \| grep -q` | WS `sysctl -n .. \| grep -q 1` |
|---|---|---|---|
| unknown oid (stderr, rc 1) | x86_64 | x86_64 | x86_64 |
| value 0, rc 0 | **prints `hw.optional.arm64: 0`, picks arm64 (wrong)** | x86_64 | x86_64 |
| value 1, rc 0 | prints `hw.optional.arm64: 1`, arm64 | arm64 | arm64 |

`||` binds looser than `\|`, so CDIST's `if` tests sysctl's own exit status and sysctl's stdout is never piped (CDIST:1460, template CDIST-T:1316; the x86_64 twin is CDIST:1451, template :1307). Real macOS behaviour of the OID on Intel (absent, rc 1) is **unverified, read-only**; if absent, the wrong-answer branch is unreachable and only the stdout leak shows.

## Axis 5: ranked defensive patterns and fleet gaps

Rank = frequency in the corpus x how much damage the missing pattern does. Count = installers (of 17 sh, unless noted) that have it.

| Rank | Pattern | Have it | Fleet status | Evidence |
|---|---|---|---|---|
| 1 | Truncation guard (function plus final call, or `{ }`) | 10/17 | WS, SG yes; FD n/a; ORAS no | 2a; DENO ends in `echo` DENO:127-128, a truncated download runs a partial script |
| 2 | Integrity with a root of trust other than the asset origin, fail-closed mode | 3/17 (WS, MOLD, VCPKG) | WS only; grim's own installers: sh sidecar skippable, **ps1 none** | 2c; CDIST:354, :1773; CDIST-PS 0 hits; FD ps1:4-5 claim |
| 3 | TLS floor flags with a capability probe for wget | 1/17 fully (RUSTUP:742) | WS and FD set flags without a probe: **Alpine crash** | Smell 2; CDIST sets none |
| 4 | Parse-verified dialect, polyfilled `local` | 3/17 polyfill (WS, RUSTUP, CDIST) | WS yes; SG states its bash 3.2 floor instead | 3a, 3c |
| 5 | Temp dir plus trap on `EXIT INT TERM HUP` | 8/17 | WS, FD, SG yes; **flagships RUSTUP and CDIST do not** | 2d |
| 6 | Explicit unsupported-platform exit, no silent fall-through | WS, SG, MOLD, DCLI, CDIST, K3S | ORAS and DENO fall through | Axis 4 |
| 7 | Retry that distinguishes 404 from transient (`--retry`, never `--retry-all-errors` where a fallback exists) | SG documented SG:51-57; DOTNET:1198, :1209 | WS custom loop retries everything WS:359-378 | WS comment WS:364-366 accepts this |
| 8 | Offline end-to-end hatch so every shell can run the installer | 1/17 (WS:597-604) | WS yes (10 of 12 shell rows pass; yash C and posh fail) | `hatch.sh` |
| 9 | Documented exit-code taxonomy | 1/17 | WS | WS:27-36 |
| 10 | irm\|iex-safe exit (`break` plus `$Global:LASTEXITCODE`) | SCOOP only (1/8 ps1) | WS ps1 uses `exit` | 3f |
| 11 | rc-file edit that is idempotent and opt-out | CDIST, NVM, ACME | fleet delegates to `ocx self setup` | 2d |
| 12 | Uninstall path | K3S, DCLI, ACME | none (hint text only WS:662-664) | 2d |
| 13 | Bash guard before the first bashism | BREW:17-20 | n/a, SG is invoked as `bash` (action.yml:51) | 3a |
| 14 | Snap-curl demotion | CDIST:1716-1722, WS:322-326 | WS yes | 2c |

Fleet gaps (what a fleet installer lacks that the corpus shows at least once): (a) any hash check on the Windows grim path; (b) `--proto`/TLS floor in the shipped cargo-dist installer;
(c) BusyBox-safe wget in WS and FD; (d) an iex-safe exit in WS ps1; (e) ASCII-only sh payloads; (f) a trap in the generated installers (not fleet-controllable); (g) an uninstall command or receipt-driven uninstall for WS (CDIST writes an install receipt, WS does not);
(h) ORAS is the one fleet script with no `-f`, no integrity, unquoted variables and a silent arch fall-through.

## Smells (ranked)

| # | Smell | Evidence (all reproduced or measured) | Severity |
|---|---|---|---|
| 1 | **Claim vs template: FD ps1 says the cargo-dist installer verifies SHA-256; the pinned 0.33.0 PowerShell template has no hash code.** | FD ps1:4-5; `installer.ps1.j2` and rendered CDIST-PS: 0 hits for checksum, sha256, FileHash, hash; dist pinned at grimoire/dist-workspace.toml:7 (`0.33.0`, same version as the exemplar SHA). The generated release asset `grimoire-installer.ps1` was not fetched (no network), so this is template-level | high |
| 2 | **BusyBox wget crash in WS**: on stock alpine:3.22 (no curl, BusyBox 1.37) `install.sh` picks wget and dies on `wget: unrecognized option: secure-protocol=TLSv1_2`, three attempts, rc=3, message blames "your internet connection" | WS:352-354 (flags), WS:326 (autodetect), run offline: `docker run --network none alpine:3.22 sh WS` -> `rc=3`; FD:29 uses `--https-only` and fails the same way; RUSTUP:738-747 guards with `check_help_for` RUSTUP:742 | high |
| 3 | **`exit` inside `irm \| iex` kills the caller's PowerShell** | WS ps1:182, :734; documented one-liner WS ps1:25; probe `p7` 3/3 engines; fix shape SCOOP:91-102 | high |
| 4 | **Non-ASCII bytes in the curl-piped sh installers** (em dashes in runtime strings): yash 2.52 C locale cannot read the script | 3 of 6 fleet sh files vs 0 of 11 exemplar sh files; WS 114 bytes (WS:6, :264, :402, :405, :861); FD:2; SG:47,:56; `yash -n` and `--help` rc 2 on 3/3; fix: `LC_ALL=C.UTF-8` runs clean | medium |
| 5 | **Fail-open integrity** on the rolling path: missing sha tool or missing manifest hash is a warning, then install continues | WS:405 (`SKIPPING CHECKSUM VERIFICATION`), WS:861; pinned path is fail-closed WS:393-403; CDIST:354, :1773 same shape | medium |
| 6 | **cargo-dist Rosetta precedence bug** (shipped to every cargo-dist user) | CDIST:1460 and :1451, template CDIST-T:1316/:1307; `p2` shows sysctl stdout leaked and arm64 chosen when sysctl succeeds with 0; RUSTUP:386 is the correct form | medium (macOS unverified) |
| 7 | **Shipped cargo-dist installer has no TLS floor** while the fleet front door has one | CDIST:1749, :1755 (`curl -sSfL`, plain `wget`); FD:27 | low-medium |
| 8 | k3s `{1..3}` retry under `#!/bin/sh`: loop body runs **once** in 7/11 shells (dash, ash x2, mksh, yash, posh, zsh-sh), 3 times in 4 (ksh93 x2, bash x2); `$i` stays `{1..3}` | K3S:408; `p3` | medium (exemplar) |
| 9 | docker-install `--setup-repo` double shift: `--setup-repo --dry-run` leaves `DRY_RUN` unset in **11/11** shells, so the dry run is real | DOCKER:170-173 plus DOCKER:187; `p5` with args | medium (exemplar) |
| 10 | posh rejects `"$@"` with zero arguments under `set -u` (`@: parameter not set`); WS runs `main "$@"` under `set -eu` | WS:37, WS:913; `p6` and `hatch.sh` posh row rc 1 | low (posh is niche) |
| 11 | SG checksum fallback depends on `pipefail` | SG:98-99, SG:9; `p3b` | low (documented bash) |
| 12 | Silent arch fall-through (DENO default arm, ORAS arm64) | DENO:19; ORAS:7; 12 of 26 scenario cells wrong | medium (ORAS is a build helper) |
| 13 | DENO version probe `curl -s` without `-f`: an HTTP error page becomes `$deno_version` | DENO:67 | low (exemplar) |
| 14 | Flagship installers leak the temp dir on failure (no trap) | RUSTUP, CDIST: `rm -rf` only on the success path CDIST:404 | low |
| 15 | 9 of 17 installers verify nothing, including RUSTUP (TLS only); grimoire's own release workflow pipes two of them unverified: `curl ... cargo-dist-installer.sh \| sh` (version-pinned URL, no hash) and `curl ... sh.rustup.rs \| sh -s -- -y` | 2c; grimoire/.github/workflows/release.yml:66, :126 | context |

## Patterns worth encoding

Ordered by how much a rule or skill should push them; each has the corpus count that justifies it.

1. **Truncation guard as the last line**: wrap the body in `main()` and call `main "$@"` last, or use a `{ ... }` block. 10/17. Skill step: grep the last non-blank line.
2. **One dialect decision, verified, with a floor sentence**: POSIX sh for anything piped to `sh`; if `local` is used, polyfill with `has_local() { local _ 2>/dev/null; }` plus `alias local=typeset` (WS:39-40, RUSTUP:15, CDIST:22) and say so in a `shellcheck disable=SC3043` comment (WS:5). Result: 0 findings for WS.
3. **Parse verification recipe**: `<shell> -n file` for the 11-shell set, **after proving the invocation on planted errors** (55/55); `nu-check` needs the exit wrapper; `bash -n` not `--posix` for bash files; yash needs `LC_ALL=C.UTF-8` or ASCII input.
4. **ASCII-only installer payloads**: 11/11 exemplar sh and 5/5 exemplar ps1 are ASCII; non-ASCII breaks yash (C locale) and 5.1 (`226,8364,8221` mojibake). Em dashes belong in docs.
5. **Root of trust different from the asset origin, with a fail-closed `required` mode** (WS:393-403) and a pinned-hash mode (MOLD:14-25, VCPKG:125-141). Never print "verified" on a path that can skip (CDIST:354).
6. **Download flags**: `curl --proto '=https' --tlsv1.2`, wget `--https-only --secure-protocol=TLSv1_2` **only after a `--help` capability probe** (RUSTUP:706-747); BusyBox wget rejects both flags (reproduced on 1.37).
7. **Retry semantics written down**: `--retry 3 --retry-connrefused` for transient errors, never `--retry-all-errors` when a 404 fallback follows (SG:51-57); curl `--retry` regression note (DOTNET:1209); map retries to exit codes (WS:359-378).
8. **Temp file plus trap**: `trap "rm -rf \"$tmp\"" EXIT INT TERM HUP`, expanded at definition time when the variable is `local` (SG:63-67, FD:22-24); `mktemp` return checked (FD:18-21).
9. **Platform detection that fails loudly**: explicit supported matrix, exit code 7 or equivalent, musl via `ldd --version` then `/lib/ld-musl-*.so.1` then `/etc/alpine-release` (WS:272-278), Rosetta with `(sysctl ... || true) | grep` (RUSTUP:386). Test with stubs: the 13-scenario harness found 12 silent-wrong cells in 2 installers.
10. **Exit-code taxonomy** (usage 2, network 3, checksum 4, extract 5, setup 6, platform 7: WS:27-36) and a test hatch (`__OCX_TESTING_INSTALL_BINARY`, WS:597-604) so every shell runs the real script offline.
11. **Piped-installer interactivity**: redirect prompts from `/dev/tty` (RUSTUP:200-206, DENO:116-117), `-y` and `NONINTERACTIVE` (BREW:28-146); installers that never prompt (WS) should say so.
12. **PowerShell**: `#Requires -Version 5.1` (WS ps1:50), TLS 1.2 set explicitly (WS ps1:337), custom retry rather than the 7-only `-MaximumRetryCount` (WS ps1:360-397), .NET `ZipFile` with zip-slip check (WS ps1:438-466), `Get-FileHash` (WS ps1:415), ASCII source, and **never `exit` under `irm | iex`**: `$Global:LASTEXITCODE` plus `break` (SCOOP:91-102).
13. **Bash guard before bashisms** when a bash script may be piped to sh (BREW:17-20; verified output under dash).
14. **Bash 3.2 floor patterns** when macOS is a target: arrays never empty under `set -u`, `awk tolower` instead of `${x,,}`, `find -print -quit` instead of `| head -1` under `pipefail` (SG:46-50, :94-110); e2e verified on 4 bash versions.
15. **Embedded sed-able config placeholders** (www-setup/.claude/rules/installers.md:53-82): token appears once per file, single-quoted, environment over embedded over default; fleet-specific, not corpus-wide.

## Contradictions of the frame

| Hypothesis | Verdict | Counts |
|---|---|---|
| H1 fleet `#!/bin/sh` scripts hide bashisms | **Contradicted** for installers | 2/2 fleet declared-POSIX installers: 0 shellcheck findings, 22 cells 20 parse (the 2 failures are locale, not syntax). The real bashism hits in the corpus are in upstream: K3S:408 (1), ACME:7386-7387 (2); 178 of 181 SC3xxx are the polyfilled `local` |
| H2 `set -euo pipefail` is cargo-culted | **Contradicted** for the fleet | 0 masking `local x=$(cmd)` in the 4 fleet sh files (5 hits, all DOTNET:141,175); SG declares locals at SG:23-24 and assigns later; `pipefail` in 3/17, all bash; the corpus's two flagships use `set -u` only (RUSTUP:29, CDIST:29) and handle errors by hand |
| H4 installers assume GNU userland or bash 4+ | **Largely contradicted** | 0 GNU-ism true positives in the 4 fleet sh files (false-positive rates in Axis 1); exemplar hits are guarded (ACME:940-944 feature-detects `sed -i`); 3/11 exemplar sh are bash by declaration (BREW, DOTNET, NVM); "strictly POSIX" is true of RUSTUP, CDIST, DENO only up to `local` |
| H6 agents' bad habits in installers | Mostly absent | declared-POSIX files: `[[` 0, `function f` 0, `echo -e/-n` 0, arrays 0 (1 false positive), `${//}` 0; the one live item is brace expansion K3S:408 |
| H7 macOS ships bash 3.2 | Consistent | bash:3.2 reproduces `unbound variable` and `bad substitution`; SG handles both and passes e2e on 3.2/4.0/4.4/5.3. Real macOS: unverified |
| H8 PowerShell 5.1 floor, 7.6 LTS | **Partly confirmed** | 1/3 fleet ps1 targets 5.1 (WS, `#Requires`); SG is pwsh-only on purpose; FD relies on the generated installer; all 8 parse on 5.1, 7.4, 7.6 |
| H3, H5, H9 | Not in this axis | untouched |
| Frame item 3: "ocx/grimoire install scripts (`install.sh` / `install.ps1` pairs)" | **Contradicted for ocx** | `installers = []` at ocx/dist-workspace.toml:11, no ocx script installer; the five dialect installers live in www-setup/src. Grimoire has a pair, but a 35/12-line front door over generated installers |
| Frame item 3: `setup-ocx` and `setup-grimoire` actions | **Split** | setup-ocx installs in TypeScript (setup-ocx/src/download.ts), no shell or ps1 to audit; setup-grimoire carries an sh+ps1 pair (SG) |
| Fleet composition | Correction | `grimoire-duo` is a second checkout of the grimoire remote (HEAD c045c195 vs 4650ad83), 8 byte-identical copies, deduped |
| Strategy split | Confirmed, with a cost | ocx hand-writes five dialects and gets verification, exit codes, a hatch; grimoire delegates to cargo-dist 0.33.0 and inherits its gaps (Smells 1, 6, 7); ocx pins dist 0.31.0, grimoire 0.33.0 |
| Orchestrator's Q1 (POSIX floor for installers) | Supported by data | 100% of the 9 non-fleet declared-POSIX installers parse under 11 shells; the two fleet ones fail only on non-ASCII under one shell |

## Gaps

- **macOS**: no host. Rosetta `sysctl` exit codes on real Intel and Apple Silicon, absence of `sha256sum` on stock macOS (SG relies on `shasum` fallback, SG:98-99), BSD `sed -i ''` (ACME:944), `/bin/sh` as bash 3.2 POSIX mode: all unverified, read-only. `bash:3.2` (Alpine-based image) stands in for `/bin/bash` 3.2.57 semantics only.
- **Generated installers not fetched**: `grimoire-installer.sh/.ps1` are release assets; analysis uses the cargo-dist 0.33.0 template and snapshot (same version as grimoire pins) and cannot see per-release config such as checksum style for the ps1.
- **Git Bash / MSYS**: only simulated by a stubbed `uname` (WS exits 7, RUSTUP and CDIST pick `x86_64-pc-windows-gnu`); no real Git Bash run of any installer. Windows PowerShell 5.1 was real (WSL host).
- **fish, nu, elvish installers**: parse-only (7/7), never executed; `nu-check` is a weak oracle.
- **Not executed, read only**: package-manager flows (docker, k3s, brew), sudo escalation, `/dev/tty` prompts, rc-file edits, uninstall paths. Network paths were not run anywhere (stubs, hatch, `--network none`).
- **Inventory recall**: name heuristic 7/10 and content 5/10 on authored files; the three missing files were found by listing `www-setup/src`. Installers with unusual names elsewhere in the 60 dirs could still be missed (recall outside the known set is unmeasured).
- **yash** was tested in the C locale (the default in minimal containers); with a UTF-8 locale the same files pass. Real exposure depends on users running yash at all.
- **Version-specific claims**: BusyBox wget 1.37 rejects `--https-only` and `--secure-protocol` (alpine:3.22, 2026-10-10); cargo-dist 0.33.0 template; curl `--retry` regression note is the upstream comment at DOTNET:1209 (curl#1755), not re-measured; shellcheck 0.11.0; PowerShell 5.1.26100.9444.
- **Count basis**: "17 sh installers" = 4 fleet-authored, 2 vendored, 11 exemplar; the exemplar `acme.sh` is a client whose installer path is one function, so its cells are file-level.
