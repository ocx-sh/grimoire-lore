---
title: "install.sh contract: truncation, integrity, TLS flags, platform maps, traps, prompts and rc edits (SH-INST)"
topic: "shell scripting across operating systems and shells; POSIX sh installer scripts delivered by curl | sh, generated (cargo-dist) installers, installer exit taxonomy"
agent: "W3-1 installer/sh-contract"
model: sonnet
date_researched: 2026-10-11
sources_count: 26
fixtures: "/home/mherwig/.cache/research-lang/shell-tools/fixtures/sh-contract/"
scope: |
  Covers rows M-N-01..M-N-12 and M-D-09 (the sha256 tool probe): main-last truncation guard, integrity source, TLS flags behind capability probes, platform mapping, exit taxonomy, traps, /dev/tty prompts, root and rc-file edits, retry, latest-version resolution, posh and empty "$@", and the audit checklist for generated (cargo-dist 0.33.0) installers.
  Measured on 11 POSIX interpreters (dash 0.5.12, busybox ash 1.35 and 1.37, mksh R59c, ksh93u+m x2, yash 2.52, posh 0.14.1, bash 3.2 and 5.2 --posix, zsh 5.9 --emulate sh), 8 Linux images, real busybox wget (alpine:3.22), the real shipped grimoire-installer.sh v0.14.3, and a real ocx 0.6.5. Builds on wave 2 by rule ID.
  Not covered: the ps1 half (see ps1-front-door.md, PS-SEC-nn), macOS behaviour (no macOS host: every macOS claim is "unverified: read only"), execution of the 17 corpus installers (they need per-installer network stubs, so the truncation sweep is vacuous on all of them).
---

# install.sh contract (SH-INST)

Date 2026-10-11. Fixture root `FX/` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/sh-contract/`. Wave-2 rules are cited by ID, not restated: SH-DIAL-04 (the matrix and the T3 header), SH-ERR-12 (empty `"$@"` guard), SH-ERR-15/16 (traps), SH-ERR-18 (forbidden exit codes), SH-ERR-23 (installer prologue), SH-ERR-25 (exit kinds), SH-USER-06/07/10 (probes), SH-GATE-16 (ASCII), SH-EMIT-16..23 (the rc contract), and X19 (SH-EMIT-19 wins over SH-USER-12). New rule IDs below are SH-INST-01..SH-INST-21. "Watched" in a rule means its verification was RUN on a planted violation and went red, and on the compliant twin and stayed green.

Reading key. `ref` = `FX/ref/install.sh`, a 303-line POSIX sh installer for a fictional "toolx", written for this study as the compliant twin. `plant/X.sh` = the reference with exactly one defect substituted in by `FX/plant/mk.sh` (the script fails if a substitution does not apply). `mx` = `FX/tools/mx.sh CHECK INSTALLER`, which runs a check under the 11 interpreters and prints `SUMMARY ...: red=K of 11`. Corpus cites use the audit keys of `shell-audit/installers.md` (`RUSTUP:931` = rust-lang/rustup@61271d00a979:rustup-init.sh:931); fleet HEADs: www-setup@a251c3631047, grimoire@4650ad830375, setup-grimoire@1259e35b2550.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Truncation: main last, and what actually tests it](#f1)
   2. [Integrity: five root-of-trust classes, and cargo-dist is "pinned", not "sidecar"](#f2)
   3. [TLS flags, curl and wget capability probes, and busybox](#f3)
   4. [Platform mapping: the Rosetta precedence bug, musl, and silent fall-through](#f4)
   5. [Exit taxonomy](#f5)
   6. [Traps: the returning handler](#f6)
   7. [Prompts under curl | sh, and /dev/tty](#f7)
   8. [posh and empty "$@"](#f8)
   9. [Root, PATH and rc edits (the rc contract applied)](#f9)
   10. [Retry, latest-version resolution, sha256 tool probe](#f10)
   11. [ASCII, bashisms and the parse matrix](#f11)
   12. [The 17-installer pin table](#f12)
   13. [Fleet defects with reproducers](#f13)
   14. [Generated installers: the cargo-dist 0.33.0 audit](#f14)
   15. [The installer-script skill: procedure and receipt](#f15)
3. [Normative guidance candidates](#normative)
4. [Verification runs](#verification)
5. [Exemplar evidence](#exemplars)
6. [AI-agent angle](#ai)
7. [Contested / evolving](#contested)
8. [Sources](#sources)

## Summary

- Put all code in functions and make the last non-comment line `main ${1+"$@"}`. A `curl | sh` cut anywhere then runs nothing. The check of record is a sweep of every line prefix and the last 60 byte prefixes (`FX/tools/t-trunc.sh`); a single 60% cut misses the defect (`plant/linear.sh` is only PARTIAL at 70/80/90%).
- A static "main is last" check is a layout heuristic with a high false-positive rate on real installers. Use it to point a reader, never as the gate.
- `bash -c "$(curl ...)"` (Homebrew's form) is not truncation-safe: the shell runs the commands it parsed, then hits a syntax error, and a partial directory was already created. State that in the installer's docs or switch to download-then-run.
- cargo-dist 0.33.0 embeds per-archive sha256 digests in the generated installer (class "pinned", from the dist manifest). The prior audit labelled it "sidecar/manifest"; that is corrected here. The same installer fails OPEN when `sha256sum` is absent: on the real v0.14.3 grimoire installer a tampered archive installed with rc=0 once `sha256sum` was off PATH.
- A verifier must fail closed in three cases: no hash tool, no expected digest, digest mismatch. Tamper test: `FX/tools/t-tamper.sh`; the two plants (`nohash`, `failopen`) are red on 11 of 11 interpreters.
- Name the root of trust in the header: pinned, manifest (different origin), sidecar (same origin), GPG, none. A same-origin sidecar detects corruption, not a hostile origin; cargo-dist's own book and Spin's 2016 article say so.
- Add TLS flags only after a capability probe. `curl --tlsv1.2` appears only under `curl --help all` on curl 7.76.1, 7.88.1, 8.3.0, 8.5.0 and 8.22.0 (plain `--help` lists it only on 7.61.1); rustup greps for the string `--help all` (RUSTUP:776). GNU wget 1.14 rejects `--https-only`; busybox wget rejects both `--https-only` and `--secure-protocol` (alpine:3.22 busybox 1.37.0, rc=3 in www-setup).
- busybox wget TLS depends on the build: the alpine:3.22 build uses `ssl_client` and validates certificates; the official `busybox:1.37` image prints "TLS certificate validation not implemented" and accepts a self-signed certificate. The reference detects that message and refuses a same-origin sidecar (rc 4) unless a pinned digest is supplied.
- `curl --retry-all-errors` needs curl 7.71.0 (absent on 7.61.1, rc 2). `--retry 3` retries 5xx, not 404; `--retry-connrefused` is what makes connection-refused retry (measured: elapsed 0 s without, 2 s with). Do not use `--retry-all-errors` without a probe.
- Platform detection must be total: every `uname -s`/`uname -m` combination either maps or exits 7 (the reference's platform taxonomy), with a `TOOLX_INSTALL_TARGET` override. cargo-dist's Rosetta test `if sysctl hw.optional.arm64 2>/dev/null || true | grep -q ': 1'` has the wrong precedence: `||` binds looser than `|`, the `if` tests sysctl's exit status, and sysctl's stdout leaks. It is byte-identical in v0.33.0 (2026-09-11) and on main at 2026-10-11.
- Exit taxonomy for installers: 0 ok, 1 generic, 2 usage or missing tool, 3 network, 4 checksum, 5 extract, 6 setup, 7 platform, plus 129/130/143 for HUP/INT/TERM through traps. 1 of 17 corpus installers documents any taxonomy. Document it in a `# Exit:` header.
- `trap cleanup EXIT INT TERM HUP` hides the signal: the installer exits 3 (plant `trapsig`, rc=3), not 130/143. The pattern is `on_exit(){ rc=$?; trap - EXIT; cleanup; exit "$rc"; }` plus `trap 'exit 130' INT` and the other two. Watched with `t-trap.py` (group signal, hanging stub curl).
- Prompts under `curl | sh`: stdin is the script. A bare `read` eats the next script lines on 8 shells in a linear script and gets EOF in a main-last script (the prompt silently auto-answers). Probe `(: </dev/tty) 2>/dev/null` before redirecting from `/dev/tty`; deno's unguarded `</dev/tty` (DENO:117) exits 2 with a tty stdout and no controlling terminal.
- Guard `"$@"` at EVERY forwarding site, not only in `main`: posh 0.14.1 aborts with "@: parameter not set" on an unguarded empty `"$@"` under `set -u`. The first draft of the reference failed on posh at `parse_args "$@"` inside `main`.
- No `sudo`, no blind `>> ~/.bashrc`; edit rc files with a marker block, in place, once. Run twice against a throwaway HOME the rc diff must be empty (reference: empty; real `ocx self setup` 0.6.5: empty diff but it wrote five rc files for a bash user, `.profile`, `.zprofile`, `.zshrc`, `.bashrc` and a PowerShell profile).
- ASCII only (SH-GATE-16): yash 2.52 in the C locale cannot read non-ASCII bytes, even in a comment. grimoire's front door `docs/public/install.sh:2` (one em dash in a comment) and www-setup's installer (35 lines) both fail `yash -n` in the C locale.
- Generated installers need an audit, not trust: TLS flags, digest presence, fail-open on missing `sha256sum`, Rosetta precedence, no trap, `sh -n` of the rendered file in the release job (cargo-dist issue 2339 shipped a corrupted installer), and which hops carry `--proto`.

## Findings

<a id="f1"></a>
### 1. Truncation: main last, and what actually tests it

