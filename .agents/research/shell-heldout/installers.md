---
title: "Held-out round: install.sh and install.ps1 pairs"
topic: SH-INST and PS-SEC rule families tested on 10 out-of-corpus installers (4 sh+ps1 pairs, 6 sh-only)
agent: sonnet (wave 4, subarea heldout/installers)
model: sonnet
date_researched: 2026-10-11
sources_count: 24
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/installers/ (this round: heldout/ below it)
scope: |
  Tests the 20 SH-INST and PS-SEC MUST rules of shell-installer.md (resting on 17 corpus installers) against 10 installers that were not in the corpus:
  just, fnm, volta, bun (sh+ps1), helm, pixi (sh+ps1), ollama (sh+ps1), tailscale, coder, pnpm (sh+ps1). Network stubbed; kit run on 11 POSIX interpreters,
  4 bash cells, pwsh 7.6.6 (Fedora 43 on WSL, ocx toolchain) and Windows PowerShell 5.1.26100.9444. Third-party defects are reported here only (topic map X55); nothing was filed.
  macOS claims are read only. Windows: fixtures staged under C:\Users\ecom\shell-wintest only; no real installer ran on the Windows host.
---

# Held-out round: install.sh and install.ps1 pairs

Retrieval date for every source and run: 2026-10-11. `HX` below is `/home/mherwig/.cache/research-lang/shell-tools/fixtures/installers/heldout`. Clones are at
`/home/mherwig/.cache/research-lang/heldout/shell/<owner>__<repo>`; SHAs are pinned in `HX/data/shas.txt`. Citation form: `repo@sha12:path:line`.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The ten installers](#1-the-ten-installers)
   2. [Verdict per rule](#2-verdict-per-rule)
   3. [Truncation: only bun fails, and the kit needed a seed](#3-truncation-only-bun-fails-and-the-kit-needed-a-seed)
   4. [Integrity: seven of ten verify nothing](#4-integrity-seven-of-ten-verify-nothing)
   5. [TLS flags and BusyBox wget, including the tty-only break](#5-tls-flags-and-busybox-wget-including-the-tty-only-break)
   6. [https-only overrides](#6-https-only-overrides)
   7. [Platform mapping is not total anywhere](#7-platform-mapping-is-not-total-anywhere)
   8. [Signals and temp files: the trap check was blind](#8-signals-and-temp-files-the-trap-check-was-blind)
   9. [Root escalation: M-N-13 is load-bearing](#9-root-escalation-m-n-13-is-load-bearing)
   10. [Dialect and encoding gaps](#10-dialect-and-encoding-gaps)
   11. [PowerShell: install.ps1 results on two engines](#11-powershell-installps1-results-on-two-engines)
   12. [Signature roots of trust (M-N-14) and posh (M-N-16)](#12-signature-roots-of-trust-m-n-14-and-posh-m-n-16)
   13. [SH-INST-20 ten-row checklist, per installer](#13-sh-inst-20-ten-row-checklist-per-installer)
   14. [Classification of every finding](#14-classification-of-every-finding)
   15. [Third-party defects (report only)](#15-third-party-defects-report-only)
   16. [Decision: clean or not clean](#16-decision-clean-or-not-clean)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **Verdict: NOT CLEAN for both families.** No rule was refuted, but all 10 installers break SH-INST-05 and SH-INST-09, and the round found defects in the checks themselves (F2, F4, F6, F9, F15-F18, F20, F25) plus four gaps the rules do not name (F7 for ps1, F11, F21-F23).
- **The MUSTs held.** Every SH-INST/PS-SEC MUST that could be tested caught a real violation in a held-out installer or was met by one; none had to be dropped (section 2).
- **Truncation (SH-INST-01):** bun is the only installer whose sweep goes red (168 of 389 cuts leave `bun.zip` plus a half-state in the bash 3.2/4.4/5.2/5.3 cells). The other nine are cut-safe, and `just` and `helm` are cut-safe although linear (the install step comes last or follows verification).
- **Fix the truncation kit before trusting it:** `t-trunc.sh` must seed an old install, and the profile must pass `--force` when the installer refuses to overwrite. Un-seeded, `just` read as "vacuous" in every cell and a script that deletes the old binary then dies was invisible.
- **Integrity (SH-INST-03/04):** 7 of 10 verify nothing (just, fnm, volta, bun, pixi, ollama, coder); 8 of 10 install a tampered payload with rc 0 when the check is absent; helm and pnpm fail closed. `plant/nohash` and the held-out set agree.
- **TLS (SH-INST-05):** 0 of 10 probe `curl --help all`; only just passes `--proto =https --tlsv1.2` (`casey/just@a1951a5ff762:www/install.sh:61`), and its wget branch (`:63`) dies on BusyBox v1.37.0.
- **A tty-only BusyBox break exists:** pixi adds `--show-progress` only when stdout is a tty (`prefix-dev/pixi@98535e0857e2:install/install.sh:119`); BusyBox v1.37.0 rejects it. The non-tty run installs fine (real alpine:3.22 run), so the old t-flags scenario 2 is blind. New scenario 2t, plant and twin pair, fixes it.
- **https-only overrides (SH-INST-06):** bun (`GITHUB`) and pixi (`PIXI_REPOURL`, `PIXI_DOWNLOAD_URL`) accept `http://`; the PowerShell side has the same defect in ollama and pixi (`OLLAMA_DOWNLOAD_URL`, `PIXI_DOWNLOAD_URL`). Extend SH-INST-06 to ps1.
- **Platform (SH-INST-08):** no installer exits 7. fnm and bun fetch the wrong asset on unsupported CPUs (fnm: x64 zip for i686/riscv64; bun: x64-musl for armv7l/i686/freebsd). volta exits 0 having done nothing on 5 platforms.
- **The signal check was blind (SH-ERR-15/16 as used by SH-INST-20 row 5):** `t-trap.py` signals at the first network call, so an installer that looks up the version first (just, volta) is killed before its temp dir exists and reads GREEN. With `T_NTH=2`, just and volta leak; the new plant is RED at NTH=2 and a false GREEN at NTH=1.
- **Root escalation (M-N-13) is load-bearing.** Three escalation patterns exist among the 10 (blanket `$SUDO`: ollama, tailscale; probe-then-escalate: coder; escalate only the final copy: helm). `t-root` goes RED for ollama, tailscale and coder (default prefix), GREEN for coder with a user prefix. Promote M-N-13 to a rule (SH-INST-22 candidate).
- **PowerShell:** bun's `return 1` is swallowed in a CI step (rc 0); pixi's `exit 1` kills the interactive host; pixi's `finally` throws under StrictMode Latest and masks the real error; pnpm reads the platform from free-text `$PSVersionTable.OS` and fails on pwsh 7.6.6 on Fedora ("Platform could not be determined!").
- **PS-SEC-01 needs two amendments:** (a) a verified Authenticode signature with an anchored signer pin is an acceptable alternative to a hash (ollama `scripts/install.ps1:75-91`; plants "weak regex" and "no status check" go RED); (b) the hash must precede every path to extraction, not merely appear in the file (pnpm's v11 branch extracts unverified; `ast-sec2` UNVERIFIED-PATH).
- **Check fixes for PS-SEC:** the PS-SEC-10 grep flags `irm | iex` inside comment-based help (ollama, 6 hits): use the AST token check. The PS-SEC-06 grep matched `Tls12` by accident through its `Tls` prefix: use the rewritten pair `06a`/`06b`.
- **`check-iex-survival.ps1` deadlocked** (timeout 124) when the child's stderr pipe filled (pixi on 5.1, ci mode; a 200 KB flood plant). Async reads fix it; the original hangs, the fixed one is GREEN.
- **Existing-evidence discrepancy:** `plant/trailing.sh` is not reproduced RED by the unmodified kit or by the adapter (0 of 367 cuts partial in every cell), contradicting "caught by the byte tail only" in shell-installer.md (lines 70 and 552).
- **Signature roots of trust exist with stock tools (M-N-14, partial):** pnpm verifies an npm ECDSA registry signature with `openssl dgst -sha256 -verify` and an embedded key; ollama verifies Authenticode with `Get-AuthenticodeSignature` and a pinned subject. Neither is minisign/cosign.
- **Zero held-out installers** carry a `# Exit:` header (SH-INST-09), a test hatch (SH-INST-19) or retry flags (SH-INST-16): all three rules are universally unmet in this sample.
- **Bound on the claim:** one sample of 10, fixtures stubbed, no real macOS, no Windows host install, no non-validating BusyBox (busybox:1.37) run for SH-INST-07.

## Findings

### 1. The ten installers

Pinned at HEAD on 2026-10-11 (`HX/data/shas.txt`). Lines are `wc -l`.

| Installer | Repo@sha12 | Path | Lines | Shape | Pair |
|---|---|---|---|---|---|
| just | casey/just@a1951a5ff762 | `www/install.sh` | 181 | linear, bash | sh only |
| fnm | Schniz/fnm@86adc9676ceb | `.ci/install.sh` | 237 | functions then top-level run, bash | sh only |
| volta | volta-cli/volta@5eedd5fb2f68 | `dev/unix/volta-install.sh` | 395 | functions, last line a call, bash | sh only |
| bun | oven-sh/bun@6c1eb067e3c3 | `src/runtime/cli/install.sh`, `install.ps1` | 326 / 319 | linear, bash | pair |
| helm | helm/helm@dc56a44fee5a | `scripts/get-helm-3` | 350 | functions, ends `cleanup`, bash | sh only |
| pixi | prefix-dev/pixi@98535e0857e2 | `install/install.sh`, `install.ps1` | 263 / 246 | `{ ... } && __wrap__` group, sh | pair |
| ollama | ollama/ollama@eab97e9f92b9 | `scripts/install.sh`, `install.ps1` | 455 / 323 | `main` last, sh | pair |
| tailscale | tailscale/tailscale@3bb8a906c277 | `scripts/installer.sh` | 740 | `main` last, sh | sh only |
| coder | coder/coder@50c785cc6d75 | `install.sh` | 873 | `main "$@"` last, sh | sh only |
| pnpm | pnpm/get.pnpm.io@29fc8463b5b8 | `install.sh`, `install.ps1` | 636 / 484 | functions, `download_and_install \|\| abort`, sh | pair |

The pnpm sh installer runs as a copy with the npm signing key swapped for a test key (`HX/data/pnpm-install-testkey.sh`, diff = lines 44-45) so a validly signed registry can be served; the original is read-only.

### 2. Verdict per rule

Each MUST against the sample. "Held" means the rule caught a real violation or an installer met it; no rule was refuted.

| Rule | Result on the 10 | Check status |
|---|---|---|
| SH-INST-01 main-last | bun violates (168 of 389 cuts partial); 9 hold | check needs seed (3) |
| SH-INST-03 fail closed | 7 of 10 no check; helm and pnpm hold; tailscale delegates to the package manager | `t-tamper` correct; scope note (4) |
| SH-INST-04 honest label | 0 false claims (R7 grep GREEN on all 10) | grep correct |
| SH-INST-05 TLS flags | 10 of 10 fail the probe clause; 9 of 10 omit `--proto` | `t-flags` blind on tty (5) |
| SH-INST-06 https-only | bun, pixi violate | correct (6) |
| SH-INST-07 BusyBox refusal | 5 of 10 have a wget path; 0 of 5 mention BusyBox | static only, no behavioural run |
| SH-INST-08 total mapping | 0 of 9 platform-aware installers exit 7; fnm, bun wrong asset; volta silent | correct (7) |
| SH-INST-09 `# Exit:` | 0 of 10 | grep correct |
| SH-INST-11 `/dev/tty` | 10 of 10 pass (`t-tty`, none prompt under `curl \| sh`) | correct |
| SH-INST-12 user-space | ollama, tailscale, coder (default), helm (default) escalate | gap: policy (9) |
| SH-INST-20 checklist | filled for all 10 (13) | rows 5, 6 need kit fixes |
| PS-SEC-01 hash before extract | bun, pixi violate; ollama uses a signature; pnpm partial | grep is file-level (11) |
| PS-SEC-02 provenance | pnpm: registry signature is a provenance route; no other digest source | reading only |
| PS-SEC-03 honest claims | 0 false claims (grep GREEN) | grep correct |
| PS-SEC-04 safe zip | all 3 extractors use `Expand-Archive`; safe on pwsh 7.6.6 and 5.1.26100.9444 (zipcheck) | correct |
| PS-SEC-06 TLS guard | pnpm assigns `Tls12` unguarded at top level (`:257`) | grep false positive (11) |
| PS-SEC-07 iex form | 0 `.Content \| iex` | correct |
| PS-SEC-08 iex-safe body | all 4 leak into the session (leak.ps1); pixi additionally sets StrictMode | correct |
| PS-SEC-09 one guarded exit | pixi `exit` host-kill (repl RED); bun `return 1` swallowed (ci RED) | correct |
| PS-SEC-11 no policy gate | 0 hits | correct |

### 3. Truncation: only bun fails, and the kit needed a seed

**Result (dash 0.5.12 for posix profiles, bash 3.2/4.4/5.2/5.3 for bash profiles; `T_LINES=250`, last 60 bytes, `HX/out/t-trunc-*.txt`):** `partial_cuts=0` for just (244 cuts), fnm (300), volta (458), helm (413), pixi (326), ollama (518), tailscale (434), coder (355), pnpm (382). bun: `partial_cuts=168` of 389 in every bash cell; the first PARTIAL is `line-cut 150/326` leaving `./.bun/bin/bun ./.bun/bin/bun.zip` beside the seeded old install (`oven-sh/bun@6c1eb067e3c3:src/runtime/cli/install.sh`, linear script, last line `info_bold "  bun --help"`).

Why the nine are safe is structural, not accidental: helm verifies the checksum before `cp` (`helm/helm@dc56a44fee5a:scripts/get-helm-3:84-86,192`), just copies only after a complete extraction (`casey/just@a1951a5ff762:www/install.sh:164-179`), and ollama, tailscale and coder are `main`-last (`ollama@eab97e9f92b9:scripts/install.sh` last line `main`; `tailscale@3bb8a906c277:scripts/installer.sh` last line `main`; `coder@50c785cc6d75:install.sh` last line `main "$@"`).

**Two kit defects found, both fixed in the adapter:**

1. *No old install.* The sweep seeds only `~/.local/bin/old`. A linear script that removes the previous binary and then dies shows no PARTIAL because the seeded state never contained the binary. Fix: per-profile `p_seedold`, called from `seed()`. Evidence: with the seed, `plant/linear.sh` reproduces `partial_cuts=4 of 85` and 11 of 11 cells RED (`HX/out/validate.log`); the pre-seed run reported 0.
2. *just refuses to overwrite.* With a seeded `just`, the uncut baseline exits 1 ("`.../home/bin/just` already exists", `casey/just@a1951a5ff762:www/install.sh:173`), so every cell printed `VACUOUS` (counted as RED by the summary). Fix: `P_ARGS=--force`; baseline `rc=0`, 244 cuts, 0 partial in the 4 bash cells.

**Vacuous cells are not findings about the installer**, and the summary line counts them as RED. The red=1 of 11 for pixi, tailscale, ollama (x2) and pnpm are all vacuous baselines: posh 0.14.1 lacks `hash` (pixi) and `type` (tailscale, `/dev/stdin:740: type: not found`), ksh93u+m lacks `local` (ollama, `main[120]: require[24]: local: not found`, rc 127), yash 2.52 cannot read pnpm's UTF-8 in the C locale. See section 10.

**Discrepancy.** `plant/trailing.sh` (the "byte tail only" plant) is `red=0 of 11` in the adapter (`HX/out/validate.log`, row 3) and 0 of 367 in the unmodified kit, so the claim at `shell-installer.md:70` is not reproduced.

### 4. Integrity: seven of ten verify nothing

Row B of `t-tamper` removes every hash tool; row A tampers the payload. Output `HX/out/t-tamper-*.txt` (11 cells for posix profiles, 4 bash cells).

| Installer | A tampered payload | B no hash tool | Class |
|---|---|---|---|
| just, fnm, volta, bun, pixi, ollama, coder | installed, rc 0 | installed, rc 0 | none (no check exists) |
| helm | refused rc 1 | refused rc 1 (openssl required, `:84-86`) | sidecar, same origin (`VERIFY_CHECKSUM` default true `:23`; `VERIFY_SIGNATURES` default false `:24`) |
| tailscale | installed, rc 0 (apt-get stubbed; the package manager's own gpg check is out of scope) | installed | gpg keyring via apt/dnf, delegated |
| pnpm | refused rc 1 | see below | registry manifest sha512 plus ECDSA signature with embedded key |

**pnpm needs a precise reading.** The shipped profile removes only `openssl` for row B, and row B went RED because `sha512sum` remained: the installer printed "checking the download against its checksum only, not the npm signature" and installed an *untampered* payload (`pnpm/get.pnpm.io@29fc8463b5b8:install.sh:186`). That is honest labelling (SH-INST-04), not a fail-open hash tool. With `openssl`, `sha512sum` and `shasum` all removed (profile `pnpm-allhash`), A, B and C all refuse (`HX/out/t-tamper-pnpm-allhash.txt`: "No usable SHA-512 tool was found", rc 1). The weaker state is real but narrow: without openssl the signature is skipped and the sha512 comes from the same registry response as the tarball, so a hostile registry passes.

Real-world run (alpine:3.22, BusyBox v1.37.0 wget, no curl, no openssl, `HX/out/r8-heldout.txt`): helm refuses with "In order to verify checksum, openssl must first be installed" (rc 1): safe, unusable on stock alpine.

Corroboration against a real Windows script: `HX/ps/tamper_real.sh` served a tampered zip to the unmodified pixi `install.ps1` on pwsh 7.6.6 and 5.1.26100.9444: `extracted-file=[EVIL-BINARY (tampered release asset)]`, `hits=1` on both (`HX/out/tamper-real.txt`).

### 5. TLS flags and BusyBox wget, including the tty-only break

**Curl hop, `t-flags` row 1 (`HX/out/t-flags-*.txt`).** 0 of 10 probe `curl --help all` (`help-probe=no`). Only just passes both flags on all its curl calls (`casey/just@a1951a5ff762:www/install.sh:61`, "all 2 download calls carry --proto =https and --tlsv1.2"). Download-call counts without the flags: fnm 1, volta 2, bun 1, helm 3, pixi 1, ollama 2, tailscale 4, coder 2, pnpm 5.

**Wget hop.** Real alpine:3.22 BusyBox v1.37.0 `wget` accepts `--no-verbose`, `--tries`, `--no-check-certificate`, `--output-document`, `--header`, `--user-agent`, `--timeout`; it rejects `--show-progress`, `--https-only`, `--secure-protocol`, `--netrc` and `--retry-connrefused` (long-option table, [busybox 1.37.0 networking/wget.c:1500-1523](https://raw.githubusercontent.com/mirror/busybox/1_37_0/networking/wget.c); measured `HX/bbopts.sh`).

| Installer | BusyBox v1.37.0 wget (real alpine:3.22 or bash:5.2 image) |
|---|---|
| just | `wget --https-only --secure-protocol=TLSv1_2` (`:63`) rejected; usage text, rc 1, nothing installed |
| pixi | non-tty: installs (real download, rc 0). tty: `WGET_OPTIONS="--show-progress"` (`:119`) rejected |
| helm | refuses first (no openssl), loud |
| pnpm | installs pnpm 12.11.2, then `pnpm setup` fails `ERR_PNPM_UNKNOWN_SHELL` because `$SHELL` is unset in the container; rc 1 after a partial install (`pnpm/get.pnpm.io@29fc8463b5b8:install.sh:442,469`) |
| tailscale | `ok` in both t-flags rows (read, not run: it would call `apk add` as root) |

**The tty-only defect is the key new fact.** pixi chooses its wget options by `[ -t 1 ]`; scenario 2 of `t-flags` runs without a tty and reports `ok`. A new scenario 2t re-runs under a pseudo-terminal (`ptyrun.py` with `PTY_WGET_ONLY=1`) with the stub calibrated to the measured option set. Result for pixi in the hx:deb12 cell: `RED 2t busybox wget on a tty: WGET-REJECTED: REJECT show-progress`.

Incorrect (the pixi shape), `HX/plant/wget-tty.sh:9`:

```sh
if [ -t 1 ]; then W="--show-progress"; else W="--no-verbose"; fi
wget $W -O "$tmp/a.tar.gz" "$BASE/toolx-1.2.3-x86_64-unknown-linux-gnu.tar.gz"
```

Correct, `HX/twin/wget-tty.sh:9` (the same options on and off a tty, all in the BusyBox set):

```sh
if [ -t 1 ]; then W="-S"; else W="-q"; fi
wget $W -O "$tmp/a.tar.gz" "$BASE/toolx-1.2.3-x86_64-unknown-linux-gnu.tar.gz"
```

`t-flags.sh` on the plant: row 2 `ok`, row 2t `RED ... REJECT show-progress`, exit 1; on the twin: rows 2 and 2t `ok`, `violations=0` (`HX/out/wgettty.txt`, dash 0.5.12, BusyBox v1.37.0 option set).

### 6. https-only overrides

`t-flags` row 4 sets each installer's override variable to `http://` and logs the first request.

- bun: `GITHUB=${GITHUB-"https://github.com"}` (`oven-sh/bun@6c1eb067e3c3:src/runtime/cli/install.sh:104`) → `curl --fail --location --progress-bar --output .../bun.zip http://downloads.e...`, rc 0.
- pixi sh: `PIXI_REPOURL` (`prefix-dev/pixi@98535e0857e2:install/install.sh:34`) and `PIXI_DOWNLOAD_URL` (`:67,70`) → `curl -SL --silent http://...`; both RED.
- ollama ps1: `$DownloadBaseURL = if ($env:OLLAMA_DOWNLOAD_URL) {...}` (`ollama/ollama@eab97e9f92b9:scripts/install.ps1:58`, comment `:57` "for developer testing only") → plain `http` request observed on 5.1.26100.9444 (`HX/out/httpcheck.txt`; the pwsh 7.6.6 run fails earlier on Linux with `Cannot bind argument to parameter 'Path' because it is null`, so no request is made there).
- pixi ps1: `$Env:PIXI_DOWNLOAD_URL` (`prefix-dev/pixi@98535e0857e2:install/install.ps1:174`) → `GET /x.zip` on both engines.

The rule text ("including every URL an environment variable can override") fits sh; it never says ps1. 8 of the 10 sh installers have no overridable download URL (row 4 n/a). The twin shape asserts the scheme once:

```powershell
$u = if ($env:TOOLX_DOWNLOAD_URL) { $env:TOOLX_DOWNLOAD_URL } else { 'https://example.invalid/toolx.zip' }
if ($u -notmatch '^https://') { throw "refusing non-https download URL: $u" }   # twin: no request is made for http://
```

### 7. Platform mapping is not total anywhere

`t-platform` runs 14 stubbed scenarios (`HX/out/t-platform-*.txt`). `rc7=0` for every installer.

| Installer | Wrong or silent outcomes |
|---|---|
| fnm | `linux i686` and `linux riscv64` both request `.../latest/download/fnm-linux.zip` (the x64 build) at `Schniz/fnm@86adc9676ceb:.ci/install.sh:55-66` (`*) FILENAME="fnm-linux"`), rc 0 |
| bun | `linux armv7l`, `linux i686`, `freebsd amd64` request `bun-linux-x64-musl.zip`, rc 0; riscv64 refused |
| volta | rc 0 and no archive requested on `armv7l`, `i686`, `riscv64`, `mingw64`, `freebsd`: silent success (WRONG exit0) |
| pixi | loud 404 on armv7l, i686, freebsd (asset name built from `uname -m`) |
| coder | loud 404 on mingw64 and freebsd; refuses i686/riscv64 |
| just, helm, ollama, pnpm | refuse loudly with rc 1 |
| tailscale | package-manager dispatch from `/etc/os-release`; the 14-scenario table does not apply (`scenarios=0`) |

Rosetta rows (`darwin x64 under rosetta (oid 1)`, `oid 0`) produced no mismatch for just, bun, pixi, ollama, pnpm; the kit prints only exceptions. The row-4 aid grep (`sysctl[^|]*||[^|)]*|`) has 0 hits in all 10; bun is the only installer that calls `sysctl`, and it tests by value: `[[ $(sysctl -n sysctl.proc_translated 2>/dev/null) = 1 ]]` (`oven-sh/bun@6c1eb067e3c3:src/runtime/cli/install.sh:97`). fnm refuses macOS without `--force-install` (brew path). All macOS behaviour is read only.

### 8. Signals and temp files: the trap check was blind

`t-trap.py` signals the process group once the stub log shows a network call. The original (and the adapter) fire at the first call.

Failure of the check: just resolves the tag with `curl ... releases/latest` first and only then runs `td=$(mktemp -d ...)` (`casey/just@a1951a5ff762:www/install.sh:120,164`). The signal lands before `td` exists, so `tmp leaked=none` and `GREEN`. Same for volta (`mktemp -d` at `volta-cli/volta@5eedd5fb2f68:dev/unix/volta-install.sh:333`).

Fix: `T_NTH` (default 1) signals at the Nth network call. Planted and twin (`HX/plant/trap-late.sh`, `HX/twin/trap-late.sh`; dash 0.5.12):

| Run | INT | TERM | HUP |
|---|---|---|---|
| plant, `T_NTH=2` | RED, `leaked=['tmp.hDWV2KN2AA']` | RED | RED |
| twin (`trap 'rm -rf "$tmp"' EXIT`, INT/TERM/HUP exit 130/143/129), `T_NTH=2` | GREEN rc 130 | GREEN rc 143 | GREEN rc 129 |
| plant, `T_NTH=1` (default) | GREEN (false) | GREEN (false) | GREEN (false) |

Held-out results at `T_NTH=2` (`HX/out/traplate-real.txt`):

- just, volta: RED, temp dir leaked on INT, TERM and HUP. With the default, both read GREEN.
- helm, coder, tailscale: GREEN (helm has `trap fail_trap EXIT`; coder and tailscale create no TMPDIR files).
- pnpm: RED on status. `trap "rm -rf '$tmp_dir'" EXIT INT TERM HUP` (`pnpm/get.pnpm.io@29fc8463b5b8:install.sh:417`) cleans up but the script continues and exits `rc=1`, not 130/143/129 (the known "trap returns" shape, SH-ERR-16).
- fnm, pixi, ollama: RED at the default (temp dir leaked on INT/TERM/HUP, dash 0.5.12 for pixi and ollama, bash for fnm). fnm and volta also leak the temp dir on the *success* path (baseline `leaked-tmp=1`; `fnm@86adc9676ceb:.ci/install.sh:98`, `volta@5eedd5fb2f68:dev/unix/volta-install.sh:333`).
- bun: no trap; the half-written `~/.bun/bin/bun.zip` is outside `$TMPDIR`, so only the truncation sweep sees it. coder: the working directory is `$CACHE_DIR/tmp` (`coder@50c785cc6d75:install.sh:427`), also outside `$TMPDIR`: `t-trap` does not look there.

### 9. Root escalation: M-N-13 is load-bearing

Four held-out installers escalate by default; three different ways. `t-root` runs as uid 1000 with a recording `sudo` stub (`HX/out/t-root-*.txt`):

| Pattern | Installer | Evidence |
|---|---|---|
| Blanket `$SUDO` before each mutating command | ollama | `SUDO="sudo"` at `:117`, `$SUDO install -o0 -g0 -m755 -d $BINDIR` (`:169`), `$SUDO rm -rf` (`:166`); BINDIR derived from `$PATH`; `RED escalated 1 time(s)` |
| Same, dispatch by `/etc/os-release` | tailscale | `SUDO=""/"sudo"/"doas"` (`tailscale@3bb8a906c277:scripts/installer.sh:513-522`), first call `sudo mkdir -p --mode=0755 /usr/share/keyrings`; RED |
| Probe writability, escalate that step, with a `su - -c '$*'` fallback | coder | `STANDALONE_INSTALL_PREFIX=${...:-/usr/local}` (`:429`), `sudo_sh_c` if `[ ! -w ]` (`:587`); `sudo mkdir -p /usr/local/bin`, RED. With `STANDALONE_INSTALL_PREFIX=$HOME/.local` (profile `coder-user`) GREEN, `sudo-calls=0` |
| Escalate only the final copy; opt-out flag | helm | `USE_SUDO` default true (`helm@dc56a44fee5a:scripts/get-helm-3:21`), `runAsRoot cp ... $HELM_INSTALL_DIR` (`:192`), `--no-sudo` (`:327`) |

Because ollama, tailscale and coder (default) fail to install as a normal user and helm silently needs sudo for `/usr/local/bin`, SH-INST-12's "user-space only" scope leaves 4 of 10 real installers outside any rule. Row 9 of the consolidation is not enough. Candidate rule SH-INST-22 below. Also noteworthy: coder's fallback `sh_c "su - -c '$*'"` (`coder@50c785cc6d75:install.sh`, `sudo_sh_c`) interpolates arguments into single quotes; an argument containing `'` breaks the quoting.

Decision on **M-N-13: load-bearing**, because the sample contains the three escalation shapes and the existing MUST (SH-INST-12) is silent on them.

### 10. Dialect and encoding gaps

From the 11-cell matrix (`HX/out/t-trunc-*.txt`, `t-parse-*.txt`) and the dialect rules (SH-DIAL-04, SH-DIAL-17, SH-GATE-16):

- ollama uses `local` (`ollama@eab97e9f92b9:scripts/install.sh:24`): baseline rc 127 on ksh93u+m 2023 and 1.0.10 (`local: not found`). SH-DIAL-17 flags it.
- pixi uses `hash`, tailscale uses `type`: both missing from posh 0.14.1 (pixi: "you need either 'curl' or 'wget'"; tailscale: `type: not found`). Posh is a conditional member of SH-DIAL-04; the two baselines are vacuous there.
- pnpm has 5 non-ASCII lines (em dash, `grep -P '[^\x00-\x7F]'` count 5, e.g. `:186`): yash 2.52 in the C locale fails with "Invalid or incomplete multibyte or wide character" (the only red in `t-parse`, 1 of 11). SH-GATE-16 (ASCII for installers) covers it.
- bun, fnm, volta, helm use bash-only syntax (`[[`, arrays) and run under bash cells only; that is not a defect while the documented delivery is `| bash`.

### 11. PowerShell: install.ps1 results on two engines

Engines: pwsh 7.6.6 (Fedora Linux 43 on WSL, ocx toolchain) and Windows PowerShell 5.1.26100.9444. Four installers: bun, pixi, ollama, pnpm. Fixtures staged under `C:\Users\ecom\shell-wintest\heldout-ps`; real installers were not run on the Windows host.

**R7 greps, X1 git-fed form** (`HX/out/r7-heldout.txt`; held tree vs plant vs twin): PS-SEC-03, -04, -07, -08d, -08bc, -11 GREEN on the held tree; PS-SEC-01 RED (bun, pixi); PS-SEC-05 RED (`pixi-install.ps1:205`, `pnpm-install.ps1:332`); PS-SEC-06 RED (`pnpm-install.ps1:257`, a false positive of the grep, see below); PS-SEC-10 RED (ollama, 6 hits). Every plant RED, every twin GREEN.

**Class: grep false positives**
- PS-SEC-10: the six ollama hits are `irm https://ollama.com/install.ps1 | iex` inside a `<# ... #>` help block (`ollama@eab97e9f92b9:scripts/install.ps1:10-35`); there is no executable `iex`. The AST check `INVOKE-EXPRESSION-TOKEN` (`ast-sec2.ps1`) flags only a `CommandAst` named `Invoke-Expression`/`iex`: GREEN on ollama, RED on the real-iex plant.
- PS-SEC-06: `SecurityProtocolType\]::(Tls13|Tls11|Tls|Ssl3)` matches `Tls12` through the `Tls` alternative; the pnpm hit was accidental. The rewrite splits the check (r7c): 06a (a named legacy/ambiguous member) is GREEN on pnpm; 06b (an assignment in a file that never tests `PSEdition`) is RED on pnpm (a true positive: `pnpm/get.pnpm.io@29fc8463b5b8:install.ps1:257` assigns `[Net.SecurityProtocolType]::Tls12` unconditionally at top level, which persists in the caller's session under `iex`).

**PS-SEC-09, iex survival** (`check-iex-survival.ps1`, `HX/out/iexmat.txt`; failure path forced by environment so nothing installs):

| Installer | repl (interactive host) | ci (non-interactive step) |
|---|---|---|
| pixi | RED, host terminated (child exit 1, host marker never printed), both engines | GREEN step failed loudly |
| bun (guard-forced copy) | GREEN | RED: failure swallowed (step exit 0, host marker printed), both engines |
| ollama | GREEN | GREEN, step failed loudly (failure path forced; the script is Windows-oriented) |
| pnpm | GREEN | GREEN |

pixi's `exit 1` sits in a top-level `catch` (`prefix-dev/pixi@98535e0857e2:install/install.ps1:208`), flagged by the new AST check `EXIT-TOPLEVEL-UNGUARDED` in a file that never reads `$PSCommandPath`. bun's failures are `return 1` at many sites, which an `irm | iex` step swallows ([about_Return](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Return.md), ms.date 01/18/2026, describes `return` as leaving the current scope, not the host). The bun file lacks the arch guard on Linux, so a copy where only the `$Arch` line differs (`HX/ps/installers/bun-guard.ps1`) was used.

**Check defect:** `check-iex-survival.ps1` deadlocked (timeout 124) when the child wrote more than the pipe buffer to stderr (pixi in ci mode on 5.1, and `plant/stderr-flood.ps1`). Reading both streams with `ReadToEndAsync` fixes it; verified: the original hangs on the flood plant, the fixed script is GREEN.

**PS-SEC-01 hash before extract** (`hash-order.ps1`, both engines): `nohash` RED (tampered archive extracted, content `EVIL-BINARY`), `failopen` RED, `closed` and `closed-empty` GREEN. On the held-out files: bun and pixi have no hash at all; the unmodified pixi installer extracted a tampered zip (`tamper-real.txt`, both engines). ollama has no hash but verifies an Authenticode signature (below). pnpm hashes with `.NET SHA512.ComputeHash` (`:198-201`) and verifies an ECDSA signature on PowerShell 7+ only; `Test-NpmSignature` returns `$null` on PowerShell < 7 (`:171-177`), where only the sha512 is checked.

**New class A: an unverified branch** (`pnpm-install.ps1:332` v11 branch, `Expand-Archive -Path $tempArchive`). The file contains a hash call, so the presence grep passes; `ast-sec2` `UNVERIFIED-PATH` follows the path to the extract call and finds no verified predecessor. Plant `plant2/branch-unverified.ps1` RED, twin `twin2/branch-verified.ps1` GREEN (both engines). Recorded false positive: `UNVERIFIED-PATH (Start-Process)` at `ollama-install.ps1:232` starts the *local* uninstaller, a reading step clears it.

**New class B: Authenticode as the verification** (`ollama/ollama@eab97e9f92b9:scripts/install.ps1:75-91`, `Test-Signature` with `O=Ollama Inc.` pinned, anchored). `authenticode.ps1` mocks `Get-AuthenticodeSignature` (a function shadows the cmdlet) and, on Windows, runs the real cmdlet. Pinned variant: good accepted, lookalike/tampered/unsigned refused, GREEN on both engines. Plant `weakregex` (unanchored `Ollama`): the lookalike subject is accepted, RED. Plant `nostatus` (subject checked, `Status -eq 'Valid'` not): a tampered-hash signature is accepted, RED. [Get-AuthenticodeSignature](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Security/Get-AuthenticodeSignature.md) is Windows-only; on Linux the cmdlet is unavailable, which is why only the mock ran there.

**New class C: platform from free text.** pnpm switches on `$PSVersionTable.OS` with patterns `Darwin*`, `macOS*`, `Linux*`, `Ubuntu*` (`pnpm@29fc8463b5b8:install.ps1:31-46`; a comment even notes that 7.6 changed the macOS string). pwsh 7.6.6 on Fedora reports `Fedora Linux 43 (WSL)`, no pattern matches, and the real installer prints `Platform could not be determined! Only Windows, Linux and MacOS are supported.` (`iexmat.txt:78-80`). Plant `plant2/os-switch.ps1` throws on 7.6.6 and on 5.1; twin `twin2/os-isvar.ps1` (`$IsWindows`, `$IsMacOS`, `$IsLinux`, 5.1 fallback via `PSVersion.Major -lt 6`) prints `platform=linux` on 7.6.6 and `platform=win32` on 5.1.

**New class D: `finally` under StrictMode.** pixi sets `Set-StrictMode -Version Latest` (`:31`) and cleans up `$ZIP_FILE` in `finally` (`:211`) a variable it assigns only inside `try`. [Set-StrictMode](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/Set-StrictMode.md) makes reading it an error, and [about_Try_Catch_Finally](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Try_Catch_Finally.md) (ms.date 04/02/2026) states a `finally` block also runs when an `exit` keyword stops the script, so the cleanup error replaces the real failure. `finally-masks.ps1` on the plant: `RED cleanup error masks the failure: The variable '$zip' cannot be retrieved because it has not been set.` (both engines); on the twin (initialised before `try`, guarded in `finally`): GREEN.

**PS-SEC-08 leak:** all four installers change the caller's session (`leak.ps1`): ollama leaves 8 functions and 3 variables, pixi 5 functions, 6 variables and StrictMode on, pnpm sets `$ErrorActionPreference = 'Stop'` and leaves 6 variables, bun leaves `$Arch` (pwsh 7.6.6; the 5.1 pixi run returned a WSL interop error and was not repeated, the plant `leak-global.ps1` is RED and twin `leak-scoped.ps1` GREEN on both engines).

**PS-SEC-04, zip-slip:** `zipcheck.ps1 -Method ExpandArchive` against `zip-slip`, `zip-slip-backslash`, `zip-slip-nested` writes nothing outside the destination on pwsh 7.6.6 and 5.1.26100.9444 (`HX/out/ziprun.txt`), matching [Expand-Archive](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Archive/Expand-Archive.md) (ms.date 04/01/2026) which says `-LiteralPath` is used exactly as typed and `-Path` interprets wildcards. `Manual` stays RED. PS-SEC-05 (`-LiteralPath`): bun `:191` (positional), pixi `:205`, pnpm `:332`: `ast-sec.ps1` RED (3), same on both engines.

### 12. Signature roots of trust (M-N-14) and posh (M-N-16)

M-N-14 is partly answered: two held-out installers verify a signature with only stock tooling, and the checks for them are runnable.
- pnpm: ECDSA over `name@version:integrity` using the public key embedded in the script, `openssl dgst -sha256 -verify` (`pnpm/get.pnpm.io@29fc8463b5b8:install.sh:129-131`); an unexpected `keyid` aborts ("signed with an unexpected npm key"). Background: [npm: verifying registry signatures](https://docs.npmjs.com/verifying-registry-signatures). Needs `openssl`; absent, it degrades to the same-origin sha512 and says so.
- ollama: `Get-AuthenticodeSignature`, Windows only.
- Not found: minisign or cosign verification with a stock tool (`HX/out/` shows 0 of 10 call either).

M-N-16 (posh truncation): the original vacuity has a mechanical cause, which the adapter removes. posh 0.14.1 rejects `-s` ("unknown option"), so a pipe-fed `posh -s --` never runs the script; `t-trunc.sh` line 9 now uses `/dev/stdin` for posh. Result on the validation twins: `ref/install.sh` 0 of 11 partial, `linear.sh` RED 11 of 11 (posh cell included). Separate from that, pixi (`hash`) and tailscale (`type`) are vacuous on posh because the installers themselves use builtins posh lacks.

### 13. SH-INST-20 ten-row checklist, per installer

Rows as in shell-installer.md lines 335-348. R1 TLS flags on the archive hop; R2 digests embedded; R3 fail-open hash tool; R4 Rosetta precedence; R5 signals; R6 truncation guard; R7 rendered file parses on every shell (`sh -n`/`t-parse`); R8 ps1 hash; R9 `--proto` hops; R10 generator pin. "n/a" means the row does not apply (no check, no ps1, hand-written). None of the 10 is generated (no `dist-manifest.json`), so R10 is n/a for all.

| Installer | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 |
|---|---|---|---|---|---|---|---|---|---|---|
| just | partial: both flags, no probe; wget branch rejected by BusyBox | none | n/a | ok | RED at call 2 (no trap, `mktemp` `:164`) | ok, 0/244 | ok | n/a | 2 of 2 | n/a |
| fnm | FAIL | none | n/a | ok | RED (leak, also on success) | ok, 0/300 | ok | n/a | none | n/a |
| volta | FAIL | none | n/a | ok | RED at call 2 (also success path) | ok, 0/458 | ok | n/a | none | n/a |
| bun | FAIL | none | n/a | ok (by value) | no trap; `bun.zip` left | FAIL, 168/389 | ok | FAIL (no hash) | none | n/a |
| helm | FAIL (3 calls) | sidecar, same origin | closed | ok | GREEN | ok, 0/413 | ok | n/a | none | n/a |
| pixi | FAIL; tty `--show-progress` | none | n/a | ok | RED (EXIT-only trap, leaked `.pixi_install.*`) | ok, 0/326 | ok | FAIL (no hash, `exit 1`) | none | n/a |
| ollama | FAIL | none (sh); Authenticode pin (ps1) | n/a | ok | RED (leak) | ok, 0/518 | ok | partial: signature, no hash; override over http | none | n/a |
| tailscale | FAIL (4 calls) | gpg via package manager | n/a (delegated) | ok | GREEN | ok, 0/434 | ok | n/a | none | n/a |
| coder | FAIL | none | n/a | ok | GREEN at TMPDIR; `$CACHE_DIR/tmp` unchecked | ok, 0/355 | ok | n/a | none | n/a |
| pnpm | FAIL (5 calls) | manifest sha512 plus embedded-key signature | closed when no digest tool; signature skipped without openssl (labelled) | ok | RED (status 1, not 130/143/129) | ok, 0/382 | RED on yash (C locale, 5 non-ASCII lines) | partial: sha512 plus ECDSA on PS 7+, PS < 7 none, v11 branch unverified | none | n/a |

Aid-grep counts (`HX/out/checklist.txt`): `# Exit:` header 0 of 10; `_INSTALL_SH_PRINT`/`INSTALL_BASE_URL` hatch 0 of 10; `--retry` 0 of 10; `--proto` only in just; `trap` statements just 0, fnm 0, volta 0, bun 0, helm 1, pixi 1, ollama 3, tailscale 0, coder 0, pnpm 1.

### 14. Classification of every finding

| # | Finding | Class | Disposition |
|---|---|---|---|
| F1 | bun linear, 168/389 partial | existing: SH-INST-01 | rule holds |
| F2 | `t-trunc` has no old install; just baseline vacuous | check fix | seed + `--force`; verified RED/GREEN (G1) |
| F3 | 7/10 no integrity; 8/10 install tampered | existing: SH-INST-03/04 | rule holds |
| F4 | pnpm row B RED when only openssl removed | check fix (profile) | pnpm-allhash profile is the true row B; G6 scope note |
| F5 | 0/10 probe `--help all`; 9/10 no `--proto` | existing: SH-INST-05 | rule holds |
| F6 | wget flag set differs by tty (pixi) | check fix + new clause | scenario 2t, G3 |
| F7 | http overrides (bun, pixi sh; ollama, pixi ps1) | existing: SH-INST-06 (sh); new class (ps1) | extend rule to ps1, G4 |
| F8 | fnm/bun wrong asset, volta silent exit 0 | existing: SH-INST-08 | rule holds |
| F9 | `t-trap` fires before temp dir exists | check fix | `T_NTH`, G2 |
| F10 | traps: fnm/pixi/ollama leak; pnpm returns status 1 | existing: SH-ERR-15/16 | rule holds |
| F11 | escalation shapes | new class | SH-INST-22, G5 |
| F12 | ollama `local`; pixi `hash`, tailscale `type` | existing: SH-DIAL-17, SH-DIAL-04 | rule holds |
| F13 | pnpm non-ASCII, yash C locale | existing: SH-GATE-16 | rule holds |
| F14 | 0/10 header, hatch, retry | existing: SH-INST-09/19/16 | rule holds |
| F15 | PS-SEC-10 grep hits help-comment `iex` | check fix | AST token check, G10 |
| F16 | PS-SEC-06 grep hits `Tls12` | check fix | 06a/06b, G13 |
| F17 | file-level hash grep passes pnpm's unverified branch | check fix | path-level AST, G8 |
| F18 | `exit` top level (pixi) not seen by `EXIT-IN-FUNCTION` | check fix | `EXIT-TOPLEVEL-UNGUARDED`, G9 |
| F19 | bun `return 1` swallowed | existing: PS-SEC-09 | rule holds |
| F20 | check-iex-survival stderr deadlock | check fix | async reads |
| F21 | Authenticode instead of hash | new class | PS-SEC-01 alternative, G7 |
| F22 | platform from `$PSVersionTable.OS` | new class | G11 |
| F23 | StrictMode plus `finally` masks failure | new class | G12 |
| F24 | `trailing.sh` not red | evidence discrepancy | report, no rule change |
| F25 | R7 greps contain `|` inside `-E` patterns (PS-SEC-05, -06, -08bc, -10; SH-INST-17) | check fix (shape) | rewrite to one `-e` per alternative |

### 15. Third-party defects (report only)

Per topic map X55 (the program files nothing), recorded for the consolidation:
- pixi: ps1 `exit 1` kills the host (`install/install.ps1:208`), `$ZIP_FILE` read in `finally` under StrictMode (`:211`), no hash; sh `--show-progress` on a tty breaks BusyBox; http-accepting `PIXI_REPOURL`/`PIXI_DOWNLOAD_URL`; leaks `.pixi_install.*` on signals.
- pnpm: ps1 fails on pwsh 7.6.6 on Fedora (platform from `$PSVersionTable.OS`); unguarded `Tls12`; v11 branch extracts unverified; sh `trap` returns status 1; `pnpm setup` aborts without `$SHELL` after the install completed.
- bun: sh linear (partial `bun.zip` on a cut), `GITHUB` http override, wrong asset on armv7l/i686/freebsd; ps1 `return 1` swallowed.
- volta: exits 0 after doing nothing on 5 platforms; leaks the temp dir on success.
- fnm: wrong asset on i686/riscv64; leaks the temp dir on success.
- just: wget branch dies on BusyBox; GitHub REST API for "latest" (`:120`), which its own README documents as rate limited (`README` lines 382-410 describe `--tag`/`GITHUB_TOKEN` workarounds).
- coder: GitHub releases REST list (`:117`); `su - -c '$*'` quoting; default prefix needs root.
- ollama: ps1 `OLLAMA_DOWNLOAD_URL` over http; `local` on ksh93u+m; blanket `$SUDO`.
- tailscale: `type` not on posh (read-only issue: posh is conditional).
- helm: `$EUID`-based sudo even when the target is writable.

### 16. Decision: clean or not clean

**SH-INST: NOT CLEAN.** The rules held, but (a) three of the checks that the rules cite (`t-trunc`, `t-trap`, `t-flags`) returned false GREEN on plants that the held-out installers resemble, (b) SH-INST-12 does not cover 4 of 10 installers, and (c) SH-INST-07 has no behavioural check against the sample. Fixes are small and each was run RED/GREEN (G1-G6).

**PS-SEC: NOT CLEAN.** Four new classes (https-only override, Authenticode alternative, platform detection, `finally` masking), two grep false positives, one file-level check that passes an unverified branch, and a hang in the iex-survival check.

**M-N-13: load-bearing (promote to SH-INST-22).** M-N-14: partly answered (section 12). M-N-16: the mechanism is `-s`; fixed in the adapter, not yet in the shipped kit.

## Normative guidance candidates

Numbering is local to this round. Each states: rule, rationale, how a reviewer verifies it, and whether it was RUN against a planted violation (watched RED) and a twin (GREEN). Commands follow the program's checker shape. `KIT=$HX/kit/tools`.

**G1 · MUST (amends SH-INST-01 check)** Seed an old install and run the installer's overwrite flag in the truncation sweep; treat a baseline that changes nothing as failure.
- *Rationale:* a script that deletes the previous binary then dies is invisible without a seeded install; just refused to overwrite and every cell was vacuous.
- *Verify:* `bash $KIT/mx.sh toolx t-trunc.sh $HX/plant/linear.sh`; profile defines `p_seedold`. Output line `partial_cuts=` must be 0 and `vacuous=0`.
- *RUN:* yes. `plant/linear.sh` RED 11 of 11 cells (`partial_cuts=4` of 85), `ref/install.sh` GREEN 0 of 11. Real: bun RED 168/389, just GREEN after `--force`.

**G2 · MUST (amends the SH-ERR-15/16 check used by SH-INST-20 row 5)** Signal at the Nth network call, N=2 whenever the installer makes a lookup before the download; report both.
- *Rationale:* the first-call signal precedes `mktemp` in just and volta.
- *Verify:* `T_NTH=2 python3 -I $KIT/t-trap.py INSTALLER dash INT` (repeat TERM, HUP); exit 1 on RED.
- *RUN:* yes. `plant/trap-late.sh` RED at NTH=2 (`leaked=['tmp.hDWV2KN2AA']`), GREEN at NTH=1; `twin/trap-late.sh` GREEN at NTH=2 with rc 130/143/129. Held-out: just, volta RED.

**G3 · MUST (adds to SH-INST-05, wget half)** Pass the same wget options on and off a tty and only options in the BusyBox v1.37.0 set (`-q`, `-S`, `-O`, `--no-verbose`, `--tries`, `--timeout`, `--header`, `--user-agent`); never `--show-progress`, `--https-only`, `--secure-protocol`, `--retry-connrefused`, `--netrc` without a `wget --help` probe.
- *Rationale:* pixi's tty-only branch fails on BusyBox v1.37.0; just's wget flags fail everywhere on BusyBox.
- *Verify:* `bash $KIT/mx.sh toolx t-flags.sh INSTALLER` (rows 2 and 2t) and the aid `git ls-files -z --cached --others --exclude-standard -- '*.sh' | xargs -0 -r grep -nH -e '--show-progress' -e '--https-only' -e '--secure-protocol' -e '--retry-connrefused'` (a hit inside a `wget --help` probe is a reading step).
- *RUN:* yes. t-flags: `plant/wget-tty.sh` RED on row 2t only; twin GREEN. Grep: held tree RED (`just-install.sh:63`, `pixi-install.sh:119`), plant RED, twin GREEN (`HX/out/r7b-heldout.txt`).

**G4 · MUST (extends SH-INST-06 to install.ps1; candidate PS-SEC-14)** Refuse a non-https URL taken from an environment variable or parameter, with `throw`, before any request.
- *Rationale:* `OLLAMA_DOWNLOAD_URL`, `PIXI_DOWNLOAD_URL` accept `http://`; PowerShell has no `--proto`.
- *Verify:* `git ls-files -z --cached --others --exclude-standard -- '*.ps1' | xargs -0 -r grep -liE -e 'env:[A-Za-z_]*URL' | tr '\n' '\0' | xargs -0 -r grep -LF -e "-notmatch '^https://" -e 'StartsWith("https://"'` (output = override without a scheme assertion); behavioural `HX/ps/httpcheck.sh` (a local http server must see no request).
- *RUN:* yes. Grep: held tree RED (ollama, pixi), plant RED, twin GREEN. Behavioural: plant RED, twin GREEN, on pwsh 7.6.6 and 5.1.26100.9444.

**G5 · MUST (candidate SH-INST-22; resolves M-N-13)** An installer that can need root: default to a user prefix; escalate only for an explicitly chosen unwritable prefix; announce the exact command first; escalate only the final copy; never download, verify or extract as root; offer `--no-sudo`; never put arguments inside `su -c '...'`.
- *Rationale:* ollama and tailscale run every step with `$SUDO`; coder probes writability and switches; helm escalates only the copy.
- *Verify:* `bash $KIT/mx.sh coder-user t-root.sh INSTALLER` (uid 1000, recording `sudo` stub; exit 1 when any `sudo` call is logged under a user prefix). Reading step: where the first `sudo` occurs relative to download and verify.
- *RUN:* yes. `plant/sudoinstall.sh` RED 11 of 11, `ref/install.sh` GREEN; held-out ollama/tailscale/coder RED, coder-user GREEN.

**G6 · MUST (scope note on SH-INST-03/-07)** A digest may be replaced by a signature verified against a key embedded in the installer; absent the verifying tool, fail closed unless the digest is pinned, and say in the header that the signature was skipped.
- *Rationale:* pnpm degrades to same-origin sha512 and says so; with every digest tool removed it refuses.
- *Verify:* `bash $KIT/mx.sh pnpm-allhash t-tamper.sh $HX/data/pnpm-install-testkey.sh` (A, B, C all refuse).
- *RUN:* yes. pnpm-allhash GREEN (the profile with only openssl removed is RED by design); `plant/failopen.sh` RED, ref GREEN.

**G7 · MUST (amends PS-SEC-01)** A verified Authenticode signature is an accepted alternative to a hash only if the code requires `Status -eq 'Valid'` and a full-string signer pin (anchored, not a substring).
- *Rationale:* ollama's `Test-Signature` is the model; weakening either condition accepts lookalike or tampered signatures.
- *Verify:* `ENGINES=all HX/ps/runps.sh authenticode.ps1 -Variant pinned` (exit 0) and `-Variant weakregex` / `-Variant nostatus` (exit 1).
- *RUN:* yes. `pinned` GREEN on both engines; `weakregex` RED (lookalike accepted); `nostatus` RED (tampered accepted).

**G8 · MUST (PS-SEC-01 check, path level)** Verify the hash on every path that reaches an extract or run call, not once somewhere in the file.
- *Rationale:* pnpm's v11 branch extracts unverified while the file contains `ComputeHash`.
- *Verify:* `runps.sh ast-sec2.ps1 DIR` prints `UNVERIFIED-PATH (Expand-Archive)`; exit 1.
- *RUN:* yes. `plant2/branch-unverified.ps1` RED, `twin2/branch-verified.ps1` GREEN, both engines. Known false positive: a local-file `Start-Process` (ollama `:232`).

**G9 · MUST (PS-SEC-09 check)** A file with no `$PSCommandPath` guard has no top-level `exit` statement.
- *Rationale:* pixi's top-level `exit 1` in `catch` kills the host under `irm | iex`.
- *Verify:* `runps.sh ast-sec2.ps1 DIR` prints `EXIT-TOPLEVEL-UNGUARDED`.
- *RUN:* yes. `plant2/toplevel-exit.ps1` RED; `twin2/toplevel-exit-guarded.ps1` GREEN; `pixi-install.ps1:208` RED.

**G10 · SHOULD (PS-SEC-10 check)** Detect `Invoke-Expression`/`iex` by AST token, not grep.
- *Rationale:* comment-based help examples produce 6 false hits in ollama.
- *Verify:* `runps.sh ast-sec2.ps1 DIR` (`INVOKE-EXPRESSION-TOKEN`).
- *RUN:* yes. `plant2/real-iex.ps1` RED; `plant2/doc-iex.ps1` and `twin2/doc-iex.ps1` (iex only inside a help comment) are not flagged by the AST check although the grep flags that shape; ollama GREEN.

**G11 · MUST (candidate PS-SEC-15)** Read the OS from `$IsWindows`/`$IsMacOS`/`$IsLinux` (with `$PSVersionTable.PSVersion.Major -lt 6` meaning Windows), never from the text of `$PSVersionTable.OS`.
- *Rationale:* pwsh 7.6.6 returns the distro pretty name; pnpm's installer fails on Fedora.
- *Verify:* `git ls-files -z --cached --others --exclude-standard -- '*.ps1' | xargs -0 -r grep -nHF -e 'PSVersionTable.OS'` (empty = pass).
- *RUN:* yes. Held RED (`pnpm-install.ps1:31`), plant RED, twin GREEN; behavioural `os-switch.ps1` throws on both engines, `os-isvar.ps1` returns `linux`/`win32`.

**G12 · MUST (candidate PS-ERR-xx / PS-SEC-16)** Initialise every variable the `finally` block reads before `try` and guard its use; never rely on `finally` after `exit` under `Set-StrictMode -Version Latest`.
- *Rationale:* pixi's cleanup error replaces the real failure.
- *Verify:* `runps.sh finally-masks.ps1 -Path FILE` (exit 1 when the output holds the undefined-variable error).
- *RUN:* yes. `plant2/finally-strict.ps1` RED on pwsh 7.6.6 and 5.1.26100.9444; `twin2/finally-strict.ps1` GREEN.

**G13 · MUST (rewrites the PS-SEC-06 check)** Use the pair: named legacy member grep plus unguarded-assignment grep.
- *Rationale:* the old pattern matched `Tls12` through its `Tls` prefix and contained a pipe.
- *Verify:* 06a `git ls-files -z --cached --others --exclude-standard -- '*.ps1' | xargs -0 -r grep -nHE -e 'SecurityProtocolType\]::Tls13' -e 'SecurityProtocolType\]::Tls11' -e 'SecurityProtocolType\]::Ssl3' -e 'SecurityProtocolType\]::Tls[^0-9]' -e 'SecurityProtocolType\]::Tls$'`; 06b `... | xargs -0 -r grep -lE -e 'SecurityProtocol *=' | tr '\n' '\0' | xargs -0 -r grep -L -e PSEdition`.
- *RUN:* yes (`HX/out/r7c-heldout.txt`). 06a: plant RED, twin GREEN, held GREEN. 06b: plant RED, twin GREEN, held RED (pnpm `:257`).

## Verification runs

All fixtures under `HX`; `RED` = exit 1 on the violation, `GREEN` = exit 0 on the twin. "mx" = `bash $HX/kit/tools/mx.sh PROFILE CHECK INSTALLER` (11 interpreter cells, 4 bash cells). Each timed with `timeout 300` (or wrapped per run).

| # | Check | Fixture (plant / twin) | Command | Violation | Twin | Key output |
|---|---|---|---|---|---|---|
| 1-13 | R7 greps, X1 git-fed | `installer-consolidation/gitfed/{plant,twin}` + held tree | `bash HX/r7-heldout.sh` | RED (empty = pass) | GREEN empty | `[PS-SEC-01] plant: RED hash.ps1 zipslip.ps1`; `[SH-INST-17] held: RED coder-install.sh:117 just-install.sh:120` |
| 14-15 | t-trunc, seeded | `sh-contract/plant/linear.sh`, `toplevel.sh` / `ref/install.sh` | `mx toolx t-trunc.sh` | exit 1, red=11 of 11 | exit 0, red=0 of 11 | `partial_cuts=4` of 85 (linear) |
| 16-17 | t-tamper | `plant/failopen.sh`, `nohash.sh` / ref | `mx toolx t-tamper.sh` | red=11 of 11 | red=0 | `RED A tampered payload: rc=0 installed=yes` |
| 18-20 | t-flags | `plant/curlprobe.sh`, `httpurl.sh`, `wgetflags.sh` / ref | `mx toolx t-flags.sh` | red=11 of 11 each | red=0 | `RED 4 TOOLX_INSTALL_BASE_URL=http://...: rc=0` |
| 21 | t-flags 2t | `HX/plant/wget-tty.sh` / `HX/twin/wget-tty.sh` | `docker run hx:deb12 sh t-flags.sh FILE dash` | exit 1 | exit 0 | `RED  2t busybox wget on a tty: WGET-REJECTED: REJECT show-progress` / `ok   2t ... installed, no unsupported option sent` |
| 22-23 | t-platform | `plant/fallthrough.sh`, `rosetta.sh` / ref | `mx toolx t-platform.sh` | red=11 of 11 | red=0 | `WRONG linux i686` |
| 24 | t-root | `plant/sudoinstall.sh` / ref | `MX_DOCKER_USER=1000:1000 mx toolx t-root.sh` | red=11 of 11 | red=0 | `RED escalated 1 time(s)` |
| 25 | t-parse | `plant/nonascii.sh` / ref | `mx toolx t-parse.sh` | red=1 of 11 (yash C locale) | red=0 | the only cell that rejects non-ASCII |
| 26-27 | t-tty | `plant/ttyunguarded.sh`, `stdinread.sh` / ref | `docker run hx:deb12 sh t-tty.sh FILE dash` | `violations=1` | `violations=0` | `RED noctty: prompt printed or /dev/tty error leaked` |
| 28 | t-trap | `plant/trapsig.sh` / ref | `python3 -I t-trap.py FILE dash INT\|TERM\|HUP` | verdict RED x3 | GREEN x3 | `leaked=[...]: RED` |
| 29 | t-trap NTH | `plant/trap-late.sh` / `twin/trap-late.sh` | `T_NTH=2 python3 -I t-trap.py FILE dash SIG` | RED x3 | GREEN x3 (rc 130/143/129) | with `T_NTH=1` the plant reads GREEN (blind) |
| 30 | iex flood | `ps/plant/stderr-flood.ps1` | `runps.sh check-iex-survival.ps1 -Path ... -HostModel ci` | original script times out (124) | fixed script GREEN | async reads |
| 31-33 | ast-sec2 | `plant2/{branch-unverified,toplevel-exit,real-iex}.ps1` / `twin2/*` | `runps.sh ast-sec2.ps1 plant2` | `RED (4)` both engines | `GREEN` | `UNVERIFIED-PATH`, `EXIT-TOPLEVEL-UNGUARDED`, `INVOKE-EXPRESSION-TOKEN` |
| 34 | leak | `plant2/leak-global.ps1` / `twin2/leak-scoped.ps1` | `runps.sh leak.ps1` | RED | GREEN | `LEAK EAP=Stop strict=ON functions=Say variables=Version` |
| 35 | http override | `plant2/http-override.ps1` / `twin2/https-override.ps1` | `HX/ps/httpcheck.sh` | RED, `GET /x.zip` | GREEN | both engines |
| 36 | finally masks | `plant2/finally-strict.ps1` / `twin2/finally-strict.ps1` | `runps.sh finally-masks.ps1 -Path FILE` | RED | GREEN | `The variable '$zip' cannot be retrieved because it has not been set.` |
| 37 | OS switch | `plant2/os-switch.ps1` / `twin2/os-isvar.ps1` | `runps.sh FILE` | exit 1 | exit 0 | `platform=linux` / `platform=win32` |
| 38-39 | Authenticode | `-Variant weakregex`, `nostatus` / `pinned` | `runps.sh authenticode.ps1 -Variant V` | RED (1) each | GREEN | `lookalike want-accept=False got-accept=True RED` |
| 40-41 | hash order | `hash-order.ps1 -Variant nohash`, `failopen` / `closed`, `closed-empty` | `runps.sh hash-order.ps1 -Variant V` | RED | GREEN | `tampered archive EXTRACTED (content: EVIL-BINARY)` |
| 42 | zipcheck | `zip-slip*.zip` | `runps.sh zipcheck.ps1 -Zip F -Method Manual` | RED | `Safe` GREEN | file landed outside dest |
| 43 | wget grep (new) | `gitfed/plant/wget-tty.sh` / `gitfed/twin/wget-tty.sh` | `bash HX/r7b-heldout.sh` | RED | GREEN empty | `pixi-install.sh:119` |
| 44 | OS grep (new) | `os-switch.ps1` / `os-isvar.ps1` | same | RED | GREEN empty | `pnpm-install.ps1:31` |
| 45 | URL-env grep (new) | `http-override.ps1` / `https-override.ps1` | same | RED | GREEN empty | `ollama-install.ps1`, `pixi-install.ps1` |
| 46-47 | PS-SEC-06 pair | `tls.ps1` plant / twin | `bash HX/r7c-heldout.sh` | RED | GREEN empty | 06a held GREEN, 06b held RED (pnpm) |
| 48 | pnpm all-hash control | `HX/data/pnpm-install-testkey.sh` | `mx pnpm-allhash t-tamper.sh` | n/a (control: GREEN) | GREEN | A, B, C refuse |

Watched RED on a planted fixture: 48 (rows count one per distinct plant or grep; pairs counted once). Held-out sweeps are in `HX/out/t-*-<profile>.txt`; live R8 on alpine:3.22 in `HX/out/r8-heldout.txt`; kit runs on bash 3.2/4.4/5.2/5.3 and dash 0.5.12, busybox ash 1.35 and 1.37, mksh R59c, ksh93u+m 2023 and 1.0.10, yash 2.52, posh 0.14.1, zsh 5.9 `--emulate sh`.

## Exemplar evidence

- Best held-out exemplars, by the SH-INST rules: helm's fail-closed order (checksum before `cp`, openssl required: `helm/helm@dc56a44fee5a:scripts/get-helm-3:84-86,192`; ok on A, B, C), pnpm's layered integrity (`pnpm/get.pnpm.io@29fc8463b5b8:install.sh:129-131,136-160`: embedded-key signature, sha512, no usable tool aborts), coder's `main "$@"` and `--prefix` (`coder/coder@50c785cc6d75:install.sh:316,429`), pixi's `{ ... } && __wrap__` group as a truncation guard (`pixi@98535e0857e2:install/install.sh:263`).
- Best PS exemplar: ollama's anchored signer pin with `Status` checked (`ollama/ollama@eab97e9f92b9:scripts/install.ps1:75-91`; the unmodified pin passes all four mock cases).
- Counter-exemplars: bun sh (linear, 168/389 partial), pixi ps1 (top-level `exit`, `finally` masking), pnpm ps1 (platform from free text), volta (silent success).
- All 10 are hand-written; none is generated by cargo-dist or similar, so the generated-installer half of SH-INST-20 (R10) did not get a held-out test.

## AI-agent angle

What an LLM gets wrong (from these 10 installers), with the smallest mechanical check:

| Mistake | Seen in | Smallest check |
|---|---|---|
| Copies `wget --show-progress`/`--https-only` from GNU docs without a BusyBox check, or varies options by `[ -t 1 ]` | pixi, just | `t-flags` rows 2 and 2t; the 4-pattern wget grep (G3) |
| Resolves "latest" through the GitHub REST API, rate limited (60 per hour unauthenticated) | just `:120`, coder `:117` | SH-INST-17 grep (held RED, 2 hits) |
| Cleanup trap only on EXIT, or `trap ... INT TERM HUP` that returns and lets the script run on | pixi, ollama, pnpm | `T_NTH=2 t-trap.py` (G2) |
| Linear script with the install steps at top level | bun | `t-trunc.sh` with a seeded install (G1) |
| Platform from `$PSVersionTable.OS` text, or `uname -m` straight into an asset name | pnpm ps1, pixi sh, fnm | G11 grep; `t-platform` (exit 7) |
| Hash or signature check in one branch, extract in another | pnpm ps1 | `ast-sec2` `UNVERIFIED-PATH` (G8) |
| `exit 1` in a catch, `return 1` for failure in an `irm \| iex` script | pixi, bun | `ast-sec2`; `check-iex-survival` repl and ci |
| `Set-StrictMode -Version Latest` plus a `finally` that touches a later-assigned variable | pixi | `finally-masks.ps1` (G12) |
| Escalates everything with `sudo` because the destination is `/usr/local/bin` | ollama, tailscale | `t-root.sh` under a user prefix (G5) |
| Accepts an `http://` mirror override "for testing" | bun, pixi, ollama ps1 | `t-flags` row 4; G4 grep |
| Treats "lint green" as evidence | all | shellcheck/PSSA see none of these; every check above is behavioural or AST |

## Contested / evolving

- **Same-origin sha512 as integrity (pnpm, helm).** The consolidation allows it only if labelled corruption detection (SH-INST-04, PS-SEC-02). pnpm's openssl-less state is exactly that; whether to treat the combined path as compliant is the owner's call (Open question 3 of shell-installer.md). Default applied: compliant when labelled and when the digest-tool-absent case fails closed.
- **Blanket sudo is a policy dispute.** ollama and tailscale are system installers by nature; the candidate rule (G5) says escalate narrowly, which may not fit a package-manager installer like tailscale. Default: SH-INST-22 applies to installers that expose a user-prefix mode; tailscale-style installers are labelled "root by design" and checked for the narrowest escalation.
- **Authenticode as a hash substitute** is Windows-only and its trust root is the OS certificate store; it fits PS-SEC-01 but not an install.sh.
- **SH-INST-07 stays unrun against the sample.** The official `busybox:1.37` image does not validate certificates, alpine:3.22 does; I ran only alpine:3.22 (R8). Whether a validating build matters for helm/pnpm is not measured here.
- **Rosetta and macOS in fnm/bun/volta/just/pixi** are read only. No macOS host was available.
- **Windows legacy TLS (.NET < 4.7)** is still simulated, not measured, so the pnpm `Tls12` finding is about scope and persistence, not about a proven failure.
- **The `trailing.sh` discrepancy** may reflect a changed kit between the consolidation and this round. It is reported, not resolved.
- **Evolving:** pixi, pnpm, bun and ollama push changes within days (HEAD dates 2026-10-09/10); findings are pinned to the SHAs above and may be fixed upstream.

## Sources

All retrieved 2026-10-11 (docs are the main-branch version on that date; installers are at the pinned SHA). Primary = vendor documentation or the installer source itself.

| URL | What | Date / era | Why |
|---|---|---|---|
| https://github.com/casey/just/blob/a1951a5ff762/www/install.sh | just install.sh and its README (382-410) | 2026-10-08 | linear but cut-safe; wget flags; REST API latest |
| https://github.com/Schniz/fnm/blob/86adc9676ceb/.ci/install.sh | fnm installer | 2026-07-24 | wrong asset, temp leak |
| https://github.com/volta-cli/volta/blob/5eedd5fb2f68/dev/unix/volta-install.sh | volta installer | 2025-11-15 | silent exit 0 |
| https://github.com/oven-sh/bun/tree/6c1eb067e3c3/src/runtime/cli | bun install.sh and install.ps1 | 2026-10-10 | linear sh; ps1 `return 1`; README:57 |
| https://github.com/helm/helm/blob/dc56a44fee5a/scripts/get-helm-3 | helm installer | 2026-10-06 | fail-closed exemplar; `USE_SUDO` |
| https://github.com/prefix-dev/pixi/tree/98535e0857e2/install | pixi install.sh and install.ps1 (README:96) | 2026-10-10 | tty-only wget flag; `exit` host kill |
| https://github.com/ollama/ollama/tree/eab97e9f92b9/scripts | ollama install.sh and install.ps1 (README:24) | 2026-10-09 | blanket sudo; Authenticode pin |
| https://github.com/tailscale/tailscale/blob/3bb8a906c277/scripts/installer.sh | tailscale installer | 2026-10-10 | package-manager dispatch, root |
| https://github.com/coder/coder/blob/50c785cc6d75/install.sh | coder installer | 2026-10-09 | probe-then-escalate |
| https://github.com/pnpm/get.pnpm.io/tree/29fc8463b5b8 | pnpm install.sh and install.ps1 | 2026-10-10 | signature plus sha512; OS switch |
| https://raw.githubusercontent.com/mirror/busybox/1_37_0/networking/wget.c | BusyBox 1.37.0 wget option table (:1500-1523) | 1.37.0 (2025-11) | accepted vs rejected options |
| https://raw.githubusercontent.com/curl/curl/master/docs/cmdline-opts/proto.md | curl `--proto` | master, retrieved 2026-10-11 | the https-only restriction |
| https://raw.githubusercontent.com/github/docs/main/content/repositories/releasing-projects-on-github/linking-to-releases.md | `releases/latest` redirect contract | main, 2026-10-11 | SH-INST-17 |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Return.md | `return` semantics | ms.date 01/18/2026 | bun `return 1` |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Try_Catch_Finally.md | `finally` runs after `exit` | ms.date 04/02/2026 | pixi cleanup masking |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Execution_Policies.md | execution policy is defense in depth | ms.date 08/31/2026 | PS-SEC-11 |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Security/Get-AuthenticodeSignature.md | Authenticode cmdlet and `Status` values | ms.date 01/18/2026 | ollama signer pin |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Archive/Expand-Archive.md | `-LiteralPath` vs `-Path` wildcards | ms.date 04/01/2026 | PS-SEC-05 |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/Set-StrictMode.md | StrictMode and uninitialised variables | ms.date 01/18/2026 | finally masking |
| https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/docs/Rules/AvoidUsingInvokeExpression.md | PSAvoidUsingInvokeExpression | ms.date 07/21/2026 | PS-SEC-10 |
| https://raw.githubusercontent.com/prefix-dev/pixi/main/docs/installation.md | pixi install documentation | main, 2026-10-11 | documented one-liners |
| https://docs.npmjs.com/verifying-registry-signatures | npm ECDSA registry signatures | 2026-10-11 | pnpm signature route |
| https://helm.sh/docs/intro/install/ | helm install docs | 2026-10-11 | documented checksum/signature flags |
| https://tailscale.com/kb/1031/install-linux | tailscale Linux install docs | 2026-10-11 | package-manager install path |

Internal inputs (not counted): `.agents/research/shell-installer.md` (the consolidation under test; rules at lines 61-254), `shell-topic-map.md` (M-N-13/14/16 at lines 1970-1973, X55 at 2132), `shell-dialect.md` (SH-DIAL/SH-USER).
