---
title: "Installer pairs: install.sh contract and install.ps1 front door (consolidation)"
topic: "shell scripting across operating systems and shells: POSIX sh installers delivered by curl | sh, PowerShell installers delivered by irm | iex, generated (cargo-dist 0.33.0) installers, integrity, TLS, platform maps, exit taxonomy (wave 3, installer pairs)"
model: sonnet
id_family: SH-INST, PS-SEC
consolidates:
  - shell-installer/sh-contract.md
  - shell-installer/ps1-front-door.md
date: 2026-10-11
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/installer-consolidation/ (this file's own runs R1-R11, outputs under out/); the two dives' kits sit beside it (sh-contract/, ps1-front-door/)
---

# Installer pairs - consolidation

Date 2026-10-11. Keys. **[sh]** = `shell-installer/sh-contract.md` (f# = its finding, "row n" = its verification table). **[ps]** = `shell-installer/ps1-front-door.md` (f# = finding, V# = verification run). **[inst]** = `shell-audit/installers.md`. Wave-2 rules are cited by ID and not restated. `KIT` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/sh-contract`; `PSKIT` = `.../fixtures/ps1-front-door`; `CONS` = `.../fixtures/installer-consolidation`. `mx` = `bash $KIT/tools/mx.sh CHECK INSTALLER` (runs a check under 11 POSIX interpreters: dash 0.5.12, busybox ash 1.35 and 1.37, mksh R59c, ksh93u+m x2, yash 2.52, posh 0.14.1, bash 3.2 and 5.2 `--posix`, zsh 5.9 `--emulate sh`; prints `red=K of 11`). `runall` = `$PSKIT/runall.sh SCRIPT args` (pwsh 7.4.7, pwsh 7.6.6, Windows PowerShell 5.1.26100.9444). `LS` = `git ls-files -z --cached --others --exclude-standard --` (the wave-2 X1 file list; busybox grep has no `--include` or `-Z`).

This round's own runs (all re-executed 2026-10-11, outputs in `$CONS/out/`): **R1** tamper plants on 11 interpreters; **R2** truncation sweep; **R3** iex host survival, repl and ci models, pwsh 7.6.6 and 5.1.26100.9444; **R4** zip-slip, hash-before-extract, the ten PS greps; **R5** three discrepancy runs; **R6** the shipped grimoire `grimoire-installer.sh` v0.14.3 against a tampered archive plus the audit greps; **R7** all PS and SH greps re-expressed in the X1 shape on git-initialised plant and twin trees, **R7b** the BusyBox no-validation plant with real exit codes; **R8** fleet reproducers (busybox wget, yash); **R9** shellcheck on every plant; **R10** PSScriptAnalyzer (all default rules) on every PS plant; **R11** host facts. macOS has no host: every macOS claim is "unverified: read only".

## Verdict

Decisions, each naming the script kind it binds. Conflict numbers (C#) point to the table under "The ruleset".

1. **[install.sh by pipe]** Main-last is the truncation guard and the line-and-byte prefix sweep is the check of record (SH-INST-01). A single 60% cut is not a check, and the awk layout check is a reading aid only (C14).
2. **[install.sh, install.ps1]** Verify the payload before extracting or running it and fail closed in three cases: no hash tool, no expected digest, mismatch (SH-INST-03, PS-SEC-01). Name the root of trust: embedded or other-origin is a trust root, a same-origin sidecar is corruption detection (SH-INST-04, PS-SEC-02). cargo-dist 0.33.0 is class "pinned" (embedded digests), not "sidecar/manifest" as the audit said (C4).
3. **[front doors, sh and ps1]** A verification claim must be backed by code in the file or by a named, verified delegate (SH-INST-04, PS-SEC-03). grimoire's claim is true for sh (digests embedded, `grimoire-installer.sh:220-285`) but only while `sha256sum` exists, and false for PowerShell (0 hash tokens in `grimoire-installer.ps1` v0.14.3). The remedy is the owner's call (Open question 1) (C8, C16).
4. **[install.sh network]** TLS flags only behind a capability probe (`curl --help all`; wget per SH-USER-10), `--proto '=https'` always, https-only assertion for overridable URLs, and a BusyBox no-validation refusal (SH-INST-05, -06, -07). Both fleet installers fail on BusyBox wget today (R8).
5. **[install.sh platform and exit]** Total platform mapping (Rosetta by value, three-outcome libc, exit 7) and a documented 0-7 `# Exit:` table; for the installer kind this is MUST (SH-INST-08, -09), higher than SH-ERR-25's SHOULD (C5).
6. **[install.ps1 by irm | iex]** One guarded top-level exit; functions throw or return; detect iex with `[string]::IsNullOrEmpty($PSCommandPath)` (PS-SEC-09). This amends PS-ERR-05: its `break` idiom swallows the failure in a non-interactive host and its detection formula throws under StrictMode Latest (C1).
7. **[install.ps1 on 5.1]** TLS: touch `SecurityProtocol` only on Desktop and only when not `SystemDefault`, numeric values, no `Tls13`/`Tls11` literals (PS-SEC-06, MUST for installers, refining PS-COMPAT-09 (C3)). Zip: ban the hand-rolled `ExtractToFile` loop; `ExtractToDirectory` and `Expand-Archive` are accepted on the measured builds (PS-SEC-04, C9).
8. **[iex body hygiene]** No `#Requires`, `Mandatory`, `$PSScriptRoot` or global leaks in a script documented as `| iex` (PS-SEC-07, -08); no execution-policy gate (PS-SEC-11). The `Invoke-Expression` token lint is SHOULD, not MUST: a `[scriptblock]::Create` swap is lint-green with identical power, so the value is the hash, not the token (PS-SEC-10, C10).
9. **[any script writing `$GITHUB_PATH`/`$GITHUB_ENV`/`$GITHUB_OUTPUT` on 5.1]** One writer per file, `AppendAllText` with `UTF8Encoding $false`; SH-CI-11 is amended, no new PS-SEC rule (C2).
10. **[generated installers]** Audit, never trust: cargo-dist 0.33.0 (grimoire v0.14.3) fails five of ten checklist rows (TLS flags, fail-open hash, Rosetta precedence, no trap, no ps1 hash) and is partial on a sixth; fix upstream or wrap, and run `sh -n` on the rendered file in the release job (SH-INST-20).
11. **[all kinds]** Linters do not catch these defects: shellcheck 0.11.0 `-s sh` reports the defect on 1 of 26 installer plants (R9: `brace.sh`, SC3009; 23 plants are fully silent, 2 emit only unrelated SC2034) and PSScriptAnalyzer 1.25.0 default rules flag 3 of 12 PS plants, all of them the `iex` token (R10). The kit runs, not lint-green, are the gate.
12. **[de-duplication]** Seven SH-INST IDs and two PS-SEC IDs retire to wave-2 rules or merge (table in the ruleset). 14 SH-INST and 11 PS-SEC rules remain: 20 MUST.

## The ruleset

Fields per rule: severity, imperative, **Why**, **Check** (exact), **Watched** (RED on a plant and GREEN on its twin, with the run; "reading" = no runnable check, with the reason), **Scope** (shell/version/OS). Grep checks print the violation; empty output passes. "Mx" checks take an installer path. Rules are grouped by the check that catches them.

### Conflicts resolved

| # | Disagreement | Resolution and why |
|---|---|---|
| C1 | PS-ERR-05 (`exit` banned, use `break`, detect with `$null -eq $MyInvocation.MyCommand.Path`) vs [ps] f3 (PS-SEC-09) | PS-SEC-09 wins. R3: the `break` twin survives a prompt (repl GREEN) but ends with step exit 0 in a CI step (ci RED) on pwsh 7.6.6 and 5.1.26100.9444; the single-exit shape is GREEN in both. The formula throws under `Set-StrictMode -Version Latest` (www-setup sets it at `install.ps1:63`); `[string]::IsNullOrEmpty($PSCommandPath)` does not. |
| C2 | SH-CI-11 (`Out-File -Encoding utf8 -Append`) vs PS-ENC-03 (`AppendAllText`, no `-Encoding utf8`) | Both are GREEN alone on 5.1 ([ps] f11, BOM once, consumed by the runner's `ReadAllLines(..., UTF8)`); any `>>` mix and bare `Add-Content` with non-ASCII are RED. Resolution: one writer per file and it is `AppendAllText` with `UTF8Encoding $false`. SH-CI-11 is amended; [ps]'s PS-SEC-12 is retired as a duplicate (the G10 grep moves to the SH-CI-11 amendment, R4/R7 RED/GREEN). |
| C3 | PS-COMPAT-09 (SHOULD, `SecurityProtocol -bor Tls12`) vs Microsoft TLS guidance and the measured default | 5.1.26100.9444 on .NET 4.8.1 defaults to `SystemDefault` ([ps] f5, V8); Microsoft says not to set it on 4.7+ ([TLS best practices](https://raw.githubusercontent.com/dotnet/docs/main/docs/framework/network-programming/tls.md), ms.date 2026-06-04). `-bor` onto a legacy value keeps Ssl3/Tls enabled. PS-SEC-06 (MUST for installers) refines: guarded, numeric, Desktop only. PS-COMPAT-09 text is amended to point at it. |
| C4 | [inst] labels cargo-dist "sidecar/manifest" vs [sh] f2 | Pinned. The 0.33.0 template embeds per-archive digests; the shipped installer carries them at `grimoire-installer.sh:220-285`. R6 re-run: with `sha256sum` present a tampered archive gives rc 1, without it rc 0 and the binary prints PWNED. [inst] is corrected. |
| C5 | SH-ERR-25 (SHOULD: `# Exit:` header) vs SH-INST-09 (MUST) | MUST for the installer kind only (specific beats general; 16 of 17 corpus installers document no taxonomy, [sh] f12). SH-ERR-25 keeps SHOULD for other kinds. Owner Q6 (installers keep 0-7) is unchanged. |
| C6 | [sh] f10 says `shasum` exists only on ubuntu:26.04 and `openssl` on 26.04, alma9, arch; SH-USER-06 and platform-matrix say `shasum` is on none of 21 base images | R5(a), stock images ubuntu:24.04, ubuntu:26.04, debian:12, alpine:3.22, busybox:1.37: `sha256sum=y shasum=n openssl=n` on all five. The [sh] 26.04 row came from a custom image (the alma9 and arch `openssl` rows were not re-run). SH-USER-06 stands; fail-closed costs nothing on stock Linux. |
| C7 | `shell-dialect.md:111` (X11) lists mksh as running `{1..3}` three times and ksh93u+m 1.0.10 once vs `shell-expansion.md` SE-8 and [sh] f11 | R5(c): iterations=1 on dash, ash 1.35, ash 1.37, mksh R59c, yash, posh, zsh sh-mode; 3 on ksh93u+m 2023, ksh93u+m 1.0.10, bash 3.2, bash 5.2. Count (7 of 11) is the same, composition in X11 is wrong. SH-EXP-12 owns the rule; `shell-dialect.md:111` needs the swap fixed. |
| C8 | grimoire's claim "verifies the downloaded archive's SHA-256" (`docs/public/install.sh:4-7`, `install.ps1:3-6`, `installation.md:49-52`) vs the code | Split verdict. sh: true via the delegate's embedded digests, with the fail-open hole when `sha256sum` is absent (R6). ps1: false, 0 hash tokens in the shipped file (R11), `Expand-Archive` at `:317`. Fix is upstream and open: [cargo-dist PR 2497](https://github.com/axodotdev/cargo-dist/pull/2497), not merged as of 2026-10-11. |
| C9 | PS-SEC-04 as drafted says "only ExtractToDirectory or a checked loop" yet lists `Expand-Archive` GREEN; www-setup `install.ps1:424-426` says `Expand-Archive` validates entries only from PS 7.4 | R4: Manual loop RED (writes outside) on pwsh 7.6.6 and 5.1.26100.9444; ZipFile, Safe and ExpandArchive GREEN on both. The "7.4+ only" comment is not reproduced on 5.1.26100.9444 ([ps] f7: also 7.4.7). Older .NET Framework / Archive 1.0.1.0 builds are unverified. Resolution: ban the unchecked manual loop, accept the other three, keep www-setup's `Expand-ZipSafely` as the model. |
| C10 | Severities: [ps] PS-SEC-05 and PS-SEC-10 MUST | Both SHOULD. -05: with PS-SEC-01's fail-closed verifier, `Get-FileHash -Path 'ocx[1].zip'` returning `$null` becomes an abort, an availability problem, not a skipped check. -10: the rule is a token lint ([ps] f10: scriptblock swap is lint-green); the integrity property lives in PS-SEC-01. |
| C11 | [ps] greps use `grep -r --include` and `-Z`; wave-2 SH-GATE-16 withdrew those forms (busybox lacks them, blind to extensionless files) | All checks are re-expressed with `LS` + `xargs -0 -r grep`, run on git-initialised plant and twin trees: R7, 11 PS and 3 SH greps RED on plants, GREEN on twins. |
| C12 | [sh] SH-INST-10, -13, -14, -15, -18, -21 duplicate or extend wave-2 rules | Retired to pointers (table below); the one real extension (guard `"$@"` at every forwarding site) becomes an amendment to SH-ERR-12. |
| C13 | [sh] shipped SH-INST-07 as MUST while its own note says no plant went red | A plant now exists. R7b on `busybox:1.37`: twin unpinned rc 4, nothing installed; plant (refusal deleted) rc 0, `toolx` installed; twin pinned rc 0. MUST stands. |
| C14 | [sh] f1: a 60% cut vs the prefix sweep | Sweep is the check of record. R2: `plant/linear.sh` partial_cuts=4 of 85, `toplevel.sh` 14 of 367, ref 0 of 366; the decile test misses `toplevel` and `trailing` entirely. |
| C15 | PS-SEC-01 scope vs PS-SEC-10: a front door cannot hash its second stage when the release publishes no digest for it | `sha256.sum` (843 B) lists archives only ([ps] f1). PS-SEC-01 is scoped to the extracted or executed archive/binary; the second-stage hash is the SHOULD in PS-SEC-10. |
| C16 | Missing hash tool: cargo-dist skips with a message vs SH-INST-03 exit 4 | Fail closed. R5(a): 5 of 5 stock images have `sha256sum`; [sh] measured 8 of 8; macOS (`shasum` only) is unverified: read only and is the case that would decide it (Open question 2). |

### SH-INST (install.sh)

Wave-2 rules that bind installers and are not restated: SH-DIAL-04 (11-interpreter matrix), SH-ERR-12/15/16/18/23/25, SH-USER-06/07/10, SH-GATE-16, SH-EMIT-16..23, SH-EXP-12.

#### Group A: caught by the 11-interpreter kit (`mx`) or its pty/signal harnesses

**SH-INST-01 · MUST** Put every executable statement in a function, leave only assignments at top level, and end the file with `main ${1+"$@"}` (or a call ending `|| exit 1`, or the close of one `{ ... }` group wrapping the whole script). Document the delivery as `curl --proto '=https' --tlsv1.2 -fsSL URL | sh -s -- [options]` or download-then-run; never `sh -c "$(curl ...)"` for a script without the guard.
- *Why:* a cut `curl | sh` runs every complete line it received; rustup (`rustup-init.sh:931`) and docker (`install.sh:811-813`, with a comment saying why) guard; command substitution runs the parsed prefix, then fails ([sh] f1, `probes/cmdsub-run.sh`). 5 of 17 corpus installers are linear (ORAS, MOLD, DENO, BREW, DOTNET).
- *Check:* `bash $KIT/tools/mx.sh t-trunc.sh INSTALLER` (every line prefix, four byte prefixes, last 60 byte prefixes; exit 1 on any PARTIAL). Reading aid only: `sh $KIT/tools/check-toplevel.sh INSTALLER` (layout; high false-positive rate on correct installers).
- *Watched:* yes. R2: `plant/linear.sh` PARTIAL at line-cuts 15/16/17 (partial_cuts=4 of 85); `plant/toplevel.sh` PARTIAL at line 303/304 and two tail-byte cuts (14 of 367); `ref/install.sh` 0 of 366. [sh] rows 12-17 (also `trailing.sh`, caught by the byte tail only).
- *Scope:* install.sh delivered by pipe. The sweep ran on dash 0.5.12; on posh it reports `vacuous=1`, so posh truncation coverage is unproven (Open round 4). On an installer that needs the network the sweep is vacuous unless stubbed (all 17 corpus installers: [sh] f1).

**SH-INST-03 · MUST** Verify the payload's SHA-256 before extracting or executing it and fail closed (exit 4) in three cases: no hash tool, no expected digest (absent or blank), digest mismatch. Probe the tool in the order `sha256sum`, `shasum -a 256`, `openssl dgst -sha256`, and compare the hex strings in the shell instead of `sha256sum -c`.
- *Why:* the shipped cargo-dist 0.33.0 installer prints "skipping sha256 checksum verification" and installs a tampered archive with rc 0 when `sha256sum` is off PATH (R6). `sha256sum -c` needs a filename on the line and accepts uppercase hex ([sh] f10).
- *Check:* `bash $KIT/tools/mx.sh t-tamper.sh INSTALLER` (three scenarios: tampered archive, hash tool removed from PATH, blank digest; exit 1 on any install).
- *Watched:* yes. R1: `plant/failopen.sh` red=11 of 11, `ref/install.sh` red=0 of 11; [sh] row 1: `nohash.sh` `violations=3`, 11 of 11. Real artifact (R6): tampered archive plus `sha256sum` present rc 1; absent rc 0, `grim` prints PWNED.
- *Scope:* install.sh on all 11 interpreters. Stock Linux images have only `sha256sum` (R5); the `shasum` branch exists for macOS (unverified: read only).

**SH-INST-05 · MUST** Add `--tlsv1.2` to curl only after `curl --help all` lists it, always pass `--proto '=https'`, and branch explicitly (one `curl` call per flag set; no unquoted flag variable, no SC2086 disable). The wget half is SH-USER-10 (not restated): probe `--https-only` and `--secure-protocol` before use.
- *Why:* `--tlsv1.2` appears only under `--help all` on curl 7.76.1, 7.88.1, 8.3.0, 8.5.0, 8.22.0 and 8.15.0 (R11, this host: `help=0 help_all=1`); plain `--help` lists it only on 7.61.1. busybox 1.37.0 wget rejects both wget flags. rustup is the only probing installer in the corpus (`rustup-init.sh:742,776`).
- *Check:* `bash $KIT/tools/mx.sh t-flags.sh INSTALLER` (stub curl and wget whose help lacks or lists the flags; exit 1 on a rejected flag).
- *Watched:* yes. [sh] rows 3-4: `curlprobe.sh` and `wgetflags.sh` red 11 of 11, twin 0. Real fleet (R8, alpine:3.22, no curl): `www-setup/src/install.sh` rc 3 `wget: unrecognized option: secure-protocol=TLSv1_2`; grimoire front door rc 1 `unrecognized option: https-only`.
- *Scope:* install.sh using curl or wget; GNU wget 1.14 also rejects `--https-only`; busybox 1.37.0.

**SH-INST-06 · MUST** Refuse a non-https download URL, including every URL an environment variable can override (exit 3).
- *Why:* `--proto '=https'` is curl-only; wget and an overridden base URL need a script-level assertion (`www-setup/src/install.sh:296`).
- *Check:* `bash $KIT/tools/mx.sh t-flags.sh INSTALLER` (scenario "http url"); aid `sh $KIT/tools/lint-grep.sh urlhttp INSTALLER`.
- *Watched:* yes. [sh] row 5: `httpurl.sh` `RED 4 http url: rc=0`, 11 of 11; `httpbase.sh` hit by the grep, twin clean.
- *Scope:* install.sh with an overridable base URL.

**SH-INST-07 · MUST** When wget is the fallback downloader, warn if it is BusyBox, set a flag when wget prints "certificate validation not implemented", and with that flag refuse a same-origin checksum (exit 4) unless the digest is pinned (`*_INSTALL_SHA256`).
- *Why:* the official `busybox:1.37` and `-musl` images use internal TLS and accept a self-signed certificate; alpine:3.22's build validates; Debian busybox 1.35 prints the same note ([sh] f3, source `networking/wget.c` of [busybox 1.37.0](https://busybox.net/downloads/busybox-1.37.0.tar.bz2)). The refusal keys on the runtime message, not the version.
- *Check:* `bash $CONS/run-r7b.sh` (starts `$KIT/tls/server.py`, runs the installer on `busybox:1.37`, unpinned then pinned, prints the installer's own rc and the installed files).
- *Watched:* yes. R7b: twin unpinned `installer-rc=4 installed=[]`; plant `novalid-removed.sh` `installer-rc=0 installed=[toolx]`; twin pinned `installer-rc=0`.
- *Scope:* install.sh on hosts with wget and no curl; busybox 1.37.0 (validation depends on the build: alpine:3.22 `ssl_client` validates, the official images do not).

**SH-INST-08 · MUST** Make platform detection total: every `uname -s`/`uname -m` pair maps to a target or exits 7; offer a `*_INSTALL_TARGET` override; detect libc with three outcomes (glibc evidence, musl evidence, neither exits 7); detect Rosetta by value: `[ "$(sysctl -n hw.optional.arm64 2>/dev/null || true)" = 1 ]`; never `sysctl ... || true | grep -q ': 1'`.
- *Why:* deno's default arm and oras map unknown input to a binary (12 of 26 cells wrong, [inst] Axis 4); the static `busybox:1.37-musl` image has no `ldd`, no `/lib`; `||` binds looser than `|`, so cargo-dist's Rosetta test tests sysctl's exit status (the stray stdout line `hw.optional.arm64: 1` leaks, and an oid answering 0 yields the wrong architecture, [sh] f4).
- *Check:* `bash $KIT/tools/mx.sh t-platform.sh INSTALLER` (14 stubbed scenarios incl. `linux i686`/`riscv64` expecting rc 7 and a Rosetta oid answering 0). Aid: `grep -nE 'sysctl[^|]*\|\|[^|)]*\|' INSTALLER`.
- *Watched:* yes. [sh] rows 6-7: `fallthrough.sh` `WRONG linux i686: want=7 got='x86_64-unknown-linux-gnu' rc=0` (3 scenarios), `rosetta.sh` 2 wrong, both 11 of 11; R6: the aid hits the shipped installer at `:1532` and `:1541`.
- *Scope:* install.sh. macOS Rosetta behaviour (whether a real Mac answers 0) is unverified: read only.

**SH-INST-11 · MUST** In an installer prompt only from `/dev/tty`, only after `(: </dev/tty) 2>/dev/null`, give every prompt a non-interactive default and a flag (`--yes`, `NONINTERACTIVE`), and never `read` from stdin. Use `printf`, not `echo -n`, for the prompt text.
- *Why:* under `curl | sh` stdin is the script: a bare `read` swallows the next script line on 8 shells in a linear script and gets EOF (silent auto-answer) in a main-last script; an unguarded `</dev/tty` exits 2 when there is no controlling terminal (deno, `install.sh:117`) ([sh] f7; [POSIX XBD ch. 10](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap10.html)).
- *Check:* `sh $KIT/tools/t-tty.sh INSTALLER dash` (two terminal models via `ptyrun.py`: controlling terminal and none). Aid: `sh $KIT/tools/lint-grep.sh bareread INSTALLER` (false positives on `while read` loops).
- *Watched:* yes. [sh] rows 19-21: `ttyunguarded.sh` RED on noctty, `stdinread.sh` RED on both, `deno-tail.sh` exit 2 with no "installed" line; twin GREEN.
- *Scope:* install.sh delivered by pipe; dash measured.

**SH-INST-12 · MUST** Install into a user-writable directory with no `sudo`; edit PATH only with consent and an opt-out (`--no-modify-path`); the rc edit itself follows SH-EMIT-16..23 (marker block, in place, symlink-safe, one file for the detected shell); run twice against a throwaway `HOME` the rc diff is empty.
- *Why:* fleet installers are 4 of 4 user-space; blind appends duplicate and break symlinked dotfiles. `ocx self setup` 0.6.5 is idempotent (empty second-run diff) but writes `.profile`, `.zprofile`, `.zshrc`, `.bashrc` and a PowerShell profile for a bash user, violating the SH-EMIT-16 target-file rule ([sh] f9, reported not fixed, owner Q6).
- *Check:* `bash $KIT/tools/mx.sh t-rc.sh INSTALLER` and `bash $KIT/tools/mx.sh t-root.sh INSTALLER`. Aids: `lint-grep.sh sudo`, `lint-grep.sh rcappend`.
- *Watched:* yes. [sh] rows 8-9: `rcappend.sh` `RED symlink broken or block missing` 11 of 11, `sudoinstall.sh` `rc=6 sudo-calls=1` 11 of 11, twin 0.
- *Scope:* user-space install.sh. Root-requiring installers (docker, k3s) are out of scope (Open round 7).

**SH-INST-09 · MUST** (installer kind; SHOULD elsewhere per SH-ERR-25) Document the exit table in a `# Exit:` header line (0 ok; 1 generic; 2 usage or missing tool; 3 network; 4 checksum; 5 extract; 6 setup; 7 platform; 129/130/143 HUP/INT/TERM through traps) and call `err` only with documented codes. Never forward a child status in 123-125, 128 or 200-255 (SH-ERR-18).
- *Why:* callers script around installer failures; only www-setup (`install.sh:27-36`) documents a taxonomy among 17 ([sh] f12). Owner Q6 fixes 0-7.
- *Check:* `sh $KIT/tools/lint-grep.sh header INSTALLER` (= `grep -q '^# Exit:'`).
- *Watched:* the header grep yes ([sh] `noheader.sh` exit 1, twin 0). That each `err ... N` uses a documented code is a reading heuristic: mapping call sites to the table needs reading, no lexical pattern decides it.
- *Scope:* install.sh and front-door bootstrap scripts.

#### Group B: caught by an X1-shape grep (a reading step decides the hit)

**SH-INST-04 · MUST** Name the integrity class in the header (pinned; manifest from a different origin; sidecar from the same origin, worded "detects corruption, not a hostile origin"; GPG; none) and make no verification claim the code does not back: a file mentioning `sha256` or `checksum` calls a hash tool, or names the delegate that does and states what the delegate leaves unverified. PS-SEC-03 is the ps1 sibling.
- *Why:* cargo-dist's own book says same-origin checksums over https "have minimal security benefit" ([checksums.md](https://raw.githubusercontent.com/axodotdev/cargo-dist/v0.33.0/book/src/artifacts/checksums.md)); [Spin](https://spin.atomicobject.com/security-spectrum-curl-sh/) made the same case in 2016. The prior audit mislabelled cargo-dist (C4).
- *Check:* `$LS '*.sh' | xargs -0 -r grep -liE -e 'sha-?256' -e checksum | tr '\n' '\0' | xargs -0 -r grep -L -e sha256sum -e shasum -e openssl` (output = files that claim a check and call no hash tool). Class naming: reading heuristic "digest provenance trace": find where the expected value is fetched and compare that host with the archive host.
- *Watched:* grep yes (R7: `claim-nohash.sh` RED, `claim-hash.sh` GREEN). The class is reading only: origin is a runtime fact, no pattern separates a manifest on another host from a sidecar on the same host.
- *Scope:* install.sh and sh front doors. A delegating front door gets a legitimate hit and resolves it by naming its delegate.

**SH-INST-16 · SHOULD** Retry with `curl --retry 3 --retry-delay 2`; add `--retry-connrefused` only behind a `curl --help all` probe; never `--retry-all-errors` without a probe (curl 7.71.0).
- *Why:* measured on curl 8.22.0 ([sh] f10): a 404 is not retried by `--retry` (1 request; 4 with `--retry-all-errors`), a refused connection is retried only with `--retry-connrefused` (0 s vs 2 s); curl 7.61.1 rejects `--retry-all-errors` (rc 2). setup-grimoire forbids it for the 404 case (`install.sh:51-58`).
- *Check:* `$LS '*.sh' | xargs -0 -r grep -lE -e '^[^#]*--retry-all-errors' | tr '\n' '\0' | xargs -0 -r grep -L -e '--help'` (unprobed use; comment lines excluded).
- *Watched:* grep yes (R7: `retry-all.sh` RED, `retry-probe.sh` GREEN); the retry behaviour is measured ([sh] `out/retry-probe.txt`), not planted.
- *Scope:* curl 7.61.1 to 8.22.0.

**SH-INST-17 · SHOULD** Resolve "latest" from the `releases/latest/download/<asset>` redirect or the `releases/latest` 302 `Location`, not the REST API; when a text endpoint supplies the version use `curl -f` and validate its shape before use.
- *Why:* the unauthenticated REST limit is 60 requests per hour (measured `x-ratelimit-limit: 60`, [GitHub docs](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)); a CI fleet behind one NAT hits it. `curl -s` without `-f` turns "Not Found" into the version (deno, `install.sh:67`). Redirect contract: [linking to releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases).
- *Check:* `$LS '*.sh' | xargs -0 -r grep -nHE -e 'api[.]github[.]com' -e 'curl[^|;&]* -s[sS]?[[:space:]]' | grep -vE -e 'curl[^|;&]*(-f|--fail)' -e ':[0-9]+:[[:space:]]*#'`.
- *Watched:* grep yes (R7: `latest-api.sh` 2 lines RED, `latest-redirect.sh` GREEN).
- *Scope:* GitHub-hosted releases.

#### Group C: reading heuristic or process rules

**SH-INST-19 · SHOULD** Expose a test hatch: `*_INSTALL_SH_PRINT=target` prints the detected target and exits 0, plus an https-only `*_INSTALL_BASE_URL` override.
- *Why:* it makes `t-platform`, `t-noargs` and offline runs possible; rustup does it (`RUSTUP_INIT_SH_PRINT`, `rustup-init.sh:925`).
- *Check:* `TOOLX_INSTALL_SH_PRINT=target sh INSTALLER` prints the triple, rc 0. Reading heuristic: a missing hatch is its own failure, a plant would only prove the command fails.
- *Watched:* used as the harness of `t-noargs.sh` ([sh] row 11) and `t-platform.sh`; no dedicated plant.
- *Scope:* install.sh.

**SH-INST-20 · MUST** Audit every generated installer with the ten-row checklist (Applied section) before shipping, fix upstream or wrap and never hand-edit the output, pin the generator version, and run `sh -n` (dash) on the rendered file in the release job.
- *Why:* cargo-dist 0.33.0 has no TLS flags, a fail-open hash check, a wrong Rosetta test and no trap ([sh] f14); [issue 2339](https://github.com/axodotdev/cargo-dist/issues/2339) shipped a corrupted installer (~108 lines lost).
- *Check:* the commands in the checklist; rows 1, 3, 4, 6 re-run in R6.
- *Watched:* yes on the real artifact: row 3 FAIL (rc 0, PWNED), row 4 hits `:1532`/`:1541`, row 1 no `--proto`/`--tlsv1` (`:1828,1830,1836`), row 6 guarded (`download_binary_and_run_installer "$@" || exit 1`).
- *Scope:* cargo-dist 0.33.0 (v0.33.0 is the latest release, 2026-09-10 per [ps], 2026-09-11 per [sh]; main at 7f277b663b90 has the identical template, 2026-10-02).

#### Retired or merged SH-INST IDs

| ID | Disposition |
|---|---|
| SH-INST-02 | Folded into SH-INST-01 (delivery clause). |
| SH-INST-10 | SH-ERR-15/16 own it. Installer evidence added: `trap cleanup EXIT INT TERM HUP` exits 3 instead of 130/143 ([sh] row 18, `t-trap.py`); the shape is at `www-setup/src/install.sh:718,794`. |
| SH-INST-13 | SH-ERR-12, amended: guard `"$@"` as `${1+"$@"}` at every forwarding site, not only `main` (posh 0.14.1 aborts `@: parameter not set` at `parse_args "$@"`; [sh] row 11, red on posh only). |
| SH-INST-14 | SH-GATE-16 (MUST for installers); use its awk check, not the kit's `LC_ALL=C grep`. Fleet hits in Applied. |
| SH-INST-15 | SH-EXP-12 plus `shellcheck -s sh` SC3009 (fires on the brace plant: R9). `k3s install.sh:408`. |
| SH-INST-18 | SH-USER-06 plus the probe order inside SH-INST-03. |
| SH-INST-21 | Not a rule: the receipt moves to the skill procedure (Applied section). |

### PS-SEC (install.ps1)

Wave-2 rules that bind and are not restated: PS-COMPAT-01/06, PS-ENC-01..03, PS-ERR-01..05, PS-NATIVE-01/02, PS-GATE-01/05..08. Floor: Windows PowerShell 5.1.26100.9444 (.NET Framework 4.8.1); pwsh 7.4.7 and 7.6.6 are the other engines. Greps run inside the repository root; widen the pathspec with a directory, e.g. `$LS 'DIR/*.ps1'`.

#### Group A: behavioural checks on three engines

**PS-SEC-01 · MUST** In every install.ps1 that extracts or runs a downloaded archive or binary, compare its SHA-256 (`Get-FileHash -LiteralPath $f -Algorithm SHA256`) with an expected digest before `Expand-Archive`, `ExtractToDirectory`, `ExtractToFile` or `& $payload`. A mismatch, an unreadable file, or an absent or blank expected digest aborts (throw; exit 4 at top level).
- *Why:* cargo-dist's order (download, then `Expand-Archive`, `installer.ps1.j2:325`) and www-setup's empty-digest path (`Verify-Checksum` warns and returns, `install.ps1:410-413`, fed by `$sha = ... else { '' }` at `:854`) both install a swapped archive.
- *Check:* `runall hash-order.ps1 -Variant nohash|failopen|closed|closed-empty` (exit 1 = tampered archive extracted). Presence grep (not order): `$LS '*.ps1' | xargs -0 -r grep -l -e Expand-Archive -e ExtractToDirectory -e ExtractToFile | tr '\n' '\0' | xargs -0 -r grep -L -e Get-FileHash -e ComputeHash`.
- *Watched:* yes. R4: `nohash` and `failopen` RED, `closed` and `closed-empty` GREEN on pwsh 7.6.6 and 5.1.26100.9444 ([ps] V4: also 7.4.7). R7: `hash.ps1` and `zipslip.ps1` RED, twin GREEN.
- *Scope:* install.ps1, 5.1 and 7.x. The grep proves presence; the behavioural run proves order.

**PS-SEC-04 · MUST** Never extract a zip with `Join-Path $dest $entry.FullName` plus `ExtractToFile` lacking a containment check. Use `[System.IO.Compression.ZipFile]::ExtractToDirectory` (after `Add-Type -AssemblyName System.IO.Compression.FileSystem` on 5.1), `Expand-Archive -LiteralPath` (name the file `.zip`: 5.1 rejects other extensions), or a per-entry loop that rejects rooted, drive-letter and `..` entries and requires `[IO.Path]::GetFullPath([IO.Path]::Combine($root, $name)).StartsWith($root + $sep, OrdinalIgnoreCase)`.
- *Why:* the manual loop wrote `evil-dotdot.txt` and `evil-backslash.txt` outside the destination on all three engines; it is also what an agent writes when told to avoid `Expand-Archive`; `dotnet-install.ps1:895-897` has that shape.
- *Check:* `runall zipcheck.ps1 -Zip zip-slip.zip -Method Manual|ZipFile|Safe|ExpandArchive` (exit 1 = a file escaped). Grep: `$LS '*.ps1' | xargs -0 -r grep -l -e ExtractToFile | tr '\n' '\0' | xargs -0 -r grep -L -e 'GetFullPath('`.
- *Watched:* yes. R4: Manual RED, ZipFile/Safe/ExpandArchive GREEN on 7.6.6 and 5.1.26100.9444; R7: `zipslip.ps1` RED, twin GREEN. `GetFullPath(` needs the open paren (a bare `GetFullPath` matched a comment in dotnet-install).
- *Scope:* older .NET Framework or Archive 1.0.1.0 builds: unverified (read only).

**PS-SEC-06 · MUST** (installers; refines PS-COMPAT-09) Touch `ServicePointManager.SecurityProtocol` only when `$PSVersionTable.PSEdition -eq 'Desktop'` and the value is not `SystemDefault`; then assign exactly `3072` (Tls12), `-bor 12288` (Tls13) only if `[enum]::GetNames([Net.SecurityProtocolType]) -contains 'Tls13'`. Never name `::Tls13`, `::Tls11`, `::Tls` or `::Ssl3` literally and never `-bor` onto a legacy value.
- *Why:* Microsoft: do not set it on .NET 4.7+, use TLS 1.2/1.3 when you must; a missing enum member throws `PropertyNotFoundException` under StrictMode Latest (measured, three engines); an unconditional assignment persists in the caller's session under iex. Scoop's `Optimize-SecurityProtocol` (`install.ps1:211-226`) is the model.
- *Check:* `runall tls.ps1` (5.1 row: simulated legacy `Ssl3, Tls` request fails with "Could not create SSL/TLS secure channel", the guarded form gives `[Tls12, Tls13]` and the request succeeds). Grep: `$LS '*.ps1' | xargs -0 -r grep -nHE -e 'SecurityProtocolType\]::(Tls13|Tls11|Tls|Ssl3)' -e "SecurityProtocol *= *'?(Ssl3|Tls|Tls11)"`.
- *Watched:* yes. R7: `tls.ps1:2-3` RED, twin GREEN; [ps] V8 for the behavioural rows.
- *Scope:* Desktop edition. The legacy default is simulated on a .NET 4.8.1 host; a real .NET < 4.7 host (Server 2012 R2) is unverified (Open round 1). pwsh 7 ignores the setting.

**PS-SEC-09 · MUST** (amends PS-ERR-05) In an iex-delivered script no function calls `exit` and no code uses `break`/`continue` outside a loop as an exit. Functions `throw` or `return` a status; one guarded exit sits at script top level:
```powershell
$IsIex = [string]::IsNullOrEmpty($PSCommandPath)
$rc = 0
try { Main } catch { [Console]::Error.WriteLine("installer: error: $($_.Exception.Message)"); $rc = 3 }
if ($rc -ne 0) { if ($IsIex) { $Global:LASTEXITCODE = $rc; return }; exit $rc }
```
- *Why:* `exit` inside an `irm | iex` script kills the interactive host on 5.1.26100.9444, 7.4.7 and 7.6.6; the scoop `break` idiom survives the prompt but swallows the failure in a non-interactive host; the single-exit shape passes both models and `-File`.
- *Check:* `runall check-iex-survival.ps1 -Path F -HostModel repl` and `-HostModel ci` (both must exit 0), and `runall ast-sec.ps1 -Dir DIR` (prints `EXIT-IN-FUNCTION`, `BREAK-OUTSIDE-LOOP`; exit 1). PS-ERR-05's grep stays a coarse locator.
- *Watched:* yes. R3 on 7.6.6 and 5.1.26100.9444: `served.ps1` (exit in function) repl RED, ci GREEN; `served-twin.ps1` (break) repl GREEN, ci RED; `served-twin-single-exit.ps1` repl and ci GREEN. [ps] V6: AST RED on 5 plant findings, GREEN on twins.
- *Scope:* install.ps1 and any script a user pastes at a prompt; `& file.ps1` call form is safe with `exit` (child scope).

#### Group B: caught by an X1-shape grep

**PS-SEC-03 · MUST** Make no verification claim the delivered `.ps1` does not perform: a header, README or docs sentence containing `SHA-256`/`sha256`/`checksum` requires a `Get-FileHash` or `ComputeHash` call in the same file, or names the verified delegate and states what stays unverified.
- *Why:* grimoire's front door says the installer "verifies the downloaded archive's SHA-256" while the generated installer has none (C8; [ps] f1).
- *Check:* `$LS '*.ps1' '*.md' | xargs -0 -r grep -liE -e 'sha-?256' -e checksum | tr '\n' '\0' | xargs -0 -r grep -L -e Get-FileHash -e ComputeHash` (output = files that claim a check and contain no hash call); prose in docs is a reading heuristic.
- *Watched:* yes. R7: `iex-fd.ps1` (the front-door copy) RED, twin GREEN.
- *Scope:* install.ps1 and the docs that describe it.

**PS-SEC-07 · MUST** Document the iex one-liner as `irm <https-url> | iex` or `iwr -UseBasicParsing <https-url> | iex`, never `(iwr ...).Content | iex`; document flags through environment variables and `& ([scriptblock]::Create((irm <url>))) -Flag`.
- *Why:* `.Content` is `byte[]` for `application/octet-stream` (GitHub release assets, `setup.grimoire.rs/ps1`), so iex evaluates numbers and the installer silently does not run; `param()` cannot be bound by iex ([ps] f2).
- *Check:* `$LS '*.ps1' '*.md' | xargs -0 -r grep -nHE -e '[.]Content *[|] *(iex|Invoke-Expression)'`; behavioural `runall iwr-iex.ps1`.
- *Watched:* yes. R7: `content-iex.ps1:3` RED, twin GREEN; [ps] V5 `iwr-iex.ps1` printed `39 76 73 78 ...` on 5.1 and 7.6.6.
- *Scope:* documentation and scripts, 5.1 and 7.x.

**PS-SEC-08 · MUST** A script documented as `| iex` (a) tests the PowerShell version in code, not by `#Requires` alone; (b) declares params with defaults only, never `Mandatory`; (c) never uses `$PSScriptRoot`, `$PSCommandPath` or `$MyInvocation.MyCommand.Path` for resources; (d) detects iex with `[string]::IsNullOrEmpty($PSCommandPath)`, never `$null -eq $MyInvocation.MyCommand.Path` once `Set-StrictMode -Version` is in effect; (e) runs the body in `& { ... }` or restores `$ErrorActionPreference`, StrictMode and `SecurityProtocol` in `finally`, and defines no global function named like a common command (`Say`, `Err`, `Warn`, `Main`).
- *Why:* `#Requires -Version 99.0` ran on all three engines under iex; a `Mandatory` param is silently empty (no prompt, no error); `$PSScriptRoot` is the empty string, so `Join-Path $PSScriptRoot x` throws; the Path formula throws "The property 'Path' cannot be found" under StrictMode Latest; iex leaves `$ErrorActionPreference = 'Stop'`, StrictMode and every function in the caller's session ([ps] f2, f4).
- *Check:* (b)(c): `$LS '*.ps1' | xargs -0 -r grep -lE -e '[|][[:space:]]*(iex|Invoke-Expression)([[:space:]]|$)' | tr '\n' '\0' | xargs -0 -r grep -nHE -e 'Mandatory' -e '[$]PSScriptRoot'`. (d): `$LS '*.ps1' | xargs -0 -r grep -l -e 'Set-StrictMode -Version' | tr '\n' '\0' | xargs -0 -r grep -n -H -e 'MyInvocation.MyCommand.Path'`. (a)(e): `runall iex-semantics.ps1` read against [ps] f2 (probes s1, s4, s4b) plus reading.
- *Watched:* (b)(c)(d) yes. R7: `iex-mandatory.ps1:2-3` RED, `iex-defaults.ps1` GREEN, `file-mandatory.ps1` (file-run script, no iex one-liner) GREEN; `strict.ps1:2` RED, twin GREEN. (a)(e) are behavioural probes ([ps] V9), not plant/twin pairs.
- *Scope:* iex-delivered scripts on 5.1 and 7.x; "documented as `| iex`" is decided by the header usage line.

**PS-SEC-11 · MUST** Do not gate an installer on `Get-ExecutionPolicy` and print no `Set-ExecutionPolicy` advice beyond `-Scope Process`; document `powershell -ExecutionPolicy Bypass -c "irm <url> | iex"` for hosts that block scripts. PS-GATE-07 owns the ban on persistent policy changes.
- *Why:* iex text is not subject to the policy (measured under `-ExecutionPolicy Restricted`: harmless iex ran, the gate threw, `-File` was refused by the policy itself), and [about_Execution_Policies 7.6](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Execution_Policies.md): "isn't a security boundary, it's defense in depth".
- *Check:* `$LS '*.ps1' | xargs -0 -r grep -nH -e Get-ExecutionPolicy`.
- *Watched:* yes. R7: `policy-gate.ps1:3` RED, twin GREEN; [ps] V11 on 5.1.
- *Scope:* install.ps1; the stock Windows-client default is Restricted.

**PS-SEC-05 · SHOULD** Pass `-LiteralPath` to `Get-FileHash` and `Expand-Archive` (and to `Test-Path`, `Remove-Item` on computed paths); never `-Path` or a positional path.
- *Why:* `[` and `]` are wildcards: `Get-FileHash -Path 'ocx[1].zip'` returns `$null` with an empty error list on all three engines. SHOULD because PS-SEC-01's fail-closed verifier turns that into an abort (C10).
- *Check:* `$LS '*.ps1' | xargs -0 -r grep -nHE -e 'Get-FileHash( +-Algorithm +[A-Za-z0-9]+)? +-Path' -e 'Expand-Archive +-Path'`; positional forms need `runall ast-sec.ps1 -Dir DIR` (`NO-LITERALPATH`, exit 1).
- *Watched:* yes. R7: `lp.ps1:1-2` RED, twin GREEN; [ps] V6 AST.
- *Scope:* 5.1 and 7.x.

**PS-SEC-10 · SHOULD** Keep `Invoke-Expression`/`iex` out of a delivered `.ps1` unless a front door has hash-verified the second stage in memory and carries a justified `SuppressMessageAttribute('PSAvoidUsingInvokeExpression', ...)`. Run `PSAvoidUsingInvokeExpression` in the gate. Do not count `& ([scriptblock]::Create($text))` as a fix by itself.
- *Why:* the rule detects a token (Severity Warning, always enabled, [rule doc](https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/docs/Rules/AvoidUsingInvokeExpression.md)); the scriptblock form has the same power and the same host-kill (C10).
- *Check:* `runall pssa.ps1 DIR` (= `Invoke-ScriptAnalyzer -Path DIR -Recurse -IncludeRule PSAvoidUsingInvokeExpression`, exit 1 on a finding). Grep: `$LS '*.ps1' | xargs -0 -r grep -L -e 'SuppressMessage.*PSAvoidUsingInvokeExpression' | tr '\n' '\0' | xargs -0 -r grep -nHE -e '^[^#]*(Invoke-Expression|[|;(] *iex( |$))'`.
- *Watched:* yes. R7: three plants RED (`content-iex.ps1:3`, `iex-alias.ps1:2`, `iex-fd.ps1:12`), twins GREEN; R10 shows PSSA's only catches on the PS plants are these three.
- *Scope:* PSScriptAnalyzer 1.25.0.

#### Group C: reading heuristic

**PS-SEC-02 · MUST** Take the expected digest from a source other than the archive's own download response: embedded in the script, inline in a manifest served from a different origin than the archive, or covered by a signature. A same-origin sidecar is allowed only when the header and docs call it corruption detection, not a trust root.
- *Why:* a compromised release replaces the archive and its sidecar together; www-setup's `dist.json` from `setup.ocx.sh` (`install.ps1:854`, pin `:547-574`) is the stronger model, setup-grimoire's `<asset>.sha256` (`install.ps1:53-56`) the weaker.
- *Check:* reading heuristic "digest provenance trace": for each `Get-FileHash` comparison, find where the expected value is fetched and compare that host with the archive URL host. It cannot be a runnable check: a value's origin is a runtime fact and no lexical pattern separates a manifest on another host from a sidecar on the same host.
- *Watched:* no (reading only).
- *Scope:* install.ps1.

#### Retired or merged PS-SEC IDs

| ID | Disposition |
|---|---|
| PS-SEC-12 | Retired. Reconciles SH-CI-11 and PS-ENC-03 (C2): amendment to SH-CI-11, check is the SH-CI-11 grep pair, R7 `runner-addcontent.ps1:1` RED, `runner-append.ps1` GREEN; behavioural `runall runner-file.ps1`. |
| PS-SEC-13 | Merged into PS-SEC-04 (`.zip` extension on 5.1). |

## Applied to the fleet and exemplars

Fleet HEADs: www-setup@a251c3631047, grimoire@4650ad830375, setup-grimoire@1259e35b2550. Exemplars: rustup@61271d00a979, docker-install@2b32480025b2, deno_install@41d4676f8677, k3s@82a6ddcd820b, Scoop/Install@1e2f334083d6, dotnet/install-scripts@e5cf1dd2d154, vcpkg@e456309491fd, cargo-dist v0.33.0.

### Satisfied

| Rule | Where |
|---|---|
| SH-INST-01 | `www-setup:src/install.sh:913`, `setup-grimoire:.github/scripts/install.sh:121`, shipped `grimoire-installer.sh` last line `download_binary_and_run_installer "$@" \|\| exit 1`, `rustup:rustup-init.sh:931`, `docker-install:install.sh:813`, `k3s:install.sh:1206-1218` (group). Front door `grimoire:docs/public/install.sh` is safe by construction (its only effectful statement is the last line, `:35`). |
| SH-INST-03 | cargo-dist 0.33.0 with `sha256sum` present: tampered archive rc 1, "checksum mismatch" (R6). www-setup names a manifest digest from another origin (its fail-closed behaviour in sh was not run). |
| SH-INST-05 | `rustup:rustup-init.sh:742,776` (`check_help_for`, `--help all`); `setup-grimoire:.github/scripts/install.sh:58`; www-setup curl branch `:343-345` (`--proto =https --tlsv1.2`, but unprobed). |
| SH-INST-06 | `www-setup:src/install.sh:296` (`assert_https_url`). |
| SH-INST-08 | `rustup:rustup-init.sh:386` (Rosetta by value); www-setup uname/Rosetta chain and exit 7 (`:249-278`). |
| SH-INST-09 | `www-setup:src/install.sh:27-36` (the 0-7 table). |
| SH-INST-11 | `rustup:rustup-init.sh:196-206` (`</dev/tty` only when stdout is a terminal). Fleet installers have no prompts. |
| SH-INST-12 | Fleet 4 of 4 install to user space; the shipped cargo-dist installer and the reference leave an empty second-run rc diff. |
| SH-INST-16 | `setup-grimoire:.github/scripts/install.sh:51-58` (`--retry 3 --retry-delay 2 --retry-connrefused`, `--retry-all-errors` forbidden in a comment). |
| SH-INST-17 | `k3s:install.sh:378` (302 `Location` parse). |
| PS-SEC-01/02 | `www-setup:src/install.ps1:880` (verify) before `:885` (extract); inline digest from another origin `:854`. `setup-grimoire:.github/scripts/install.ps1:53-61` hash before `Expand-Archive` (same-origin sidecar: PS-SEC-02 label needed). |
| PS-SEC-03 | `www-setup:src/install.ps1:14-17` header matches the code. |
| PS-SEC-04 | `www-setup:src/install.ps1:427-467` (`Expand-ZipSafely`). |
| PS-SEC-06 | Scoop `install.ps1:211-226`; vcpkg `scripts/bootstrap.ps1:53-55` (helper binary). |
| PS-SEC-07/08 | `www-setup:src/install.ps1:22-25` (documented one-liner and `[scriptblock]::Create` flag form), `:742` (`Get-Variable -Name Version -Scope 1`); cargo-dist param block defaults only (`:38-43`). |
| PS-SEC-09/11 | Scoop `Exit-Install` `:91-104` (interactive-safe, guarded by `-not $env:CI`); no audited installer calls `Set-ExecutionPolicy`. |

### Violated

Reproducers are read-only against fleet code (owner Q6: reported, never fixed).

| Rule | Where | Defect and evidence |
|---|---|---|
| SH-INST-03 | shipped `grimoire-installer.sh` v0.14.3 (cargo-dist 0.33.0), `:1854` | Skips the check when `sha256sum` is absent. R6: tampered archive installs, rc 0, binary prints PWNED. |
| SH-INST-04 | `grimoire:docs/public/install.sh:4-7` | Claim holds only while `sha256sum` exists (C8). `[inst]` labelled the delegate "sidecar/manifest" (C4). |
| SH-INST-05 / SH-USER-10 | `www-setup:src/install.sh:352,354`; `grimoire:docs/public/install.sh:29` (and the copies at `grimoire-duo@c045c195abd2:docs/public/install.sh:29`, `setup-grimoire@1259e35b2550:site/sh:29`) | Unprobed wget flags. R8, alpine:3.22: www-setup rc 3 `unrecognized option: secure-protocol=TLSv1_2`; front door rc 1 `unrecognized option: https-only`. |
| SH-INST-05 | shipped `grimoire-installer.sh` `:1828,1830,1836` | `curl -sSfL` and plain `wget` on the archive hop: no `--proto`, no `--tlsv1.2` (R6 grep: none). |
| SH-INST-08 | shipped `grimoire-installer.sh` `:1532,:1541` | `sysctl hw.optional.arm64 2> /dev/null \|\| true \| grep -q ': 1'` (R6 grep). Identical in cargo-dist v0.33.0 and main. |
| SH-INST-08 | `www-setup:src/install.sh:271-278` | libc defaults to `gnu` when neither `ldd` nor musl evidence exists (static musl image gets the gnu asset). Reading only, not run. |
| SH-ERR-16 (was SH-INST-10) | `www-setup:src/install.sh:718,794`; `grimoire:docs/public/install.sh:24` | `trap cleanup EXIT INT TERM HUP` returning handler (reading; plant shape exits 3). Front door traps `EXIT INT TERM` only, so HUP leaks the temp file ([sh] f6, `t-trap.py`, not re-run). |
| SH-GATE-16 (was SH-INST-14) | `grimoire:docs/public/install.sh:2` (em dash); `www-setup:src/install.sh` (35 non-ASCII lines) | R8: `mx t-parse.sh` red=1 of 11 on both (yash 2.52 in the C locale: "cannot read input"). |
| SH-ERR-12 amended (was SH-INST-13) | `www-setup:src/install.sh:913` `main "$@"` under `set -eu` (`:37`) | Same shape as the posh plant (reading; `setup-grimoire:82` `${curl_args[@]}` is never empty, a false positive). |
| SH-INST-09 | `grimoire:docs/public/install.sh`, `setup-grimoire:.github/scripts/install.sh` | No `# Exit:` header; only `exit 1` (reading). |
| SH-USER-06 | `setup-grimoire:.github/scripts/install.sh:98-99` | `sha256sum ... \| awk \|\| shasum ...` falls back only because `set -o pipefail` is on (`:9`); owned by SH-USER-06. |
| SH-INST-12 / SH-EMIT-16 | `ocx self setup` 0.6.5 | Writes five rc files for a bash user (`$KIT/rt-rc-twice.sh`, throwaway HOME; [sh] f9, run by the sub-researcher, not re-run). |
| SH-INST-17, -11, -08, SH-EXP-12 | deno `install.sh:67`, `:117`, `:19`; oras `:6-7`; k3s `install.sh:408` | Exemplar violations: `curl -s` body as version, unguarded `</dev/tty`, default arm, brace range. |
| PS-SEC-01 | shipped `grimoire-installer.ps1` v0.14.3 `:317`; `www-setup:src/install.ps1:410-413` | No hash call before `Expand-Archive` (R11: 0 hash tokens); empty digest skipped. R4: `nohash` and `failopen` RED on 7.6.6 and 5.1.26100.9444. Also Scoop `:317`, deno_install `:46-48`, dotnet-install `:895-897`. |
| PS-SEC-03 | `grimoire:docs/public/install.ps1:3-6`; `grimoire:docs/src/content/docs/installation.md:49-52`; live `https://setup.grimoire.rs/ps1` | Claims SHA-256 verification; the delegate has none (C8). R7 grep RED on the front-door copy. |
| PS-SEC-05 | `www-setup:src/install.ps1:415`; `setup-grimoire:.github/scripts/install.ps1:55,61`; shipped `:317` | `-Path`. |
| PS-SEC-06 | `www-setup:src/install.ps1:337,355` | Unconditional `Tls12 -bor Tls13` literal under StrictMode Latest (`:63`). Shipped installer `:612-613` only checks that `Tls12` exists, sets nothing. |
| PS-SEC-08(e) | `grimoire:docs/public/install.ps1:10`; `www-setup:src/install.ps1:63-64,173-188` | Leaks `$ErrorActionPreference = 'Stop'`, StrictMode Latest and global `Say/Err/Warn/Main` into the caller's session ([ps] V9 s4). |
| PS-SEC-09 | `www-setup:src/install.ps1:182` (`exit $Code` in `Err`), `:734`; shipped `grimoire-installer.ps1:642` (`exit 1`) and `:87` (`Exit`) | Kills the host under `irm \| iex`. R3 plant shape repl RED on 7.6.6 and 5.1.26100.9444; [ps] V2 on the real www-setup file. |
| PS-SEC-10 | `grimoire:docs/public/install.ps1:12` | `Invoke-Expression (Invoke-RestMethod ...)` with no verification and no suppression. |
| PS-SEC-11 | shipped `grimoire-installer.ps1:599-608`; Scoop `install.ps1:200-207` | Policy gate and `Set-ExecutionPolicy RemoteSigned -scope CurrentUser` advice ([ps] V11). |
| SH-CI-11 amended | `www-setup:src/install.ps1:721`; `setup-grimoire:.github/scripts/install.ps1:70` | `Add-Content` onto `$GITHUB_PATH`: GREEN for ASCII, RED for a non-ASCII profile path on 5.1. |

### New commitments

- **ocx emitter and `ocx self setup`.** Reported with reproducers, not fixed (Q6): the five-rc-file write for a bash user (SH-INST-12 / SH-EMIT-16). Once ocx ships an installer pair of its own (today the installers live in `www-setup/src`), the pair runs the kit and the receipt below before release.
- **Installers (www-setup, grimoire front doors, setup-grimoire).** The violated table is the work list. Rules go live as the `installer-script` skill reads this file; nothing in the fleet is edited by this program.
- **Wave-2 amendments to apply at synthesis.** SH-ERR-12 (guard `"$@"` at every forwarding site); SH-CI-11 (one writer, `AppendAllText`); PS-ERR-05 (single exit, `IsNullOrEmpty($PSCommandPath)`); PS-COMPAT-09 (point at PS-SEC-06); SH-ERR-25 (installer kind is MUST via SH-INST-09); `shell-dialect.md:111` (X11 swap); `installers.md` (cargo-dist class "pinned"); `shell-installer/sh-contract.md` f10 (stock images have only `sha256sum`).
- **Kit porting.** Port `$KIT/tools/*` and `$PSKIT/*.ps1` into the skill's `checks/`. Known defects to fix on the way: `$KIT/tools/lint-grep.sh` writes `/tmp/lg.out` (use `mktemp`); `$PSKIT/greps.sh` uses `grep -r --include`/`-Z` (replace with the X1 forms in R7, script `$CONS/run-r7.sh`).
- **CI for installer repos.** (1) Release job: `dash -n` and `busybox ash -n` on the rendered generated installer; (2) `t-tamper` against the rendered installer with `sha256sum` off PATH; (3) `check-iex-survival` in repl and ci models and `hash-order` on 5.1 and 7.x for install.ps1; (4) the X1 greps; (5) a real-busybox smoke (alpine:3.22, no curl) for every installer that has a wget branch.

### The installer-script skill: procedure and receipt (not rules)

Procedure, sh then ps1: classify hand-written or generated (generated: run the checklist below, do not edit the output). Write the header first: usage one-liner, floor (dash 0.5.12, busybox ash 1.37, bash 3.2 `--posix`; Windows PowerShell 5.1), `# Exit:` table, options, environment names, integrity class. Structure: `set -u` (`-e` only if SH-ERR-23 allows), small functions, `main ${1+"$@"}` last; for ps1, iex-safe body per PS-SEC-07/08 with one guarded exit. Downloaders: probe curl and wget, branch explicitly, https assertion, BusyBox refusal; ps1: `-UseBasicParsing`, guarded TLS block, bounded custom retry (5.1 has no `-MaximumRetryCount`). Integrity: digest from outside the archive's response, hash before extract, fail closed. Platform: total `case`, exit 7, override variable. Traps (SH-ERR-15/16), `/dev/tty` prompts, user-space install, rc by marker block. Run the kit under 11 interpreters and 3 PowerShell engines, plus `shellcheck -s sh` and PSScriptAnalyzer (green lint is necessary, not sufficient). The MUST rows the skill carries: SH-INST-01, -03..-09, -11, -12, -20 and PS-SEC-01..04, -06..-09, -11, plus the carried PS-COMPAT-01/06, PS-ENC-01..03, PS-ERR-05 (amended), PS-NATIVE-01/02, PS-GATE-07.

Receipt (one block per installer):
```text
installer:        path, sha256, line count, non-ASCII bytes
class:            hand-written | generated(<tool> <version>)
integrity_class:  pinned | manifest | sidecar | gpg | none      digest origin host vs archive host
interpreters:     11 listed with versions; red=K of 11 per check (trunc, tamper, flags, platform, rc, root, parse, noargs)
signals/tty:      t-trap INT/TERM/HUP, t-tty ctty/noctty
powershell:       engines (5.1 build, pwsh 7.4/7.6 builds); check-iex-survival repl+ci exit codes; hash-order nohash/closed-empty; zipcheck Manual/Safe; PSSA version + rule exit
greps:            X1 greps, empty = pass
static:           shellcheck rc, PSSA rc
unverified:       every macOS or legacy-Windows claim, marked "read only"
```

### Generated installer audit checklist (cargo-dist 0.33.0)

Result column is the shipped grimoire v0.14.3 `grimoire-installer.sh` (row 8: its `.ps1`).

1. TLS flags on the archive hop: `grep -nE 'curl .*(--proto\|--tlsv1)' INSTALLER` (R6). FAIL: none; `curl -sSfL`, plain `wget`.
2. Digests embedded: `dist-manifest.json` plus `grep -c checksum`. OK: pinned class, `:220-285`.
3. Fail-open when the hash tool is missing: tampered archive, `sha256sum` off PATH (R6). FAIL: installs, rc 0.
4. Rosetta precedence: `grep -nE 'sysctl[^|]*\|\|[^|)]*\|' INSTALLER` (R6). FAIL: `:1532`, `:1541`.
5. Signals: `python3 -I $KIT/tools/t-trap.py INSTALLER dash INT|TERM|HUP`. FAIL: no trap, temp dir leaked ([sh] f6).
6. Truncation guard: last non-comment line (R6). OK: `download_binary_and_run_installer "$@" || exit 1`.
7. Rendered file parses on dash and busybox ash: `sh -n` in the release job. Not enforced by cargo-dist; add to the host job ([issue 2339](https://github.com/axodotdev/cargo-dist/issues/2339)).
8. ps1 hash: PS-SEC-01/03. FAIL: none ([ps] f1; open upstream PR 2497).
9. Which hops carry `--proto`: front door and generated CI yes; archive hop no. Partial.
10. Pin the generator: `dist_version` in `dist-manifest.json`. OK: 0.33.0.

## AI-agent failure modes

Ranked by measured corpus frequency (n of N audited installers or files), then by whether a linter sees it. R9/R10: shellcheck 0.11.0 reports the defect on 1 of 26 sh plants (23 fully silent) and PSSA default rules catch only the `iex` token on 3 of 12 PS plants, so "lint-green" is not evidence.

| Rank | Mistake | Frequency evidence | Mechanical check |
|---|---|---|---|
| 1 | No integrity check, or a check that fails open (missing tool, blank digest) | sh: 9 of 17 corpus installers have none, cargo-dist skips when `sha256sum` is absent; ps1: 4 of 6 audited extractors have no hash call (cargo-dist, Scoop, deno_install, dotnet-install), www-setup skips an empty digest | SH-INST-03 `mx t-tamper.sh`; PS-SEC-01 `runall hash-order.ps1` |
| 2 | Header or docs claims a verification the code lacks (hallucinated safety) | grimoire ps1 front door, `installation.md`; shipped ps1 has 0 hash tokens | SH-INST-04 and PS-SEC-03 greps (R7) |
| 3 | No TLS floor, or unprobed `--https-only`/`--secure-protocol`/`--tlsv1.2` copied from answers | 16 of 17 installers do not probe; 4 fleet files break on busybox wget | SH-INST-05 `mx t-flags.sh`; R8 on alpine:3.22 |
| 4 | No exit taxonomy | 16 of 17 installers | SH-INST-09 header grep |
| 5 | `-Path` instead of `-LiteralPath` for hash and extract | 4 of 4 audited ps1 callers | PS-SEC-05 grep |
| 6 | Install steps at top level, no `main` | 5 of 17 (linear) | SH-INST-01 `mx t-trunc.sh` (a 60% cut passes plants) |
| 7 | Returning trap handler or missing HUP; `trap cleanup EXIT INT TERM` | 9 of 17 have no trap; returning shape in www-setup, docker rootless; front door lacks HUP | SH-ERR-16 `t-trap.py` |
| 8 | `exit` or `break` in an iex helper; `$null -eq $MyInvocation.MyCommand.Path` under StrictMode | www-setup, cargo-dist (both generated and shipped) | PS-SEC-09 `check-iex-survival.ps1` repl and ci, `ast-sec.ps1` |
| 9 | Unconditional `SecurityProtocol` assignment naming `Tls13` | www-setup `:337,355` | PS-SEC-06 grep |
| 10 | Silent platform fall-through or wrong Rosetta precedence | deno, oras, cargo-dist | SH-INST-08 `mx t-platform.sh` |
| 11 | Global side effects of iex (`$ErrorActionPreference`, StrictMode, helper functions), `#Requires`/`Mandatory`/`$PSScriptRoot` | grimoire front door `:10`, www-setup `:63-64,173-188` | PS-SEC-08 greps and `iex-semantics.ps1` |
| 12 | Bare `read` or unguarded `</dev/tty` in a piped installer | deno `:117`; rustup guards | SH-INST-11 `t-tty.sh` |
| 13 | Execution-policy gate or `Set-ExecutionPolicy` advice | cargo-dist ps1, Scoop | PS-SEC-11 grep |
| 14 | `(iwr ...).Content \| iex` | 0 audited files (a documented agent tell) | PS-SEC-07 grep |
| 15 | Hand-rolled zip loop "to avoid Expand-Archive" | dotnet-install `:895-897` | PS-SEC-04 grep and `zipcheck.ps1 -Method Manual` |
| 16 | `curl -s` for the latest version, REST API for latest | deno `:67` | SH-INST-17 grep |
| 17 | Wrapping the PowerShell installer in `main` against truncation (sh habit) | none needed: `irm` buffers the body ([ps] f2) | reading; no check needed |
| 18 | Trusting a generated installer and hand-editing its output; "tested" after one run on the host shell | grimoire ships cargo-dist output unaudited | SH-INST-20 checklist; the receipt's 11-interpreter line |

## Open questions

### Owner decisions (default the program applies)

1. **grimoire ps1 front-door claim.** Options: make it true (the front door verifies, or adopt cargo-dist once [PR 2497](https://github.com/axodotdev/cargo-dist/pull/2497) ships and pin it) or drop the sentence in `docs/public/install.ps1:3-6`, `installation.md:49-52` and `setup.grimoire.rs/ps1`. Default: PS-SEC-03 flags it as violated; no edit is made (Q6). Recommended: drop the sentence now, re-add it when the check exists.
2. **Fail-open on a missing hash tool in the shipped cargo-dist sh installer.** Default: fail closed (SH-INST-03), so v0.14.3 is non-compliant. Options for the owner: wrap or patch the rendered installer, or accept and document. macOS (`shasum` only, unverified: read only) decides whether the hole is the default there.
3. **Same-origin sidecar as integrity class** (setup-grimoire). Default: allowed if labelled corruption detection (SH-INST-04, PS-SEC-02).
4. **Front door verifies its own second stage?** Default: not required, SHOULD (PS-SEC-10), because the release publishes no digest for the installer itself.
5. **TLS floor.** Default: `--tlsv1.2` for curl and Tls12/Tls13 for 5.1; TLS 1.3 needs its own probe ([cargo-dist issue 457](https://github.com/axodotdev/cargo-dist/issues/457) open since 2023-09-27).
6. **Wave-2 amendments** (list under New commitments). Default: applied at synthesis; the owner may overturn any one.

### Subareas needing another research round

- **Windows legacy TLS**: does a real .NET Framework < 4.7 host (Server 2012 R2/2016 image) default to a legacy protocol set, and does the PS-SEC-06 guard work there? Needs a legacy Windows host; the legacy default is only simulated on 4.8.1 now.
- **macOS installer facts**: does stock macOS lack `sha256sum`, what does `sysctl -n hw.optional.arm64` return on Intel and under Rosetta, and does the Rosetta precedence bug produce a wrong target on a real Mac? Needs a macOS runner or host (a probe workflow on a macos runner fits the standing CI delegation).
- **Zip-slip on older stacks**: is `Expand-Archive` (Archive 1.0.1.0) on .NET Framework builds older than 4.8.1 vulnerable, as the `www-setup:424-426` comment says? No advisory was found; needs an old build to test.
- **posh and truncation**: why does the prefix sweep report `vacuous=1` on posh 0.14.1, and does a cut installer run partially there?
- **cargo-dist config surface**: can 0.33.0 templates be overridden per project so checklist rows 1, 3, 4, 5 are fixed without forking, or must grimoire wrap or replace the shell installer? Needs a read of the cargo-dist installer-config surface.
- **Signature-based root of trust**: can an install.sh verify a minisign/cosign/Authenticode signature using only tools stock on the target, so a front door can verify its second stage (PS-SEC-10, SH-INST-04)? No installer in the corpus does it.
- **Root-requiring installers**: when may an installer escalate (docker, k3s escalate; 3 of 17 do), and how is `sudo` use verified? SH-INST-12 scopes to user-space installers only.

## Sub-artifacts

- [shell-installer/sh-contract.md](shell-installer/sh-contract.md): the install.sh dive (SH-INST-01..21 candidates, the 11-interpreter kit, the 17-installer pin table, the cargo-dist 0.33.0 audit, fleet defects with reproducers).
- [shell-installer/ps1-front-door.md](shell-installer/ps1-front-door.md): the install.ps1 dive (PS-SEC-01..13 candidates, the verdict on grimoire's front-door claim, iex semantics, TLS, zip-slip, hash-order, runner-file runs V1-V14).

## Key sources

1. https://raw.githubusercontent.com/rust-lang/rustup/61271d00a979/rustup-init.sh : main-last, `check_help_for`, `--help all`, Rosetta by value, `/dev/tty` guard.
2. https://raw.githubusercontent.com/docker/docker-install/2b32480025b2/install.sh : the truncation-guard comment at `:811-813`.
3. https://raw.githubusercontent.com/axodotdev/cargo-dist/v0.33.0/cargo-dist/templates/installer/installer.sh.j2 : the audited shell template (downloader, Rosetta, checksum code).
4. https://raw.githubusercontent.com/axodotdev/cargo-dist/v0.33.0/cargo-dist/templates/installer/installer.ps1.j2 : no hash code, `Expand-Archive`, `exit 1`, policy gate.
5. https://raw.githubusercontent.com/axodotdev/cargo-dist/v0.33.0/book/src/artifacts/checksums.md : the generator's own statement of what its checksums are worth.
6. https://github.com/axodotdev/cargo-dist/pull/2497 : the open upstream fix for ps1 checksum verification.
7. https://curl.se/docs/manpage.html : `--retry-all-errors` since 7.71.0, `--retry-connrefused`, `--proto`.
8. https://busybox.net/downloads/busybox-1.37.0.tar.bz2 : `networking/wget.c`, the "certificate validation not implemented" note.
9. https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sh.html : POSIX.1-2024 `sh -s`, the pipe form.
10. https://raw.githubusercontent.com/dotnet/docs/main/docs/framework/network-programming/tls.md : do not set `SecurityProtocol` on .NET 4.7+ (ms.date 2026-06-04).
11. https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Execution_Policies.md : "isn't a security boundary".
12. https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Utility/Invoke-Expression.md : "evaluated and run in the current scope".
13. https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/docs/Rules/AvoidUsingInvokeExpression.md : the token lint, severity and suppression.
14. https://spin.atomicobject.com/security-spectrum-curl-sh/ : why same-origin checksums add little (2016-12-12).
15. https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases : the `releases/latest/download` redirect contract.