Rule: every statement outside a function is a risk, because a download cut at a line boundary runs everything it received. rustup ends `main "$@" || exit 1` inside a `case ... esac` ([RUSTUP:931-933](https://raw.githubusercontent.com/rust-lang/rustup/61271d00a979/rustup-init.sh)), docker wraps the whole script and calls `do_install` last, with a comment explaining why ([docker-install@2b32480025b2:install.sh:811-813](https://raw.githubusercontent.com/docker/docker-install/2b32480025b2/install.sh)). The wave-2 map cites `install.sh:809-813`; the comment is 811-813. The docker trap is at `rootless-install.sh:265`, not in install.sh.

```sh
# correct (FX/ref/install.sh:303): nothing runs until the last line is complete
main() { ... }
main ${1+"$@"}

# incorrect (FX/plant/linear.sh): cut at 70% it already ran the install step
case $(uname -sm) in ... esac
curl -fsSL "$URL" -o "$tmp"
tar -xzf "$tmp" -C "$HOME/.local/bin"      # a cut here leaves a partial install
main
```

What tests it (all measured, `FX/out/truncated-dash.txt`, `FX/out/final/t-trunc.ref.txt`):

| Check | Role | Result |
|---|---|---|
| Single 60% cut piped to sh | weak | `plant/linear.sh` is `ok` at 10-60% and PARTIAL only at 70/80/90%; `toplevel.sh` and `trailing.sh` are `ok` at every decile |
| `t-trunc.sh`: every line prefix, four byte prefixes, last 60 byte prefixes | check of record | `linear` PARTIAL at cuts 15-17; `toplevel` PARTIAL at line 279/280 and in the final bytes; `trailing` caught only by the byte tail |
| `check-toplevel.sh` (awk layout check) | reading heuristic | exit 1 with the offending line on the 3 plants, exit 0 on the twin; high false-positive rate on the corpus |
| `t-trunc.sh` on the 17 corpus installers | would be the corpus gate | vacuous on all 17 (`FX/tools/corpus-trunc.sh`): they need network and tool stubs, so a cut cannot be told from an early network failure |

The reference sweep: 366 cuts, 0 partial, 3 noise cuts per interpreter on 10 of 11 interpreters; posh reports `vacuous=1` (the sweep could not exercise the install step there; cause not investigated, so posh coverage of truncation is unproven). The final `mx` run is `red=0 of 11`.

Homebrew's documented delivery is `/bin/bash -c "$(curl -fsSL .../install.sh)"` ([docs.brew.sh/Installation](https://docs.brew.sh/Installation)). Command substitution holds the whole text in memory, so a failed or short curl yields a shorter string, not a pipe cut; but `sh -c "$(cat cut)"` and bash 3.2 both run the commands they parsed and then stop at a syntax error (`FX/probes/cmdsub-run.sh`: A/B/D ran, then the syntax error, and a partial directory existed). The Homebrew installer is linear with no guard (BREW:1243 lines, `#!/bin/bash`). Linear scripts with no guard in the corpus: ORAS, MOLD, DENO, BREW, DOTNET (5 of 17). 10 of 17 have a guard (WS, SG, DCLI, CDIST, RUSTUP, DOCKER, DOCKER-RL, K3S via a `{}` group, NVM via a `{}` group, ACME); FD downloads to a temp file then runs it and needs none; VCPKG runs from a checkout.

<a id="f2"></a>
### 2. Integrity: five root-of-trust classes

Vocabulary used across the fleet and this study: **pinned** (digest inside the script), **manifest** (digest from a different origin than the asset), **sidecar** (hash file next to the asset, same origin), **GPG**, **none**.

Corpus totals (audit 2c): pinned 2 (MOLD, VCPKG), manifest 1 (WS), sidecar 2 (SG, K3S), GPG 1 (DOCKER), delegated 1 (FD), none 9 (RUSTUP, DENO, BREW, DOTNET, NVM, ACME, DCLI, ORAS, DOCKER-RL), and CDIST reclassified (below).

**Correction to the prior audit.** The audit labelled cargo-dist "sidecar/manifest". The 0.33.0 template embeds the digests: `with_checksums_from_manifest` in the generator fills a per-archive `checksum_style`/`checksum` pair into the generated installer ([cargo-dist v0.33.0 installer.sh.j2](https://raw.githubusercontent.com/axodotdev/cargo-dist/v0.33.0/cargo-dist/templates/installer/installer.sh.j2) at `FX/ref/cd-v0.33.0-installer.sh.j2`). On the real shipped `grimoire-installer.sh` v0.14.3 (generator cargo-dist 0.33.0, fetched 2026-10-11, sha256 `0e497020...79ce8b` at `FX/ref/grimoire-v0.14.3-installer.sh`) the digests are in the installer text, and the verifier is `sha256sum -b "$_file" | awk '{printf $1}'` (installer line 1857). So the class is pinned: it protects against a swapped archive, not against a swapped installer. The `.sha256` sidecar files also exist, as separate release assets. The cargo-dist test snapshots show no digests only because of `local_builds_are_lies`.

Fail-open, measured on the real artifact (`FX/rt-cd-shipped.sh`, output `FX/out/rt-cd-shipped.txt`):

```text
## tampered archive, sha256sum present
ERROR: checksum mismatch
installer-rc=1                                  # correct: nothing installed
## tampered archive, sha256sum ABSENT from PATH
skipping sha256 checksum verification (it requires the 'sha256sum' command)
everything's installed!
installer-rc=0                                  # incorrect: PWNED binary installed
```

The installer also prints `no checksums to verify` (installer line 377) when none are embedded. Stock macOS is believed to ship `shasum` but not `sha256sum` (unverified: read only), which would make the fail-open path the default on macOS; check on a real Mac before claiming it. cargo-dist's book says the checksums over https "have minimal security benefit" against a compromised host and that the PowerShell installer lacks them ([checksums.md](https://raw.githubusercontent.com/axodotdev/cargo-dist/v0.33.0/book/src/artifacts/checksums.md); [issue 439](https://github.com/axodotdev/cargo-dist/issues/439)); [issue 2420](https://github.com/axodotdev/cargo-dist/issues/2420) (open, 2026-06-03) notes the generated CI's `curl ... cargo-dist-installer.sh | sh` has no integrity check at all.

Reference (compliant) integrity block, `FX/ref/install.sh`:

```sh
# correct: three fail-closed branches, a named source, a tool probe
sha256_of() {   # ref:189-199
    if check_cmd sha256sum; then
        RETVAL=$(sha256sum "$1" | awk '{print tolower($1)}')
    elif check_cmd shasum; then
        RETVAL=$(shasum -a 256 "$1" | awk '{print tolower($1)}')
    elif check_cmd openssl; then
        RETVAL=$(openssl dgst -sha256 "$1" | awk '{print tolower($NF)}')
    else
        err "no sha256 tool (sha256sum, shasum or openssl); cannot verify $1" 4
    fi
}
# no digest => err ... 4 (verify_payload); mismatch => err "checksum mismatch ..." 4
```

```sh
# incorrect (cargo-dist 0.33.0 shape): a missing tool becomes a skipped check
if ! command -v sha256sum >/dev/null 2>&1; then
    say "skipping sha256 checksum verification (it requires the 'sha256sum' command)"
    return 0
fi
```

<a id="f3"></a>
### 3. TLS flags, capability probes and busybox

cargo-dist 0.33.0 downloads with `curl -sSfL "$1" -o "$2"` and `wget "$1" -O "$2"` (template :1605, :1611; snapshot CDIST:1749, :1755), no `--proto`, no `--tlsv1.2`, no retry. The template is byte-identical on main at commit 7f277b663b90 (2026-10-02, checked 2026-10-11). [Issue 457](https://github.com/axodotdev/cargo-dist/issues/457) "bump curl-sh exprs to tls 1.3?" has been open since 2023-09-27. grimoire's front door and the generated CI use `--proto '=https' --tlsv1.2 -LsSf`, so `--proto` protects only the hop that fetches the installer, not the hop that fetches the archive.

curl `--help` vs `--help all` (measured, `FX/probes/curl-help.sh`, `FX/out/curl-help.txt`): `--tlsv1.2` is listed only under `--help all` on curl 7.76.1, 7.88.1, 8.3.0, 8.5.0 and 8.22.0. On 7.61.1 (almalinux:8) plain `--help` lists everything. rustup greps for the literal string `--help all` and picks the right listing ([RUSTUP:776](https://raw.githubusercontent.com/rust-lang/rustup/61271d00a979/rustup-init.sh), call site `check_help_for "$3" wget --https-only --secure-protocol` at RUSTUP:742). `--retry-all-errors` was added in 7.71.0 ([curl man page](https://curl.se/docs/manpage.html)); on 7.61.1 it is rejected (rc 2) while `--retry-connrefused` is accepted.

```sh
# correct (ref, abridged): probe the listing the flag is in (`curl --help all` carries the whole list on every version measured), branch explicitly (no unquoted flag variable, no SC2086 disable)
_help=$(curl --help all 2>&1 || true)          # ref:130-135
case $_help in
    *--tlsv1.2*) CURL_TLS=1 ;;
    *) warn "curl does not advertise --tlsv1.2; TLS version not enforced" ;;
esac
if [ "$CURL_TLS" = 1 ]; then                    # ref:154-158
    curl --proto '=https' --tlsv1.2 --fail --silent --show-error --location --retry 3 --retry-delay 1 -o "$2" "$1"
else
    curl --proto '=https' --fail --silent --show-error --location --retry 3 --retry-delay 1 -o "$2" "$1"
fi
```

```sh
# incorrect (plant/wgetflags.sh, and www-setup/src/install.sh:352-354): wget flags without a probe
wget --https-only --secure-protocol=TLSv1_2 -q -O "$2" "$1"      # busybox: rc=3
```

wget (measured, `FX/probes/wget-help.sh`): GNU wget 1.14 (amazonlinux:2) rejects `--https-only`; 1.19.5, 1.21.3 and 1.21.4 list it. So wget needs a probe even among GNU builds. The GNU manual could not be fetched (gnu.org timed out); the facts come from measured `--help` output.

busybox wget, real runs (`FX/rt-busybox.sh`, `FX/out/rt-busybox.txt`; wget.c read from [busybox 1.37.0](https://busybox.net/downloads/busybox-1.37.0.tar.bz2), `networking/wget.c`, `spawn_ssl_client` and `FEATURE_WGET_OPENSSL`):

| Environment | Observed |
|---|---|
| alpine:3.22, busybox 1.37.0 (build 2025-11-21), `ssl_client` + libssl3 | validates certificates: self-signed gives `certificate verify failed`, github.com works; rejects `--https-only` ("unrecognized option: https-only") and `--secure-protocol=TLSv1_2` |
| `busybox:1.37`, `busybox:1.37-musl` official images | internal TLS: `wget: note: TLS certificate validation not implemented`, self-signed cert accepted |
| Debian busybox 1.35 | same note, handshake against GitHub fails (alert 40/80) |

Fleet reproducers, both measured on alpine:3.22: www-setup `src/install.sh:352-354` (the wget branch) exits 3 with `wget: unrecognized option: secure-protocol=TLSv1_2` on every attempt (run with `--network none`, the failure is at the first fetch); the grimoire front door (`docs/public/install.sh:29`, `wget --https-only -qO`) exits 1 with `unrecognized option: https-only`. The reference warns on BusyBox, sets `NOVALID` when wget prints "certificate validation not implemented", and then refuses a same-origin sidecar (rc 4) unless `TOOLX_INSTALL_SHA256` is pinned: on `busybox:1.37` with no pin rc=4; with the pin rc=0.

`assert_https_url` (WS:296) is the right shape for any URL the environment can override: the reference refuses `http://` with rc 3 (`plant/httpurl.sh` removes it and installs over http, rc 0, red on 11 of 11).

<a id="f4"></a>
### 4. Platform mapping

cargo-dist Rosetta bug. The v0.33.0 template at :1316 (x86_64 twin :1307), and the shipped v0.14.3 installer at :1541 (twin :1532), contain:

```sh
# incorrect (cargo-dist 0.33.0, byte-identical on main 2026-10-11)
if sysctl hw.optional.arm64 2> /dev/null || true | grep -q ': 1'; then _cputype=arm64; fi
# parses as:  sysctl ... || ( true | grep -q ': 1' )
```

```sh
# correct (rustup, RUSTUP:386; reference): capture stdout, compare the value
if [ "$(sysctl -n hw.optional.arm64 2>/dev/null || true)" = 1 ]; then _cputype=arm64; fi
```

Measured with a stubbed `sysctl` (`FX/tools/t-cargodist-arch.sh`, `FX/stubs/sysctl`): Rosetta (oid answers 1) gives the right architecture plus a stray stdout line `hw.optional.arm64: 1`; an oid answering 0 gives the WRONG architecture (aarch64 on an x86_64 Mac); an unknown oid is correct by accident. Whether any real Mac returns 0 for `hw.optional.arm64` is unverified (read only). [PR 941](https://github.com/axodotdev/cargo-dist/issues/941) (closed 2024-04-17) first added the correct form `$(sysctl -n hw.optional.arm64 2>/dev/null)" = "1"`. No open or closed issue mentions `hw.optional.arm64` (API search 2026-10-11). Releases: v0.33.0 is the latest (2026-09-11), v0.32.0 is 2026-05-22; main (commit 7f277b663b90, 2026-10-02) has the identical template. No newer release fixes the TLS flags or the Rosetta bug. The Apple Rosetta developer page returned no readable body, so no Apple behaviour claim is verified.

musl detection chain (WS:272-278, RUSTUP:360-361, reference): `ldd --version` (musl's prints to stderr with rc 1, so capture `2>&1`), then `/lib/ld-musl-*.so.1`, then `/etc/alpine-release`. Glibc evidence is `ldd` output containing "GLIBC" or "GNU libc", or an `ld-linux*` loader. The static `busybox:1.37-musl` image has no `/lib`, no `ldd` and no os-release: the original reference draft and cargo-dist both said "gnu" there. The fixed reference exits 7 ("cannot tell glibc from musl") and offers `TOOLX_INSTALL_TARGET`.

Real-image results (`FX/rt-platform-real.sh`, `FX/out/rt-platform-real.txt`):

| image | ref install.sh | cargo-dist 0.33.0 |
|---|---|---|
| alpine:3.22 | x86_64-unknown-linux-musl | x86_64-unknown-linux-musl-dynamic |
| debian:12, ubuntu:24.04, almalinux:9, amazonlinux:2, archlinux, busybox:1.37 | x86_64-unknown-linux-gnu | x86_64-unknown-linux-gnu |
| busybox:1.37-musl | exit 7 with a message | x86_64-unknown-linux-gnu (wrong) |

Silent fall-through: deno's default arm `*) target="x86_64-unknown-linux-gnu" ;;` ([DENO:19](https://raw.githubusercontent.com/denoland/deno_install/41d4676f8677/install.sh)) and ORAS's `[ "$(uname -m)" = x86_64 ] && amd64 || arm64` map unknown input to a binary (12 of 26 cells wrong, audit Axis 4). The stubbed platform check (`FX/tools/t-platform.sh`, 14 scenarios including `linux i686` and `linux riscv64`, expected rc 7) is red for `plant/fallthrough.sh`: `WRONG linux i686: want=7 got='x86_64-unknown-linux-gnu' rc=0`.

<a id="f5"></a>
### 5. Exit taxonomy

Owner Q6 decision: installers use 0-7 with usage = 2 (`www-setup/.claude/rules/installers.md:224-236`); shell CLIs mirror the Rust table. Only 1 of 17 corpus installers documents a taxonomy (WS:27-36); only WS uses more than two distinct non-zero codes. The reference documents it in the header and uses it:

```text
# Exit: 0 ok; 1 generic; 2 usage/environment (including a missing tool);
#       3 network; 4 checksum mismatch or unverifiable; 5 extract; 6 setup;
#       7 unsupported platform; 129/130/143 HUP/INT/TERM.
```

SH-ERR-18 forbids 123/124/125/128 and 200-255. A signal-killed child reads 143 in 8 shells, 271 in ksh93u+m and 399 in yash (wave 2), so never forward a child's `$?` as the installer's code without classifying it.

<a id="f6"></a>
### 6. Traps: the returning handler

SH-ERR-15/16 hold; this adds the installer-specific measurement. ShellCheck [SC2064](https://www.shellcheck.net/wiki/SC2064) is the double-quote expansion issue (FD:24 `trap "rm -f \"$tmp\"" EXIT INT TERM` expands `$tmp` at definition, which is fine only because `tmp` is assigned before the trap). The separate defect is a handler that returns:

```sh
# incorrect (plant/trapsig.sh; same shape as WS:794 and docker rootless-install.sh:265)
trap cleanup EXIT INT TERM HUP       # cleanup returns, the script continues after the signal
```

```sh
# correct (ref)
on_exit() { rc=$?; trap - EXIT; cleanup; exit "$rc"; }
trap on_exit EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
```

Measured with `FX/tools/t-trap.py INSTALLER SHELL SIGNAL` (sends the signal to the process group while a stub `curl` hangs, `FX/stubs/curl` with `STUB_SLEEP`; judges status, leaked temp dir and whether the script ran on):

| Subject | INT | TERM | HUP / other |
|---|---|---|---|
| `ref/install.sh` (dash) | 130, GREEN | 143, GREEN | by construction 129 |
| `plant/trapsig.sh` | `rc=3 (want -15 or 143)`, RED | RED | not run |
| grimoire front door `docs/public/install.sh` | 130, GREEN (via `set -e`) | 143, GREEN | HUP leaks the temp file, RED (FD traps INT/TERM/EXIT, not HUP) |
| shipped cargo-dist installer (no trap) | signalled, status -2 | -15 | leaks the temp dir, RED |
| docker `rootless-install.sh:265`, www-setup `:794` | same returning-handler shape; not run (needs a live download) | | |

<a id="f7"></a>
### 7. Prompts under curl | sh, and /dev/tty

With `curl | sh` stdin is the script. In a linear script a `read` from stdin consumes script text: busybox ash 1.35/1.37 prints `ans=[xxxx]` (script bytes), and mksh, ksh, yash, posh, bash and zsh swallow the next script line (`FX/probes/stdin-*.sh`, `FX/out/stdin-probes.txt`). In a main-last script the read gets EOF (`ans=[]`) on all 11 shells, so the prompt silently auto-answers. The fix is to read from the terminal, but only when there is one:

```sh
# correct (ref:256, SH-USER-06/07/10 probes): probe, then redirect; non-interactive default otherwise
if (: </dev/tty) 2>/dev/null; then
    printf 'Add %s to PATH? [Y/n] ' "$1" >/dev/tty
    read -r _ans </dev/tty || return 0
fi
```

```sh
# incorrect: bare read (plant/stdinread.sh) / unguarded redirect (plant/ttyunguarded.sh, DENO:117)
read -r _ans || return 0
read -r _ans </dev/tty            # dash: "cannot open /dev/tty: No such device" when no ctty
```

`FX/tools/t-tty.sh` (via `FX/tools/ptyrun.py`, two terminal models) results on dash: ref GREEN (`ctty: answer n honoured, no rc file written`; `noctty: silent, no prompt, no /dev/tty error`); `ttyunguarded` RED on noctty (prompt printed, `/dev/tty` error leaked); `stdinread` RED on both (answer "n" not honoured and `.profile` was written). The deno shape (`plant/deno-tail.sh`: tty stdout, no controlling terminal) exits 2 and never prints "installed"; its twin `ref/deno-tail-twin.sh` probes first. Real exemplars: rustup redirects `< /dev/tty` only when stdout is a tty (RUSTUP:196-206, the call at :206), deno's `</dev/tty` at DENO:117 has no such guard. POSIX defines `/dev/tty` as the controlling terminal and an open on it fails when there is none ([POSIX.1-2024 XBD 10](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap10.html); `sh -s` is the pipe form, [sh utility](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sh.html)).

<a id="f8"></a>
### 8. posh and empty "$@" (M-N-11)

posh 0.14.1 aborts `@: parameter not set` on `"$@"` with no positional parameters under `set -u` (SH-ERR-12 says the same). Measured: the reference's first draft called `parse_args "$@"` inside `main` and failed 4 of 5 `mx` checks on posh while passing on the other 10 shells, even though `main ${1+"$@"}` was guarded. Fix: guard every forwarding site, `parse_args ${1+"$@"}`. `FX/tools/t-noargs.sh` starts the installer with no arguments and `TOOLX_INSTALL_SH_PRINT=target`: `plant/posharg.sh` is red on posh only (1 of 11: `rc=1 ... @: parameter not set`), the twin red on 0 of 11. `t-root.sh` could not see it because it passes arguments. Fleet: `main "$@"` at WS:913 under `set -eu` has the same shape (not run on posh here; reading only). setup-grimoire's `${curl_args[@]}` (SG:82) is never empty and is a SH-ERR-12 false positive.

<a id="f9"></a>
### 9. Root, PATH and rc edits

Wave 2: SH-EMIT-16..23 is the rc contract; SH-EMIT-19 wins over SH-USER-12 (X19). Applied to installers: (a) never `sudo` by default (the audit: 3 escalate, 2 refuse root, fleet 4/4 user-space); (b) never append blindly; (c) edit the one rc file for the user's shell, or print the line; (d) idempotent, symlink-safe, in place.

```sh
# correct (ref edit_rc): marker block, rewritten in place with cat > (keeps the inode, symlink and mode)
# >>> toolx >>>
export PATH="$HOME/.local/bin:$PATH"
# <<< toolx <<<
```

```sh
# incorrect (plant/rcappend.sh): blind append
printf "%s\n" "export PATH=\"$1:\$PATH\"" >>"$HOME/.profile"
```

`FX/tools/t-rc.sh` (run twice against a throwaway HOME, `--no-modify-path`, and a symlinked rc): `rcappend` red on 11 of 11 (`symlink broken or block missing`, `violations=2`); the reference red on 0 of 11. `t-root.sh` (a stub `sudo` logs calls): `plant/sudoinstall.sh` red on 11 of 11 (`rc=6 sudo-calls=1 installed=no`).

Real binaries run twice (the "(d)" plant: rc diff must be empty):

| Subject | Second-run rc diff | Note |
|---|---|---|
| `ref/install.sh` | empty | `FX/out/final/t-rc.sh.ref.txt` |
| shipped grimoire-installer.sh v0.14.3 in alpine | empty | repairs a missing trailing newline, appends `. "$HOME/.cargo/env"` to existing `.bashrc`/`.profile`/`.zshrc`, creates a fish `conf.d` file (`FX/out/rt-rc-twice.txt`) |
| `ocx self setup` 0.6.5, `SHELL=/bin/bash`, throwaway `HOME`/`OCX_HOME` | empty (only PowerShell's own telemetry cache differs) | writes `.profile`, `.zprofile`, `.zshrc`, `.bashrc` and `~/.config/powershell/profile.ps1` for a bash user: violates the target-file rule of SH-EMIT-16 (wave-2 surprise 13 confirmed) |

<a id="f10"></a>
### 10. Retry, latest-version resolution, sha256 tool probe

Retry (M-N-09), measured on curl 8.22.0 against `FX/tools/flaky.py` (`FX/out/retry-probe.txt`): `--retry 3` on responses 503, 503, 200: rc 0 after 3 requests. A 404 with `--retry 3`: 1 request (no retry); with `--retry-all-errors`: 4 requests. Connection refused: `--retry 2` elapsed 0 s, with `--retry-connrefused` elapsed 2 s. Fleet: setup-grimoire uses `--retry 3 --retry-delay 2 --retry-connrefused` and forbids `--retry-all-errors` (SG:51-58); DOTNET uses `--retry 20` and cites the curl regression it works around (DOTNET:1198, :1209).

Latest version (M-N-12): the unauthenticated GitHub REST limit is 60 requests per hour (measured header `x-ratelimit-limit: 60`; [GitHub rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)), a limit a CI fleet behind one NAT address hits. `releases/latest/download/<asset>` is a documented redirect ([linking to releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases)), and `https://github.com/<repo>/releases/latest` returns a 302 whose `Location` is the tag URL (k3s parses it with `curl -w '%{url_effective}'` or `wget -S ... Location`, K3S:378). Deno asks a text endpoint with `curl -s` and no `-f`, so an error body ("Not Found") becomes the version ([DENO:67](https://raw.githubusercontent.com/denoland/deno_install/41d4676f8677/install.sh)):

```sh
# incorrect (DENO:67): a 404 body is the version
deno_version="$(curl -s https://dl.deno.land/release-latest.txt)"
# correct: -f, then validate the shape before use
v="$(curl -fsSL https://example.invalid/release-latest.txt)" || err "cannot resolve the latest version" 3
case $v in v[0-9]*.[0-9]*.[0-9]*) ;; *) err "unexpected version string" 3 ;; esac
```

sha256 tool probe (M-D-09), measured on 8 Linux images (`FX/probes/sha-probe.sh`, `FX/out/sha-probe.txt`): `sha256sum` exists on all 8 (alpine, busybox, debian 12, ubuntu 24.04, ubuntu 26.04 with uutils 0.10.0, almalinux 9, archlinux, amazonlinux 2); `shasum` exists only on the 26.04 image; `openssl` on 26.04, alma9 and arch. `sha256sum -c` needs a filename on the checksum line (a hash-only line gives rc 1) and accepts uppercase hex. macOS has `shasum` but not `sha256sum` (unverified: read only); Windows uses `Get-FileHash` (ps1-front-door.md). Order: `sha256sum`, `shasum -a 256`, `openssl dgst -sha256`; compare the hex yourself instead of using `-c`.

<a id="f11"></a>
### 11. ASCII, bashisms and the parse matrix

SH-GATE-16 (ASCII). yash 2.52 in the C locale cannot read non-ASCII bytes and fails the whole file with `cannot read input: Invalid or incomplete multibyte or wide character` (parse rc 2), comments included. `FX/tools/t-parse.sh` (`LC_ALL=C <shell> -n`): `plant/nonascii.sh` (one em dash in a string) red on yash only (1 of 11), twin 0 of 11. Fleet, measured: `docs/public/install.sh:2` (grimoire, `# grim installer — bootstrap`, 1 non-ASCII line) red on yash only; `www-setup/src/install.sh` (35 non-ASCII lines, 114 bytes) red on yash only; setup-grimoire's installer has 2 non-ASCII lines but is declared `#!/usr/bin/env bash` (arrays at SG:58), so its 6-of-11 failures are the dialect, not the bytes. The reference has 0 non-ASCII bytes.

K3S:408 `for i in {1..3}` under `#!/bin/sh` ([k3s@82a6ddcd820b](https://raw.githubusercontent.com/k3s-io/k3s/82a6ddcd820b/install.sh)): re-run 2026-10-11, it runs once with `i={1..3}` in dash, busybox ash x2, mksh, yash, posh and zsh-sh, and 3 times in ksh93 x2 and bash x2. A retry loop that retries once is a latent bug; use `i=0; while [ "$i" -lt 3 ]; do ...; i=$((i + 1)); done`.

<a id="f12"></a>
### 12. The 17-installer pin table

Pinned from the audit (`shell-audit/installers.md` tables 2a-2d, line cites re-verified for RUSTUP, DOCKER, DENO, K3S and CDIST in this study; the rest are audit cites). `none` means no such token found. Exit taxonomy uses the SH-ERR-25 kinds: "0/1" = success and one generic failure code only.

| Id | Truncation guard | Integrity source | TLS flags | Platform mapping | Exit taxonomy | Trap | /dev/tty |
|---|---|---|---|---|---|---|---|
| WS | `main "$@"` :913 | manifest (other origin) | curl `--proto =https --tlsv1.2` :343-345; wget `--secure-protocol=TLSv1_2 --https-only` :352-354 unprobed | uname + Rosetta + musl chain :249-278, rejects others 7 | documented 0-7 :27-36 | `EXIT INT TERM HUP` returning :794 | none |
| FD | not needed (temp file then `sh`) | delegated (claims a check, :5-6) | curl `--proto =https --tlsv1.2` :27; wget `--https-only` :29 unprobed | delegates | 0/1 | `EXIT INT TERM` :24 (no HUP) | none |
| SG | `main "$@"` :121 | sidecar `.sha256` :92-103 | `--proto =https --tlsv1.2` :58 | `case uname/uname-m` :32-41, glibc asset on Alpine | 1 | `EXIT` :67 | none |
| ORAS | none | none | none (`curl -s ... -LO`, no `-f`) | silent fall-through to arm64 :6-7 | none | none | none |
| MOLD | none | pinned sha256 :14-25 | none (wget retry flags) | explicit exit 1 :21-23 | 1 | trap :32 | none |
| DCLI | `main "$@"` :672 | none | none | uname + Rosetta :152-192, MINGW rejected | 0/1 | traps :315,359,384,395 | none |
| CDIST | `... "$@" \|\| exit 1` :1838 | pinned (embedded digests), fail-open | none (`curl -sSfL` :1749, `wget` :1755) | buggy Rosetta :1460, `ldd` musl :1431 | 0/1 | none (leaks temp dir) | comments only (:191,196) |
| RUSTUP | `main "$@" \|\| exit 1` :931 inside `case` | none (TLS only) | probed via `check_help_for` :706-747, `--help all` :776 | correct Rosetta :386, override :552-559 | 0/1 | none | `< /dev/tty` only if stdout is a tty :196-206 |
| DENO | none; ends in `echo` :127-128 | none | none | default arm = x86_64 gnu :19 | 0/1 | none | unguarded `</dev/tty` :117 |
| BREW | none (`bash -c "$(curl)"`) | none (git) | none | uname + arm64 test :157-170 | 1 (7 sites) | traps :331,891,1088 | none |
| DOCKER | `do_install` :813 (comment :811-813) | GPG repo keys :596-605 | none | os-release :312-316 | 0/1 | none | none |
| DOCKER-RL | `do_install "$@"` :283 | none | none | uname :84-88 | 0/1 | `'rm -rf "$tmp"' EXIT INT TERM` :265 (returning) | none |
| K3S | `{ ... }` group :1206-1218 | sidecar `sha256sum-<arch>.txt` :468-481 | none | `uname -m` :302 | 1 / `$code` | `cleanup INT EXIT` :357 | none |
| DOTNET | none | none | none (retry 20) | uname + `pgrep oahd` :409 | 0/1 | none | none |
| NVM | `{ ... }` group :3-536 | none (git) | none | none | 1 (10), 2 (6) | none | none |
| ACME | `main "$@"` :9785 | none | none | MINGW :1389 | 0/1 | none | none |
| VCPKG | none (runs from a checkout) | pinned sha512 :124-144 | `--tlsv1.2` only :156 | uname + musl flag :26,:44,:106 | 0/1 | none | none |

Counts: guard 10 of 17; integrity pinned 3 (MOLD, VCPKG, CDIST) / manifest 1 / sidecar 2 / GPG 1 / delegated 1 / none 9; TLS floor flags 5 (WS, FD, SG, RUSTUP, VCPKG partial) and probed in 1 (RUSTUP); trap present in 8; returning-handler shape read in WS and DOCKER-RL (not run), FD lacks HUP (run, leaks); `/dev/tty` guarded in 1 (RUSTUP). Recount of last non-blank lines on 2026-10-11 reproduced the 10-of-17 guard count.

<a id="f13"></a>
### 13. Fleet defects with reproducers (listed, never fixed)

| Defect | Where | Reproducer | Result |
|---|---|---|---|
| busybox wget flags unprobed | www-setup `src/install.sh:352-354` | `docker run --network none alpine:3.22 ... install.sh` (`FX/rt-busybox.sh`) | rc 3, `unrecognized option: secure-protocol=TLSv1_2` |
| busybox wget `--https-only` | grimoire `docs/public/install.sh:29` (and 3 copies per the audit) | alpine:3.22, no curl | rc 1, `unrecognized option: https-only` |
| non-ASCII, yash | www-setup install.sh (35 lines); grimoire front door :2 | `LC_ALL=C yash -n FILE` | parse rc 2 |
| returning trap handler | www-setup `:794` (and `:718`), docker rootless `:265` | `t-trap.py` on a hanging fetch | not run for those; same shape as the red plant |
| front door HUP leak | grimoire `docs/public/install.sh:24` | `t-trap.py ... HUP` | temp file leaked |
| `main "$@"` under `set -eu` | www-setup `:913` | posh, no args | reading only; same shape as plant `posharg` |
| `ocx self setup` writes 5 rc files for a bash user | ocx 0.6.5 | `FX/rt-rc-twice.sh` (throwaway HOME) | confirmed |
| cargo-dist 0.33.0 TLS, Rosetta, fail-open, no trap | grimoire's shipped `grimoire-installer.sh` v0.14.3 | `FX/rt-cd-shipped.sh` | fail-open confirmed (PWNED installed, rc 0) |
| fallback hash depends on `pipefail` | setup-grimoire `.github/scripts/install.sh:98-99` | reading | `sha256sum \| awk \|\| shasum \| awk` works only because of `pipefail` (:9); :82 is fine |

<a id="f14"></a>
### 14. Generated installers: the cargo-dist 0.33.0 audit

A generated installer is reviewed as a build artifact. What must be checked, and what the real v0.14.3 grimoire installer scores:

| # | Check | Command or evidence | v0.14.3 (cargo-dist 0.33.0) |
|---|---|---|---|
| 1 | TLS flags on the archive hop | `grep -nE 'curl .*(--proto|--tlsv1)' INSTALLER` | none; `curl -sSfL`, plain `wget` |
| 2 | Digests embedded | `grep -c 'checksum' ...` plus `dist-manifest.json` | embedded (class pinned) |
| 3 | Fail-open when the hash tool is missing | run with `sha256sum` off PATH and a tampered archive | FAIL: installs, rc 0 |
| 4 | Rosetta precedence | `grep -nE 'sysctl[^\|]*\|\|[^\|)]*\|'` | present at :1541 and :1532 |
| 5 | Signal handling | `t-trap.py` | no trap; leaks the temp dir |
| 6 | Truncation guard | last non-comment line | `download_binary_and_run_installer "$@" \|\| exit 1`: guarded |
| 7 | Rendered file parses on dash and busybox ash | `sh -n` in the release job; [issue 2339](https://github.com/axodotdev/cargo-dist/issues/2339): the installer was corrupted in a CI artifact transfer (~108 lines lost, same byte count) | not enforced by cargo-dist; add to the host job |
| 8 | ps1 hash | ps1-front-door.md (PS-SEC-01/03) | none |
| 9 | Which hops carry `--proto` | front door and CI yes; archive hop no | partial |
| 10 | Pin the generator version | `dist_version` in `dist-manifest.json` | 0.33.0 |

<a id="f15"></a>
### 15. The installer-script skill: procedure and receipt

Decided: the `installer-script` skill reads `installers.md` (this study's SH-INST), `userland.md`, and the PowerShell quality and security files, and follows this procedure.

1. Classify: hand-written or generated. Generated: run the section 14 audit instead of editing the output; fix upstream or wrap.
2. Write the header first: one usage line (the `curl --proto '=https' --tlsv1.2 -fsSL URL | sh -s -- [options]` form), the floor (dash 0.5.12, busybox ash 1.37, bash 3.2 --posix), `# Exit:` table, options, environment names, and the integrity class.
3. Structure: `set -u` (add `-e` only if the exit contract allows it, SH-ERR-23), small functions, `main ${1+"$@"}` last; every forwarding site guarded.
4. Downloaders: probe both curl and wget, branch explicitly, https-only URL assertion, BusyBox warning and the `NOVALID` refusal.
5. Integrity: pinned or manifest; the sidecar only with the corruption-detection label; fail closed in all three cases.
6. Platform: total `case`, exit 7, override variable, three-outcome libc detection, Rosetta by value.
7. Traps and prompts as in sections 6 and 7; user-space install; rc by marker block, opt-out flags.
8. Run the kit (`FX/run-all.sh`, `FX/tools/*`): `t-trunc`, `t-tamper`, `t-flags`, `t-platform`, `t-rc`, `t-root`, `t-parse`, `t-noargs` under all 11 interpreters, plus `t-trap.py` and `t-tty.sh`, plus `shellcheck -s sh` and `shfmt -d -i 4 -ci`.
9. Emit the receipt:

```text
installer:        path, sha256, line count, non-ASCII bytes
class:            hand-written | generated(<tool> <version>)
integrity_class:  pinned | manifest | sidecar | gpg | none
interpreters:     11 listed with versions; red=K of 11 per check
checks:           trunc sweep (cuts, partial), tamper (3), flags, platform (14 scenarios), rc twice (diff empty), root, parse, noargs, trap (INT/TERM/HUP), tty (ctty/noctty)
static:           shellcheck rc, shfmt rc
unverified:       each macOS/Windows claim, marked "read only"
```

## Normative guidance candidates

Numbering is SH-INST-nn. Every verification takes an explicit file or directory operand, prints the violating lines as output (empty output = pass) and uses `xargs -r` when piped. `FX/tools/lint-grep.sh RULE FILE` holds the grep forms (exit 1 on any hit). Watched results: see "Verification runs".

**SH-INST-01 (MUST)** Put all executable code in functions, assign top-level variables only, and make the last non-comment line `main ${1+"$@"}` (or a call that ends `|| exit 1`, or the closing `}` of one wrapping `{ ... }` group).
- Why: a truncated `curl | sh` must run nothing; rustup and docker do this and say why.
- Verify: `sh FX/tools/t-trunc.sh INSTALLER` (every line prefix and 60 byte prefixes, exit 1 on any PARTIAL); reading aid `sh FX/tools/check-toplevel.sh INSTALLER`.
- Watched: yes for `t-trunc` (`plant/linear.sh`, `toplevel.sh`, `trailing.sh` exit 1, twin exit 0) and for `check-toplevel` (3 plants exit 1, twin exit 0). The static check has high false positives on corpus installers, so it is a reading heuristic, not the gate; `t-trunc` is vacuous on any installer that needs the network unless stubbed.

**SH-INST-02 (MUST)** Document the delivery form in the header: `curl ... | sh -s --`, or download-then-run. Never document `sh -c "$(curl ...)"` or `bash -c "$(curl ...)"` for a script without the main-last guard.
- Why: command substitution runs the parsed prefix and then fails (`FX/probes/cmdsub-run.sh`).
- Verify: `grep -nE 'sh -c "\$\(curl' INSTALLER README` over the docs the installer ships with (output = unsafe delivery lines); reading check that SH-INST-01 holds.
- Watched: partly. The run showed the partial effect on `sh -c "$(cat cut)"` and bash 3.2; the grep form was not planted.

**SH-INST-03 (MUST)** Verify the payload's SHA-256 before extracting or executing it, and fail closed (exit 4) when the hash tool is missing, the expected digest is absent or blank, or the digests differ.
- Why: cargo-dist 0.33.0 installs a tampered archive with rc 0 when `sha256sum` is absent (measured on the real v0.14.3 installer).
- Verify: `sh FX/tools/t-tamper.sh INSTALLER` (3 scenarios: tampered archive, hash tool removed from PATH, blank digest; exit 1 on any install); static aid: `grep -nE 'skipping .*checksum|no checksums' INSTALLER`.
- Watched: yes. `plant/nohash.sh` `violations=3`, `plant/failopen.sh` `violations=1`, both red on 11 of 11 interpreters; twin 0 of 11. Real artifact: shipped installer rc 0 with PWNED binary.

**SH-INST-04 (MUST)** Name the integrity class in the header and docs: pinned, manifest (different origin), sidecar (same origin, "detects corruption, not a hostile origin"), GPG or none. A claim of verification in a front door requires the check in the delivered code (PS-SEC-03 for ps1).
- Why: grimoire's front door claims a check the generated installer lacks only for ps1; for sh the digests are embedded, but the class was mislabelled in the prior audit.
- Verify: reading heuristic: for each hash comparison, find where the expected value comes from and compare the host with the archive host; `grep -nEi 'sha-?256|checksum' INSTALLER` must be paired with a comparison.
- Watched: no (reading heuristic only).

**SH-INST-05 (MUST)** Add `--tlsv1.2` to curl only after `curl --help all` (or `--help`) lists it, and `--https-only` to wget only after `wget --help` lists it; branch explicitly instead of expanding an unquoted flag variable. Always pass `--proto '=https'` to curl.
- Why: wget 1.14 and busybox wget reject the flags (rc 3); curl 7.76.1 through 8.22.0 list `--tlsv1.2` only under `--help all`.
- Verify: `sh FX/tools/t-flags.sh INSTALLER` (stub curl/wget with and without the flags in their help; exit 1 on a rejected flag); behavioural on alpine:3.22 with busybox wget only.
- Watched: yes. `plant/curlprobe.sh` and `plant/wgetflags.sh` red on 11 of 11; `FX/rt-busybox.sh` red on the real fleet installers.

**SH-INST-06 (MUST)** Refuse a non-https download URL, including every URL that an environment variable can override (exit 3).
- Why: `--proto '=https'` is a curl flag; wget and an overridden base URL need a script-level assertion (WS:296).
- Verify: `sh FX/tools/t-flags.sh INSTALLER` (scenario "http url"); grep aid `sh FX/tools/lint-grep.sh urlhttp INSTALLER`.
- Watched: yes. `plant/httpurl.sh` `RED 4 http url: rc=0` on 11 of 11; `plant/httpbase.sh` (default base URL `http://`) hit by the grep, exit 1, twin exit 0.

**SH-INST-07 (MUST)** When wget reports "certificate validation not implemented", refuse a same-origin checksum (exit 4) unless the digest is pinned; always warn when the downloader is BusyBox wget.
- Why: the official busybox images accept a self-signed certificate, so a same-origin sidecar proves nothing.
- Verify: run the installer on `busybox:1.37` with no pin (expect rc 4) and with `TOOLX_INSTALL_SHA256` (expect rc 0).
- Watched: no planted violation. The reference was run on both images (rc 4 and rc 0) but no plant removes the refusal, so this verification was not seen going red.

**SH-INST-08 (MUST)** Make platform detection total: every `uname -s`/`uname -m` pair maps or exits 7; offer a `*_INSTALL_TARGET` override; detect libc by three outcomes (glibc evidence, musl evidence, neither exits 7); detect Rosetta by VALUE: `[ "$(sysctl -n hw.optional.arm64 2>/dev/null || true)" = 1 ]`.
- Why: deno and oras fall through silently; cargo-dist's Rosetta test has the wrong precedence; a static musl image has no libc evidence at all.
- Verify: `sh FX/tools/t-platform.sh INSTALLER` (14 stubbed scenarios with `FX/stubs/uname`, `ldd`, `sysctl`); grep aid `sh FX/tools/lint-grep.sh rosetta INSTALLER`.
- Watched: yes. `fallthrough` `WRONG ... want=7 got=x86_64-unknown-linux-gnu rc=0` (3 scenarios), `rosetta` `WRONG ... oid present, value 0` (2 scenarios), both red on 11 of 11; grep `rosetta` hits `plant/rosetta.sh`, and the shipped cargo-dist installer.

**SH-INST-09 (MUST)** Document the exit taxonomy in a `# Exit:` header line: 0 ok, 1 generic, 2 usage or missing tool, 3 network, 4 checksum, 5 extract, 6 setup, 7 platform, 129/130/143 for HUP/INT/TERM. Never exit with a forwarded child status in 123-125, 128 or 200-255 (SH-ERR-18).
- Why: callers script around installer failures; only 1 of 17 installers documents any.
- Verify: `sh FX/tools/lint-grep.sh header INSTALLER` (output = missing header); reading check that each `err ... N` uses a documented code.
- Watched: yes for the header grep (`plant/noheader.sh` exit 1, twin 0); the code usage check is reading only.

**SH-INST-10 (MUST)** Trap with a rc-preserving exit handler on EXIT and an explicit `exit 128+n` handler for HUP, INT and TERM; never `trap cleanup EXIT INT TERM`.
- Why: a returning handler hides the signal (plant exits 3), and a missing HUP trap leaks the temp file (front door).
- Verify: `python3 -I FX/tools/t-trap.py INSTALLER SHELL SIGNAL` (INT and TERM; HUP expected 129); grep aid `sh FX/tools/lint-grep.sh sigtrap INSTALLER`.
- Watched: yes. `plant/trapsig.sh` `rc=3 (want -15 or 143)` RED; the grep hits the plant and, on the corpus, K3S and WS; twin GREEN on both.

**SH-INST-11 (MUST)** Prompt only from `/dev/tty`, only after `(: </dev/tty) 2>/dev/null`, and give every prompt a non-interactive default (`--yes`, `NONINTERACTIVE`, no terminal). Never `read` from stdin in an installer.
- Why: under `curl | sh` stdin is the script (SH-USER-06/07/10); an unguarded redirect errors without a controlling terminal.
- Verify: `sh FX/tools/t-tty.sh INSTALLER dash` (ctty and noctty models); grep aid `sh FX/tools/lint-grep.sh bareread INSTALLER`.
- Watched: yes. `ttyunguarded` RED on noctty, `stdinread` RED on ctty and noctty, `deno-tail.sh` exit 2 with no "installed" line; twin GREEN. The grep hits corpus `read` uses inside `while read` loops, so it is an aid with false positives.

**SH-INST-12 (MUST)** Install to a user-writable directory with no `sudo`; edit PATH only with consent and an opt-out (`--no-modify-path`); edit one rc file per detected shell with a marker block, in place, once; a second run produces an empty rc diff.
- Why: SH-EMIT-16..23 (SH-EMIT-19 wins over SH-USER-12, X19); blind appends duplicate and break symlinked dotfiles.
- Verify: `sh FX/tools/t-rc.sh INSTALLER` (run twice, `--no-modify-path`, symlinked rc) and `sh FX/tools/t-root.sh INSTALLER`; grep aids `lint-grep.sh sudo` and `lint-grep.sh rcappend`.
- Watched: yes. `rcappend` `RED symlink broken or block missing` (11 of 11), `sudoinstall` `rc=6 sudo-calls=1` (11 of 11), both greps hit the plants, twin clean. Real `ocx self setup` is a reported violation of the target-file rule (5 files for a bash user), not a plant.

**SH-INST-13 (MUST)** Guard `"$@"` as `${1+"$@"}` at EVERY site that forwards positional parameters under `set -u` (main, parse_args, wrappers).
- Why: posh aborts `@: parameter not set`; the first draft guarded only `main`.
- Verify: `sh FX/tools/t-noargs.sh INSTALLER posh` (no-argument start with `*_SH_PRINT=target`); grep aid `sh FX/tools/lint-grep.sh unguardedargs INSTALLER`.
- Watched: yes. `plant/posharg.sh` red on posh (1 of 11: `@: parameter not set`), `plant/unguarded2.sh` hit by the grep, twin clean. The grep hits 5 corpus installers; some are not under `set -u`, so it is an aid.

**SH-INST-14 (MUST)** Keep installer files ASCII (SH-GATE-16), comments and strings included.
- Why: yash 2.52 in the C locale rejects the whole file.
- Verify: `LC_ALL=C grep -n '[^ -~	]' INSTALLER` (output = non-ASCII lines); `sh FX/tools/t-parse.sh INSTALLER yash`.
- Watched: yes. `plant/nonascii.sh` red on yash only (1 of 11); the grep lists the line; fleet: grimoire front door :2, www-setup 35 lines.

**SH-INST-15 (MUST)** No bash-only syntax in a `#!/bin/sh` installer: brace-range loops (`{1..3}`), arrays, `[[`, `pipefail`; run the file under the parse matrix.
- Why: `for i in {1..3}` runs once in 7 of 11 shells.
- Verify: `sh FX/tools/lint-grep.sh brace INSTALLER`; `sh FX/tools/mx.sh t-parse.sh INSTALLER` (red=0 of 11).
- Watched: yes for the grep (`plant/brace.sh` exit 1, twin 0; corpus hit: K3S:408). Parse matrix watched through the non-ASCII plant.

**SH-INST-16 (SHOULD)** Retry curl with `--retry 3 --retry-delay 2`, add `--retry-connrefused` behind a `--help all` probe, and never use `--retry-all-errors` without a probe (curl 7.71.0).
- Why: measured: 404 is not retried by `--retry`; refused connections are not retried without `--retry-connrefused`; 7.61.1 rejects `--retry-all-errors`.
- Verify: `sh FX/probes/retry-probe.sh` against `FX/tools/flaky.py`; `grep -n -e '--retry-all-errors' INSTALLER` (output = flagged lines, then check for a probe).
- Watched: no planted violation; measured behaviour only.

**SH-INST-17 (SHOULD)** Resolve "latest" by the `releases/latest/download/` redirect or the `releases/latest` 302 `Location`, not the REST API; if a text endpoint gives the version, use `curl -f` and validate the shape.
- Why: 60 requests per hour unauthenticated; `curl -s` turns "Not Found" into a version (DENO:67).
- Verify: `grep -nE 'api\.github\.com' INSTALLER` and `grep -nE 'curl -s[^f]*https' INSTALLER` (output = unsafe lines).
- Watched: no (grep not planted).

**SH-INST-18 (SHOULD)** Probe the SHA-256 tool in this order: `sha256sum`, `shasum -a 256`, `openssl dgst -sha256`; compare hex strings in the shell instead of using `sha256sum -c`.
- Why: macOS lacks `sha256sum` (unverified: read only); `-c` needs a filename on the line.
- Verify: `grep -cE 'sha256sum|shasum|openssl' INSTALLER` (each of the three present) and `t-tamper.sh` with `sha256sum` removed.
- Watched: partly. The "tool removed" scenario is in `plant/failopen.sh` (red); the order itself was measured on 8 images, not planted.

**SH-INST-19 (SHOULD)** Expose a test hatch: `*_INSTALL_SH_PRINT=target` (print the detected triple and exit 0, as rustup does with `RUSTUP_INIT_SH_PRINT`, RUSTUP:925) and an overridable base URL (https only).
- Why: it makes `t-platform`, `t-noargs` and offline tests possible without a network.
- Verify: `TOOLX_INSTALL_SH_PRINT=target sh INSTALLER` prints the triple, rc 0.
- Watched: used by `t-noargs.sh` (red on posh for the plant); no dedicated plant.

**SH-INST-20 (MUST)** Audit every generated installer with the section 14 checklist before shipping, and run `sh -n` on the rendered file in the release job.
- Why: cargo-dist 0.33.0 has no TLS flags, a wrong Rosetta test, a fail-open hash check and no trap, and issue 2339 shipped a corrupted installer.
- Verify: run `lint-grep.sh rosetta`, `t-tamper.sh`, `t-trap.py` and `t-flags.sh` against the rendered file.
- Watched: yes, on the real artifact: tamper with `sha256sum` removed rc 0 (red), Rosetta grep hits, trap leak (red).

**SH-INST-21 (MUST)** Emit the installer-script receipt (section 15) with the 11-interpreter results; mark every macOS or Windows claim "unverified: read only" when it was not run.
- Why: the receipt is what a reviewer checks instead of rerunning the kit.
- Verify: reading check that each receipt field is present and the interpreter count is 11.
- Watched: no (a document check).

## Verification runs

All runs 2026-10-11. `mx` = `bash FX/tools/mx.sh CHECK INSTALLER` over the 11 interpreters; "plant exit" is the exit code on the violation, "twin exit" on `ref/install.sh`. Raw outputs under `FX/out/`.

### Planted violation, red on the plant and green on the twin

| # | Check and plant | Command | Plant exit | Twin exit | Relevant output |
|---|---|---|---|---|---|
| 1 | tamper, `plant/nohash.sh` | `mx t-tamper.sh` | 1 (red=11 of 11) | 0 (red=0 of 11) | `violations=3 shell=dash` |
| 2 | tamper, `plant/failopen.sh` | `mx t-tamper.sh` | 1 (11 of 11) | 0 | `violations=1 shell=dash` |
| 3 | flags, `plant/curlprobe.sh` | `mx t-flags.sh` | 1 (11 of 11) | 0 | `violations=1` |
| 4 | flags, `plant/wgetflags.sh` | `mx t-flags.sh` | 1 (11 of 11) | 0 | `violations=1` |
| 5 | flags, `plant/httpurl.sh` | `mx t-flags.sh` | 1 (11 of 11) | 0 | `RED  4 http url: rc=0; log: curl --proto =https --tlsv1.2 ...` |
| 6 | platform, `plant/fallthrough.sh` | `mx t-platform.sh` | 1 (11 of 11) | 0 | `WRONG linux i686: want=7 got='x86_64-unknown-linux-gnu' rc=0`; `scenarios=14 wrong=3` |
| 7 | platform, `plant/rosetta.sh` | `mx t-platform.sh` | 1 (11 of 11) | 0 | `WRONG darwin x64 oid present, value 0: want=x86_64-apple-darwin got='hw.optional.arm64: 0` / `aarch64-apple-darwin'`; `wrong=2` |
| 8 | rc, `plant/rcappend.sh` | `mx t-rc.sh` | 1 (11 of 11) | 0 | `RED  symlink broken or block missing`; `violations=2` |
| 9 | root, `plant/sudoinstall.sh` | `mx t-root.sh` | 1 (11 of 11) | 0 | `RED  rc=6 sudo-calls=1 installed=no; toolx-install: error: cannot create ...` |
| 10 | ASCII, `plant/nonascii.sh` | `mx t-parse.sh` | 1 on yash only (red=1 of 11) | 0 (0 of 11) | `yash: cannot read input: Invalid or incomplete multibyte or wide character`; `parse rc=2` |
| 11 | no-args, `plant/posharg.sh` | `mx t-noargs.sh` | 1 on posh only (1 of 11) | 0 (0 of 11) | `RED  no-argument start: rc=1 ... plant/posharg.sh:303: @: parameter not set` |
| 12 | truncation, `plant/linear.sh` | `FX/tools/t-trunc.sh` (dash) | 1 | 0 | `PARTIAL` at cuts 15-17; decile matrix PARTIAL at 70/80/90% only |
| 13 | truncation, `plant/toplevel.sh` | `t-trunc.sh` | 1 | 0 | PARTIAL at line 279/280 and in the final bytes; decile matrix all `ok` |
| 14 | truncation, `plant/trailing.sh` | `t-trunc.sh` | 1 | 0 | caught by the byte tail only; decile matrix all `ok` |
| 15 | static layout, `plant/toplevel.sh` | `sh tools/check-toplevel.sh` | 1 | 0 | `plant/toplevel.sh:303: top-level statement outside a function: mkdir -p "$HOME/.toolx-cache"` |
| 16 | static layout, `plant/trailing.sh` | same | 1 | 0 | `plant/trailing.sh:303: top-level statement outside a function: main ${1+"$@"}` |
| 17 | static layout, `plant/linear.sh` | same | 1 (15 lines) | 0 | `plant/linear.sh:6: top-level statement outside a function: case $(uname -sm) in` |
| 18 | trap, `plant/trapsig.sh` | `python3 -I tools/t-trap.py FILE dash TERM` | 1 | 0 | `status   rc=3 (want -15 or 143): RED`; twin `verdict GREEN` for INT and TERM |
| 19 | tty, `plant/ttyunguarded.sh` | `sh tools/t-tty.sh FILE dash` | 1 | 0 | `RED  noctty: prompt printed or /dev/tty error leaked` |
| 20 | tty, `plant/stdinread.sh` | same | 1 | 0 | `RED  ctty: answered n but rc files were written: ... ['.profile']` |
| 21 | tty, `plant/deno-tail.sh` | `ptyrun.py` (stdout tty, no ctty) | 2, no "installed" line | twin `ref/deno-tail-twin.sh` installs | exit 2 |
| 22-31 | grep forms, 10 rules | `sh tools/lint-grep.sh RULE FILE` | 1 each | 0 each | below |

The ten grep forms (`FX/out/final2/lint-grep.txt`), plant exit / twin exit and the first hit line: `sudo` (`sudoinstall`) 1/0 `293:    sudo mkdir -p "$_dir" ...`; `rcappend` 1/0 `246: printf ... >>"$HOME/.profile"`; `bareread` (`stdinread`) 1/0 `258: read -r _ans || return 0`; `sigtrap` (`trapsig`) 1/0 `265: trap cleanup EXIT INT TERM HUP`; `rosetta` 1/0 `92: if sysctl hw.optional.arm64 2> /dev/null || true | grep -q ': 1'; then`; `header` (`noheader`) 1/0 `no '# Exit:' header line`; `ascii` (`nonascii`) 1/0 `297: ... — done`; `brace` (`brace`) 1/0 `303: for i in {1..3}; do :; done`; `urlhttp` (`httpbase`) 1/0 `21: BASE_URL=${...:-http://downloads...}`; `unguardedargs` (`unguarded2`) 1/0 `270:    parse_args "$@"`.

Total planted verifications watched red, with the twin green: 31 (rows 1-31; row 21 is an exit-code contrast rather than an `mx` run).

### Real artifacts that went red (not planted)

| Subject | Command | Exit | Output |
|---|---|---|---|
| shipped grimoire-installer.sh v0.14.3, tampered archive, `sha256sum` off PATH | `FX/rt-cd-shipped.sh` | installer rc 0 | `skipping sha256 checksum verification ...` then `everything's installed!`, binary prints `PWNED` |
| same, `sha256sum` present | same | installer rc 1 | `ERROR: checksum mismatch` (the correct outcome; green) |
| www-setup `src/install.sh` on alpine:3.22 (`--network none`) | `FX/rt-busybox.sh` | rc 3 | `wget: unrecognized option: secure-protocol=TLSv1_2` |
| grimoire front door on alpine:3.22 | same | rc 1 | `wget: unrecognized option: https-only` |
| grimoire front door, HUP | `t-trap.py` | temp file leaked | RED |
| shipped cargo-dist installer, INT/TERM | `t-trap.py` | signalled (-2/-15), tmp dir leaked | RED |
| grimoire front door, `LC_ALL=C yash -n` | `mx t-parse.sh` | 2 | `cannot read input: Invalid or incomplete multibyte or wide character` |
| www-setup install.sh, same | same | 2 (yash only) | same |

### Twin (reference) static and tool checks

| Check | Command | Exit |
|---|---|---|
| shellcheck 0.11.0, POSIX | `shellcheck -s sh FX/ref/install.sh` | 0 |
| shfmt 3.14.1 | `shfmt -d -i 4 -ci FX/ref/install.sh` | 0 |
| parse matrix | `mx t-parse.sh ref/install.sh` | red=0 of 11 |
| truncation sweep | `T_LINES=300 mx t-trunc.sh ref/install.sh` | red=0 of 11 (366 cuts per shell; posh `vacuous=1`) |
| `dash -n`, `bash -n` | direct | 0, 0 |
| real binaries run twice | `FX/rt-rc-twice.sh` | rc diff empty (ref, shipped cargo-dist installer, ocx 0.6.5) |

### Not red, and why

- SH-INST-07 (BusyBox NOVALID refusal): the twin was run on `busybox:1.37` (rc 4 without a pin, rc 0 with one) and no plant removes the refusal. Not watched going red.
- SH-INST-02, -04, -16, -17, -18, -19, -21: reading checks or measured behaviour with no plant.
- `check-toplevel.sh` is red on the 3 plants but also hits real installers that are correct, so it is not a gate. The corpus sweep (`corpus-trunc.sh`) is vacuous on all 17.
- `t-root.sh` reports 0 of 11 for `plant/posharg.sh` because it passes arguments; the dedicated `t-noargs.sh` catches it.
- A single 60% cut does not expose `toplevel`, `trailing` or (until 70%) `linear`: it is reported as a weak test, not a verification.
- Grep forms on the corpus (`FX/out/final2/lint-corpus.txt`): hits `sudo` 5, `bareread` 6, `sigtrap` 2 (K3S, WS), `rosetta` 1 (the cargo-dist rendered installer), `ascii` 3, `brace` 1 (K3S), `unguardedargs` 5, `rcappend` 0. These are aids; `bareread` and `unguardedargs` have false positives (reads inside `while read` loops, scripts without `set -u`).

## Exemplar evidence

- `rustup-init.sh:931` `main "$@" || exit 1` inside `case "$RUSTUP_INIT_SH_PRINT" in ... esac` (:925-933): main last, a test hatch, and an `|| exit 1` that makes a failing main exit 1 under `set -u` without `-e`. `rustup-init.sh:742` `check_help_for "$3" wget --https-only --secure-protocol` and `:776` the `--help all` grep: the only capability-probing downloader in the corpus. `:196-206` redirects `/dev/tty` only when stdout is a tty. Fetched at 61271d00a979, byte-identical to the local copy (`cmp`).
- Docker: `install.sh:811-813` is the truncation-guard comment ("wrapped up in a function so that we have some protection against only getting half the file") and `do_install` at :813; the trap `trap 'rm -rf "$tmp"' EXIT INT TERM` is at `rootless-install.sh:265`, not in install.sh:809-813 as the map said. Returning-handler shape. The `--setup-repo` double shift (`:170-173`, `:187`) is cited from the audit, not re-measured.
- Deno at 41d4676f8677: no guard (file ends in `echo`, :127-128), default arm :19, `curl -s` without `-f` :67, unguarded `</dev/tty` :117.
- Homebrew at 8ab1549dfa11: linear bash, delivered as `bash -c "$(curl ...)"`; the docs page ([docs.brew.sh/Installation](https://docs.brew.sh/Installation)) is the delivery contract.
- k3s `install.sh:408` `for i in {1..3}` under `#!/bin/sh` (re-run 2026-10-11), `:353-357` `cleanup` and `trap cleanup INT EXIT`, `:1206-1218` group guard.
- cargo-dist: snapshot CDIST:1460 (template :1316) Rosetta, CDIST:1749 `curl -sSfL`, CDIST:1755 `wget`, and the digest embedding at template :229-240. The v0.33.0 template is the same file on main at commit 7f277b663b90. The shipped file is the grimoire v0.14.3 release asset.
- Fleet: `setup-grimoire/.github/scripts/install.sh:58` (curl array), :67 trap, :82 the `curl ... && [[ -s ... ]]` test (correct), :93 sidecar, :98-99 fallback tied to `pipefail`; `www-setup/src/install.sh` :296, :352-354, :794, :913; grimoire `docs/public/install.sh` :24, :27, :29 (HEAD 4650ad830375, identical copy checked by `cmp`).

## AI-agent angle

Mistakes an AI agent makes when writing or editing an installer, each with its rule:
- Writes the install steps at top level with no `main` (the shape of every "quick" `curl | sh` example): SH-INST-01.
- Reads confirmation with a bare `read`, or `echo -n "Continue? "`; SH-INST-11 (and `printf`, not `echo`, for prompts).
- Adds a default `*)` arm that picks x86_64 gnu to "keep it working": SH-INST-08.
- Adds `--https-only` and `--secure-protocol=TLSv1_2` to wget unconditionally because they appear in many answers: SH-INST-05.
- Cargo-cults `set -euo pipefail` (bash) into a `#!/bin/sh` file, or relies on `pipefail` for hash fallbacks (the setup-grimoire :98-99 shape), instead of `|| err "..." N`: SH-INST-15.
- Writes `trap cleanup EXIT INT TERM`: SH-INST-10.
- Writes `main "$@"` and `parse_args "$@"` under `set -u`: SH-INST-13.
- Prefixes `sudo` to the install step or appends `export PATH` to `~/.bashrc` blindly: SH-INST-12.
- Uses `which` for tool probes (not POSIX; `command -v`), `sha256sum` only (no `shasum`/`openssl` fallback): SH-INST-18.
- Pastes an em dash or smart quote into a comment or message: SH-INST-14 (yash).
- Uses `curl -s URL` to read the latest version, so an error body becomes the version: SH-INST-17.
- Trusts the generated installer because the tool produced it, and edits the output file directly: SH-INST-20 (fix upstream).
- Reports "tested" after one run on the host shell: SH-INST-21 requires the 11-interpreter receipt; a single 60% truncation test passed on plants that are broken.

## Contested / evolving

- TLS 1.2 or 1.3: cargo-dist [issue 457](https://github.com/axodotdev/cargo-dist/issues/457) has been open since 2023-09-27 on bumping the curl expressions to 1.3. This study pins `--tlsv1.2` as the floor because `--tlsv1.3` is not listed by older curl builds; `--tlsv1.3` support would need its own probe.
- Same-origin checksums: cargo-dist's book and Spin's 2016 article ([security spectrum of curl | sh](https://spin.atomicobject.com/security-spectrum-curl-sh/)) say unsigned checksums over https add minimal security. This study keeps them as a requirement for corruption detection (a truncated or mangled archive) and demands a label, but a pinned or separate-origin digest is the trust root.
- Whether a front door should verify the installer it fetches (grimoire's front door does not; its generated CI has no check, [issue 2420](https://github.com/axodotdev/cargo-dist/issues/2420)).
- busybox wget TLS validation depends on the build (`ssl_client` vs internal TLS); distros may change it between releases, so the refusal logic keys on the runtime message, not the version.
- Fail-open vs fail-closed on a missing hash tool: cargo-dist chose skip-with-a-message; this study chooses exit 4. All 8 measured Linux images have `sha256sum`, which supports fail-closed there; macOS (`shasum` only, unverified) is the case that decides it, and needs a Mac to settle.
- Rosetta detection by value: whether any real Mac answers `hw.optional.arm64` with 0 is unverified; the by-value test is correct either way.
- The exit taxonomy (Q6) is the owner's decision for installers; shell CLIs mirror the Rust table.

## Sources

Date/era is the date the page or file was read (2026-10-11) unless the source dates itself. "Primary" means the project's or standard's own document or code.

| # | URL | What it is | Date / era | Why worth reading |
|---|---|---|---|---|
| 1 | https://curl.se/docs/manpage.html | curl man page (primary) | read 2026-10-11, curl 8.x | `--retry-all-errors` "Added in 7.71.0"; `--retry-connrefused`, `--proto` |
| 2 | https://pubs.opengroup.org/onlinepubs/9799919799/utilities/sh.html | POSIX.1-2024 `sh` utility (primary) | 2024 | `sh -s`, the pipe form |
| 3 | https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap10.html | POSIX.1-2024 XBD ch. 10, `/dev/tty` (primary) | 2024 | what opening `/dev/tty` guarantees |
| 4 | https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api | GitHub REST rate limits (primary) | current | 60 per hour unauthenticated |
| 5 | https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases | Linking to releases (primary) | current | the `latest/download` redirect contract |
| 6 | https://spin.atomicobject.com/security-spectrum-curl-sh/ | Spin: the security spectrum of curl pipe sh | 2016-12-12 | the case that same-origin checksums add little |
| 7 | https://docs.brew.sh/Installation | Homebrew installation docs (primary) | current | the `bash -c "$(curl ...)"` delivery form |
| 8 | https://docs.docker.com/engine/install/ubuntu/ | Docker Engine install docs (primary) | current | the convenience-script and repo-key (GPG) routes |
| 9 | https://busybox.net/downloads/busybox-1.37.0.tar.bz2 | busybox 1.37.0 source, `networking/wget.c` (primary) | 2024 release | `spawn_ssl_client`, the "certificate validation not implemented" note, `FEATURE_WGET_OPENSSL` |
| 10 | https://raw.githubusercontent.com/axodotdev/cargo-dist/v0.33.0/cargo-dist/templates/installer/installer.sh.j2 | cargo-dist 0.33.0 shell installer template (primary) | 2026-09-11 | the audited template: downloader, Rosetta, checksum code |
| 11 | https://raw.githubusercontent.com/axodotdev/cargo-dist/v0.33.0/book/src/artifacts/checksums.md | cargo-dist book: checksums (primary) | 0.33.0 | states the limited security value; ps1 lacks checksums |
| 12 | https://raw.githubusercontent.com/axodotdev/cargo-dist/v0.33.0/book/src/installers/shell.md | cargo-dist book: shell installer (primary) | 0.33.0 | documented behaviour of the generated installer |
| 13 | https://api.github.com/repos/axodotdev/cargo-dist/releases | cargo-dist release list (primary) | 2026-10-11 | v0.33.0 is 2026-09-11; v0.32.0 is 2026-05-22 |
| 14 | https://api.github.com/repos/axodotdev/cargo-dist/commits | cargo-dist commits (primary) | 2026-10-11 | main at 7f277b663b90 (2026-10-02), template unchanged |
| 15 | https://github.com/axodotdev/cargo-dist/issues/457 | issue: bump curl-sh exprs to TLS 1.3 | opened 2023-09-27, open | no TLS flags in 0.33.0 |
| 16 | https://github.com/axodotdev/cargo-dist/issues/941 | PR: Rosetta detection (closed) | closed 2024-04-17 | original correct `sysctl -n` form |
| 17 | https://github.com/axodotdev/cargo-dist/issues/2420 | issue: generated CI installs with no integrity check | opened 2026-06-03, open | the unauthenticated bootstrap |
| 18 | https://github.com/axodotdev/cargo-dist/issues/2339 | issue: installer corrupted in an artifact transfer | closed | the case for `sh -n` in the host job |
| 19 | https://github.com/axodotdev/cargo-dist/issues/439 | issue: PowerShell installer lacks checksums | open | the ps1 gap |
| 20 | https://github.com/grimoire-rs/grimoire/releases/download/v0.14.3/grimoire-installer.sh (and `dist-manifest.json`) | the shipped grimoire installer and its manifest (primary) | v0.14.3, generator 0.33.0, read 2026-10-11 | the artifact the fail-open tamper test ran against |
| 21 | https://raw.githubusercontent.com/rust-lang/rustup/61271d00a979/rustup-init.sh | rustup-init.sh (primary) | pinned SHA | main-last, `check_help_for`, `/dev/tty` |
| 22 | https://raw.githubusercontent.com/docker/docker-install/2b32480025b2/install.sh | docker install.sh (primary) | pinned SHA | the truncation-guard comment :811-813 |
| 23 | https://raw.githubusercontent.com/docker/docker-install/2b32480025b2/rootless-install.sh | docker rootless-install.sh (primary) | pinned SHA | the returning trap at :265 |
| 24 | https://raw.githubusercontent.com/denoland/deno_install/41d4676f8677/install.sh | deno install.sh (primary) | pinned SHA | no guard, default arm, `curl -s`, unguarded `/dev/tty` |
| 25 | https://raw.githubusercontent.com/Homebrew/install/8ab1549dfa11/install.sh | Homebrew install.sh (primary) | pinned SHA | a linear script delivered by command substitution |
| 26 | https://www.shellcheck.net/wiki/SC2064 (and SC2086) | ShellCheck wiki pages (primary), local clone `koalaman__shellcheck.wiki@0b4dfe7` | read 2026-10-11 | trap quoting and word splitting rationale |

Not retrievable, so not counted and every claim from them marked unverified: the Apple Rosetta developer page (no readable body), the GNU wget manual (gnu.org timed out; the GNU facts are measured `--help` output), and git.busybox.net (blocked; the tarball in row 9 was used). Also fetched but folded into the rows above: k3s `install.sh` at 82a6ddcd820b, which is raw GitHub like rows 21-25 and byte-compared to the local copy.
