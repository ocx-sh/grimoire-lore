---
title: Binary Release Pipeline and Install Channels
topic: dist configuration, installers, and the install-channel set for ocx and grimoire
agent: rust-ecosystem-researcher
model: sonnet
date_researched: 2026-08
sources_count: 15
scope: >
  dist (formerly cargo-dist) as configured in ocx/dist-workspace.toml and
  grimoire/dist-workspace.toml; the ocx/grimoire installer divergence and its
  root cause; cargo-binstall metadata; Homebrew/Scoop/WinGet channel economics;
  the self-update boundary between the `self_update` crate family and each
  tool's own OCI-digest semantics.
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [dist's rename, current release, and maintenance state](#1-dists-rename-current-release-and-maintenance-state)
  2. [What changed 0.31.0 → 0.32.0](#2-what-changed-0310--0320)
  3. [The installer divergence: why `installers = []` in ocx](#3-the-installer-divergence-why-installers---in-ocx)
  4. [Auditing grimoire's generated shell installer against rustup's hardened convention](#4-auditing-grimoires-generated-shell-installer-against-rustups-hardened-convention)
  5. [`[package.metadata.binstall]`: what's missing and what it must say](#5-packagemetadatabinstall-whats-missing-and-what-it-must-say)
  6. [binstall `--only-signed`: opt-in, not a target](#6-binstall---only-signed-opt-in-not-a-target)
  7. [Channel economics: Homebrew, Scoop, WinGet](#7-channel-economics-homebrew-scoop-winget)
  8. [Self-update: `self_update`/axoupdater vs. OCI-digest semantics](#8-self-update-self_updateaxoupdater-vs-oci-digest-semantics)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

1. dist is actively maintained: latest release `0.32.0` (2026-05-21), commit activity on `main` as recent as 2026-07-28 — no abandonment signal, no archival notice, no acquisition/shutdown announcement found in the repo, org page, or crates.io. Treat "dist's future is uncertain" as **not supported** by the primary sources checked.
2. The crates.io package is still named `cargo-dist` (max/newest version `0.32.0`) even though the tool rebrands itself "dist" in its own README — the name `dist` on crates.io is squatted by an unrelated abandoned crate (`0.0.0`, 6 lines). `cargo install cargo-dist` (or the pinned `cargo-dist-version` key) is still the correct install path; do not write `cargo install dist`.
3. 0.31.0 → 0.32.0 is a low-risk bump: no breaking changes. Notable: npm installer dropped `axios`/`rimraf` for built-in Node modules (min Node 14.14), `cargo-auditable` and `cargo-zigbuild` are no longer mutually exclusive, GitHub Actions attestation moved `attest-build-provenance@v3` → `attest@v4`. Both repos should bump `cargo-dist-version = "0.32.0"`.
4. ocx's `installers = []` is not an oversight — it is a deliberately documented architecture boundary (`adr_self_setup.md`, Accepted 2026-06-04, amended 2026-06-11). ocx ships **no dist-generated installer at all**; installation is owned entirely by a separate repo (`ocx-sh/www-setup`, served at `setup.ocx.sh`) whose scripts do only platform-detect + download + checksum-verify, then hand off to `ocx self setup`, which pulls ocx into its own OCI content-addressable store exactly like any other package it manages.
5. The reason dist's own installer is unusable for ocx: dist's shell/powershell installers drop a binary on `PATH` and stop. ocx's installed state is a CAS entry + symlink + five per-shell env shims + a managed RC block — none of which dist's installer template knows how to produce. Using it would create a "loose" ocx binary the rest of ocx's own tooling (`ocx self update`, `ocx self setup`) cannot see or manage.
6. grimoire's `installers = ["shell", "powershell"]` is the correct default: grimoire has no self-managed store — it is a single binary on `PATH`, so dist's generated installer is a complete, sufficient answer, and grimoire's README already links to it with the hardened one-liner (`curl --proto '=https' --tlsv1.2 -LsSf ... | sh`).
7. That hardening is skin-deep: the outer `curl --proto '=https' --tlsv1.2` call only fetches the *installer script*. Inside the generated `grimoire-installer.sh`, the actual binary archive is downloaded with a plain `curl -sSfL "$1" -o "$2"` (no `--proto`/`--tlsv1.2`). This is dist's own template, not a local edit — it cannot be hand-patched without the drift that `verify-release-ci.yml`'s `dist generate --check` gate exists specifically to catch.
8. The installer does perform SHA-256 checksum verification (`verify_checksum`) before use, sourced from dist's generated `sha256.sum`/manifest — so the missing protocol pin is a defense-in-depth gap (MITM/downgrade on an already-HTTPS GitHub Releases URL), not an unverified-binary problem.
9. Neither repo declares `[package.metadata.binstall]`. Without it, `cargo binstall ocx` / `cargo binstall grimoire` fall through binstall's strategy chain to `cargo-quickinstall` (a third party mirroring GitHub release assets it doesn't control) or a from-source `cargo install` — never the repo's own signed release process. Both should add an explicit block (Finding 5).
10. binstall's `--only-signed` is opt-in at the *client* invocation, requires the maintainer to publish a minisign keypair and `.sig` files per asset via `[package.metadata.binstall.signing]`, and per binstall's own README "not a lot of the ecosystem produces signatures at the moment." Recommendation: **explicit non-goal** for now — cargo-cyclonedx SBOMs + cargo-auditable already give supply-chain visibility; minisign signing is a second, unrelated key-management surface with no current adopter pressure.
11. dist natively generates exactly five installer kinds: `shell`, `powershell`, `npm`, `homebrew`, `msi`. **Scoop and WinGet are not in that set** — they are listed in dist's own docs as requested-but-unimplemented. Any Scoop/WinGet channel is unavoidably hand-maintained infrastructure outside dist's automation.
12. Homebrew is the one channel dist automates end-to-end: `installers = ["homebrew"]` + `tap = "<org>/homebrew-tap"` + `publish-jobs = ["homebrew"]`, with a `HOMEBREW_TAP_TOKEN` (repo-scope PAT) pushed once as a CI secret. Recurring cost after setup is near zero — dist writes and pushes the formula on every release.
13. Recommendation: **grimoire adopts Homebrew** (low cost, dist-automated, matches its "single binary on PATH" model). **ocx declines Homebrew** — the same CAS-bypass problem as ocx declining dist's shell/powershell installer applies identically to a Homebrew-managed `bin/ocx`: `brew upgrade` and `ocx self update` would race over ownership of the same PATH entry with neither aware of the other.
14. Recommendation: **both repos decline Scoop.** It requires a separate bucket repo, a hand-written JSON manifest, and a `checkver`/`autoupdate` block to avoid a per-release manual bump — real, uncompensated toil dist does not cover, for an audience (`irm | iex` PowerShell users) the existing installer already reaches.
15. Recommendation: **both repos decline WinGet for now**, but the trigger is stated, not left open-ended: WinGet requires a PR per release to `microsoft/winget-pkgs` (versioned folder path, `InstallerSha256` must match exactly, automated + manual review queue) — real per-release toil unless automated via a maintained third-party GitHub Action (e.g. `winget-releaser`). Revisit only if a Windows-locked-down-corp-policy user actually blocks on it; until then this is speculative infrastructure.
16. `self_update` (crates.io, `jaemk/self_update`, currently `1.0.0-rc.6`) supports SHA-256 checksum verification against GitHub-published digests plus optional `zipsign` signatures — stronger than a bare checksum, but it is still a **second, independent trust root** bolted beside the OCI content-addressable digest chain both tools already use for every package they manage.
17. This exact tradeoff is already litigated inside the ocx repo: `adr_self_setup.md` Decision 2B ("adopt the running binary via a GitHub-release checksum, TOFU-style, rustup-init pattern") was **RATIFIED REJECTED** by the human architect specifically because "two objects at the same logical identity (version) could exist in the store with different provenance proofs," contradicting the CAS's single-invariant design.
18. Recommendation: `self_update`, `axoupdater`, and dist's own `install-updater = true` companion-binary feature are all a **non-goal** for both repos, for the same reason 2B was rejected. Self-update belongs entirely inside each tool's own OCI semantics — `ocx self update` (already OCI-digest-verified, shipped) and, if/when grimoire grows a self-update command, it should be `grim self update` pulling `ghcr.io/.../grimoire` like any other package, not a bolted-on checksum swap.
19. grimoire currently has **no self-update command at all** (`main.rs`/`command/` has no `self`/`update` module as of this research) — so there is no existing weaker path to regress; the risk is purely prospective, and the guidance is "don't add `self_update`/`install-updater` when you eventually build one," not "remove something."
20. Both repos' `unix-archive = ".tar.gz"` choice (over dist's `.tar.xz` default) is unrelated to the installer question but load-bearing for binstall's `pkg-fmt = "tgz"` default matching without an override — keep it, and set `pkg-fmt` explicitly anyway rather than relying on the default staying aligned.

## Findings

### 1. dist's rename, current release, and maintenance state

The GitHub README for `axodotdev/cargo-dist` opens with `"dist (formerly known as cargo-dist)"` — a rename in branding, not in the crates.io package name. [github.com/axodotdev/cargo-dist](https://github.com/axodotdev/cargo-dist) shows the repo un-archived, with active issues/PRs. The org page [github.com/axodotdev](https://github.com/axodotdev) lists `cargo-dist` as its top pinned repo with a last-updated date of 2026-07-28 — three weeks before this research, i.e. actively maintained as of writing. crates.io confirms the package is still published as `cargo-dist`, current version `0.32.0`, homepage `axodotdev.github.io/cargo-dist` — [crates.io/api/v1/crates/cargo-dist](https://crates.io/api/v1/crates/cargo-dist). The bare crate name `dist` on crates.io ([crates.io/api/v1/crates/dist](https://crates.io/api/v1/crates/dist)) is an unrelated, effectively-abandoned `0.0.0` "distribution statistics" crate — it is not, and cannot become, the real project's crates.io identity. No shutdown, acquisition, or sunset notice was found on the repo, the org page, or the crates.io listing.

### 2. What changed 0.31.0 → 0.32.0

Releases list, newest first: `0.32.0` (2026-05-21), `0.32.0-prerelease.1` (2026-05-20), `0.31.0` (2026-02-23) — [github.com/axodotdev/cargo-dist/releases](https://github.com/axodotdev/cargo-dist/releases). The changelog between the two ([raw.githubusercontent.com/axodotdev/cargo-dist/main/CHANGELOG.md](https://raw.githubusercontent.com/axodotdev/cargo-dist/main/CHANGELOG.md)) lists: npm installer now uses built-in Node modules instead of `axios`/`rimraf` (min Node 14.14); `cargo-auditable` + `cargo-zigbuild` cross-compilation are no longer mutually exclusive (both repos set `cargo-auditable = true`, so this is directly relevant if either ever cross-builds via zigbuild); double-escaped Windows paths in install receipts fixed; PowerShell download-failure error handling improved; GitHub Actions attestation action bumped `attest-build-provenance@v3` → `attest@v4`. No breaking config changes — the bump from the pinned `cargo-dist-version = "0.31.0"` to `"0.32.0"` in both `dist-workspace.toml` files is safe.

### 3. The installer divergence: why `installers = []` in ocx

`ocx/dist-workspace.toml` sets `installers = []`; `grimoire/dist-workspace.toml` sets `installers = ["shell", "powershell"]`. This is not an inconsistency to fix — it is the direct, documented consequence of ocx's architecture, laid out in `/home/mherwig/dev/ocx/.claude/artifacts/adr_self_setup.md` (Accepted 2026-06-04) and `/home/mherwig/dev/ocx/.claude/rules/workflow-release.md`.

ocx's README installs via `curl -fsSL https://setup.ocx.sh/sh | sh` / `Invoke-RestMethod 'https://setup.ocx.sh/pwsh' | Invoke-Expression` — scripts that live in a **separate repo**, `ocx-sh/www-setup`, not generated by dist and not in `ocx/dist-workspace.toml` at all. `workflow-release.md` states this explicitly: *"cargo-dist handles binary builds, archives, checksums, GitHub Release creation. Do NOT use cargo-dist generated install scripts. OCX use custom bootstrap pattern: install script downloads bootstrap binary from GitHub Releases, runs `ocx install ocx --select`, hands off to OCX own package management. cargo-dist scripts know nothing about OCX three-store architecture."*

The mechanism, per the ADR: the `www-setup` scripts do only platform-detect + download + checksum-verify of a loose bootstrap binary, then exec into `ocx self setup`, which (a) pulls the exact same version into ocx's own OCI content-addressable store via the existing `install_all` path — full manifest/blob/digest verification, no new trust surface — then (b) writes five per-shell env shims (`env.sh`/`env.fish`/`env.ps1`/`env.nu`/`env.elv`) and (c) injects a versioned, hash-guarded managed block into the user's shell RC file (a conda-style `# >>> ocx v1 <hash8> >>>` fence with dirty-edit detection). None of steps (a)-(c) are things dist's shell/powershell installer template can produce — it drops one binary on `PATH` and stops. A dist-generated ocx installer would produce a binary the rest of ocx's tooling cannot see: `ocx self update` operates on the CAS, not on an arbitrary `PATH` entry.

grimoire has none of this — it is a single binary (`[[bin]] name = "grim"`) with no self-managed store, no shim generation, no RC injection. dist's `shell`/`powershell` installer is a complete, correct answer for it, and that is exactly what `installers = ["shell", "powershell"]` selects.

**Convergence verdict:** the two tools should *not* converge on one installer strategy. ocx's bootstrap-then-self-manage pattern is the more correct model for a tool that is itself a package manager with its own CAS; forcing grimoire to adopt it today would be premature architecture for a tool that has no CAS of its own to bootstrap into (see Finding 19). If grimoire ever grows one (it is itself an OCI package manager — see the self-update discussion in Finding 18), the same bootstrap-then-self-setup shape would become the right target, at which point `installers = []` plus a `grimoire-rs/www-setup`-style separate bootstrap repo would be the correct convergence — not before.

### 4. Auditing grimoire's generated shell installer against rustup's hardened convention

grimoire's README (`/home/mherwig/dev/grimoire/README.md:36`) already uses the hardened rustup-style one-liner:

```sh
curl --proto '=https' --tlsv1.2 -LsSf https://setup.grimoire.rs/sh | sh
```

That pins the *outer* fetch (of the installer script itself) to HTTPS/TLS1.2+. But the installer script dist actually generates (`target/distrib/grimoire-installer.sh`, confirmed by local build artifact) downloads the real payload — the release archive — with:

```sh
curl -sSfL "$1" -o "$2"
```

No `--proto '=https'`, no `--tlsv1.2`. This is dist's own template output, not a repo-local edit, and per `workflow-release.md` (*"`.github/workflows/release.yml` generated by cargo-dist. NEVER edit directly... Enforced in CI"*) the same "never hand-edit generated output" discipline applies to the installer script — a manual patch would be silently overwritten on the next `dist generate-ci`/release and has no CI drift-check protecting it the way `release.yml` does.

Before the download, the script does perform checksum verification (`verify_checksum`, `sha256sum -b "$_file"` against a value sourced from dist's own manifest) — so the missing protocol pin is a defense-in-depth gap against an active MITM/TLS-downgrade on an already-`https://github.com/...` URL, not an "installs an unverified binary" problem. Treat as a known, low-severity, upstream-owned gap: track it as a dist feature request rather than a local patch.

### 5. `[package.metadata.binstall]`: what's missing and what it must say

Neither `/home/mherwig/dev/ocx/Cargo.toml` nor `/home/mherwig/dev/grimoire/Cargo.toml` contains a `[package.metadata.binstall]` section (confirmed by direct grep of both files and all workspace member `Cargo.toml`s). Without it, `cargo binstall ocx` / `cargo binstall grimoire` fall through binstall's strategy chain — `crate-meta-data` (what this section would enable) is skipped, and binstall tries `cargo-quickinstall` (a third-party GitHub-Actions-built mirror binstall queries by default) or finally `compile` (`cargo install` from source). Per binstall's own docs, the required keys are ([github.com/cargo-bins/cargo-binstall SUPPORT.md](https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/SUPPORT.md)):

- `pkg-url` — a template string using `{ name }`, `{ version }`, `{ repo }`, `{ target }`, `{ bin }`, `{ archive-suffix }`, `{ binary-ext }`, `{ archive-format }` (soft-deprecated), plus `{ target-arch }`/`{ os-name }`/`{ target-libc }`/`{ target-family }`/`{ target-vendor }`.
- `pkg-fmt` — one of `tgz` (default), `tar`, `zip`, `bin`, plus more listed in [binstalk-types docs](https://docs.rs/binstalk-types/latest/binstalk_types/cargo_toml_binstall/enum.PkgFmt.html).
- `bin-dir` — path to the binary inside the extracted archive, with an automatic `.exe` suffix on Windows.
- `[package.metadata.binstall.overrides.<target-or-cfg>]` — per-target overrides (exact target names win over `cfg()` expressions).

Both repos' actual GitHub Release asset naming was confirmed directly from the generated `grimoire-installer.sh` (`select_archive_for_arch`): filenames are `<name>-<target-triple><ext>` with **no version segment** (e.g. `grimoire-aarch64-pc-windows-msvc.zip`, `grimoire-x86_64-unknown-linux-gnu.tar.gz`), hosted at `.../releases/download/v<version>/<filename>` — matching each repo's `unix-archive = ".tar.gz"` / `windows-archive = ".zip"` dist config. The correct block for both, target archives at the workspace root (no nested directory) — target block, per repo:

```toml
[package.metadata.binstall]
pkg-url = "{ repo }/releases/download/v{ version }/{ name }-{ target }{ archive-suffix }"
bin-dir = "{ bin }{ binary-ext }"
pkg-fmt = "tgz"

[package.metadata.binstall.overrides.x86_64-pc-windows-msvc]
pkg-fmt = "zip"

[package.metadata.binstall.overrides.aarch64-pc-windows-msvc]
pkg-fmt = "zip"
```

This is inert until each package is actually published to crates.io (neither is today, per the task's ground truth) *or* until `cargo binstall --git`/direct-repo resolution is used — binstall can resolve `pkg-url` against a GitHub repo without a crates.io publish when invoked with an explicit `--git`/registry override, but the primary win is `cargo binstall <name>` resolving to this repo's own releases the moment either project does publish, instead of silently falling to `cargo-quickinstall`'s independently-built (and independently-trusted) mirror.

### 6. binstall `--only-signed`: opt-in, not a target

`--only-signed` is a client-side binstall flag that refuses installation of any package lacking a verifiable signature; the complementary `--skip-signatures` disables checking entirely, and the default (neither flag) is best-effort — verify if signing metadata is present, proceed without it if not ([github.com/cargo-bins/cargo-binstall README](https://github.com/cargo-bins/cargo-binstall/blob/main/README.md)). Enabling it as a maintainer requires an `[package.metadata.binstall.signing]` block naming `algorithm = "minisign"` and a `pubkey`, plus publishing a `.sig` file alongside every release asset (default location `{ url }.sig`) — [github.com/cargo-bins/cargo-binstall SIGNING.md](https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/SIGNING.md). binstall's own README describes this as "initial, limited support" and notes "not a lot of the ecosystem produces signatures at the moment." Given both repos already produce a cargo-cyclonedx SBOM and cargo-auditable dependency metadata per release, adding a second, minisign-specific key-management surface for a client-side flag with near-zero ecosystem adoption is not worth it today. State this as an **explicit non-goal**, not a silent gap — the pieces exist if a concrete `--only-signed` consumer shows up.

### 7. Channel economics: Homebrew, Scoop, WinGet

dist's own installer catalog is exactly five kinds — `shell`, `powershell`, `npm`, `homebrew`, `msi` — confirmed directly from the dist book's installer index: *"Currently supported installers include: shell... powershell... npm... homebrew... msi..."*, with Scoop and WinGet named as requested-but-not-implemented ([axodotdev.github.io/cargo-dist/book/installers/index.html](https://axodotdev.github.io/cargo-dist/book/installers/index.html)).

**Homebrew** — dist automates the whole channel: `installers = ["homebrew"]`, `tap = "<org>/homebrew-tap"`, `publish-jobs = ["homebrew"]`, plus a one-time `HOMEBREW_TAP_TOKEN` (PAT with `repo` scope) as a CI secret pushing to a tap repo dist creates the content for on every release ([axodotdev.github.io/cargo-dist/book/installers/homebrew.html](https://axodotdev.github.io/cargo-dist/book/installers/homebrew.html)). The one caveat that page states plainly: "Homebrew fundamentally does not support the notion of a package having multiple published versions" — a non-linear release history (a patch release shipped after a newer minor) can leave the tap formula pointing at the wrong version, recoverable by a manual `git revert` in the tap repo. **Recommendation: grimoire adopts** (artifact: `grimoire-rs/homebrew-tap` formula, CI-pushed; cost: one-time token setup, near-zero recurring; owner: release CI). **ocx declines** — same CAS-bypass reasoning as Finding 3: a Homebrew-managed `bin/ocx` is an untracked, unmanaged install `ocx self update` cannot see, and `brew upgrade` racing against `ocx self update` over the same `PATH` entry with neither aware of the other is a strictly worse version of the problem `installers = []` already avoids.

**Scoop** — not dist-native. The artifact is a hand-written JSON manifest in a bucket repo the maintainer owns (or a submission to a shared bucket like `scoop-extras`, ceding control of update timing/review), with a `checkver`/`autoupdate` block required to avoid a manual version bump on every release. **Recommendation: both repos decline.** Cost is real (a bucket repo + manifest + autoupdate regex to build and keep correct) for an audience the PowerShell one-liner (`irm ... | iex`) already reaches; no dist automation covers it, so it is pure incremental maintenance surface with no current demand signal.

**WinGet** — submission is a PR to `microsoft/winget-pkgs`, one version-numbered folder (`manifests/<letter>/<publisher>/<app>/<version>/`) per release, with `InstallerSha256` required to match the actual asset hash exactly and an automated-plus-sometimes-manual review queue before merge ([learn.microsoft.com/.../package/repository](https://learn.microsoft.com/en-us/windows/package-manager/package/repository)). That is genuine per-release toil unless offloaded to a maintained third-party GitHub Action (e.g. `winget-releaser`, not audited here) that runs `wingetcreate update` in CI. **Recommendation: both repos decline for now**, with a stated, non-hand-wavy trigger: adopt only when a user is actually blocked by a Windows environment where `irm | iex` is disallowed by policy but WinGet is pre-approved — until that concrete case exists, this is speculative infrastructure with a real, non-zero recurring cost.

### 8. Self-update: `self_update`/axoupdater vs. OCI-digest semantics

Both ocx and grimoire are themselves package managers over an OCI registry, with every object they install verified by content-addressable digest. The question is whether either tool's *own* binary update should ride a different, weaker verification path.

`self_update` (crates.io `1.0.0-rc.6`, [github.com/jaemk/self_update](https://github.com/jaemk/self_update)) checks a downloaded release asset against the SHA-256/SHA-512 digest GitHub publishes per asset, with optional stronger `zipsign` signature verification. That is a legitimate, real verification step — but it is a **second trust root**, entirely independent of the OCI manifest/blob-digest chain the tool already trusts for every package it manages.

dist ships the same shape as a first-party feature: `install-updater = true` in `Cargo.toml` bundles `axodotdev/axoupdater` as a companion `<name>-update` binary alongside the shell/powershell installer, which checks GitHub Releases and self-swaps ([axodotdev.github.io/cargo-dist/book/installers/updater.html](https://axodotdev.github.io/cargo-dist/book/installers/updater.html)). Its own docs do not describe the verification it performs beyond "check for updates and install if available" — functionally the same GitHub-release-checksum shape as `self_update`, not OCI-digest-verified.

This exact tradeoff has already been fully argued and decided inside the ocx repo. `adr_self_setup.md` Decision 2 considered "self-copy the running binary into the CAS" (2B) as a TOFU/rustup-init-style alternative to re-pulling from the OCI registry — and it was **RATIFIED REJECTED** by the human architect (2026-06-11) on exactly this ground: *"An adoption path would therefore require a second root of trust alongside OCI digests... two objects at the same logical identity (version) could exist in the store with different provenance proofs. This contradicts the single-invariant design that makes GC reachability proofs simple and makes the store self-auditable."* ocx's actual self-update (`ocx self update`) instead re-pulls its own release through the identical `install_all` OCI path used for every other package — no separate checksum trust root at all.

grimoire currently has **no self-update command** — no `self`/`update` module exists under `/home/mherwig/dev/grimoire/src` as of this research, confirmed by direct search. There is therefore no existing weaker path to regress today; the guidance is purely prospective. **Recommendation:** if/when grimoire adds self-update, it should be `grim self update` (or equivalent) pulling `ghcr.io/.../grimoire` through grimoire's own OCI client — the same digest-verified path used for every skill/rule/agent it installs — never `self_update`, never dist's `install-updater = true`. Declaring `install-updater = true` in either `Cargo.toml` today is a concrete, easy-to-flag anti-pattern: it would give the tool two update mechanisms with two different trust models for the exact same artifact class the tool otherwise treats uniformly.

## Normative guidance candidates

1. **Bump `cargo-dist-version = "0.32.0"` in both `dist-workspace.toml`.** Rationale: current release, no breaking changes since 0.31.0 (Finding 2). VERIFICATION: `grep cargo-dist-version dist-workspace.toml` shows `"0.32.0"`; `dist generate --check` (or the existing `verify-release-ci.yml` gate) passes clean.
2. **Never install a Scoop/WinGet channel by hand-writing a manifest "to match what dist would generate."** Rationale: dist does not generate either — a hand-maintained manifest carries full per-release update burden dist's CI never automates (Finding 7). VERIFICATION: no `*.json` Scoop manifest or `winget-pkgs` fork/PR exists in either repo's release tooling unless a corresponding CI automation step also exists.
3. **Never hand-patch `target/distrib/*-installer.sh` (or its committed template) to add `--proto '=https' --tlsv1.2` to the internal `curl` call.** Rationale: it is dist-generated output; a local edit is silently discarded on the next `dist generate-ci`/regeneration, same failure mode `workflow-release.md` already documents for `release.yml` (Finding 4). VERIFICATION: `git diff` on the generated installer after any `dist generate-ci` run shows no local delta reintroduced by hand.
4. **Add `[package.metadata.binstall]` to both `Cargo.toml`s using the exact `<name>-<target>` archive-naming scheme, before either package is published to crates.io.** Rationale: absent this block, a future `cargo binstall ocx`/`cargo binstall grimoire` resolves via `cargo-quickinstall`'s independent mirror or falls back to source compile, never the project's own release (Finding 5). VERIFICATION: `cargo binstall --dry-run <name>` (once published) reports the `crate-meta-data` strategy, not `quick-install` or `compile`.
5. **Do not add `[package.metadata.binstall.signing]` / pursue `--only-signed` support until a concrete consumer requires it.** Rationale: minisign signing is a second, narrow-adoption key-management surface layered on top of the SBOM/audit tooling already in place; binstall's own maintainers call ecosystem signing adoption sparse (Finding 6). VERIFICATION: absence of `[package.metadata.binstall.signing]` in either `Cargo.toml`, revisited only on an explicit request.
6. **Keep `installers = []` in ocx and do not add any dist-generated installer to it, including `homebrew`.** Rationale: any installer that drops a binary outside ocx's own CAS/shim/RC-block model creates an untracked install ocx's own `self update`/`self setup` cannot see or heal (Findings 3, 7). VERIFICATION: `ocx/dist-workspace.toml` `installers` key stays `[]`; any PR adding to it is treated as an architecture change requiring the same review bar as `adr_self_setup.md`.
7. **Add `installers = ["shell", "powershell", "homebrew"]` and a `tap`/`publish-jobs`/`HOMEBREW_TAP_TOKEN` to grimoire's dist config when macOS-brew-user demand exists**, keeping shell/powershell as-is otherwise. Rationale: dist automates Homebrew end-to-end at near-zero recurring cost, and grimoire (unlike ocx) has no CAS-ownership conflict (Finding 7). VERIFICATION: `dist plan` lists a `homebrew` installer artifact; the tap repo's formula file updates automatically on the next tagged release.
8. **Never set `install-updater = true` (dist's axoupdater bundling) or add the `self_update` crate as a dependency in either repo.** Rationale: both are a GitHub-release-checksum trust root distinct from, and weaker than, the OCI content-addressable digest chain each tool already uses for every package it manages — the exact tradeoff ocx's own ADR already ratified-rejected for its CAS (Finding 8). VERIFICATION: `install-updater` absent from both `Cargo.toml`s; neither `Cargo.lock` contains `self_update` or `axoupdater`; any future self-update command lands as `<tool> self update` calling the tool's own OCI client, reviewable against `adr_self_setup.md` Decision 2 as precedent.

## AI-agent angle

An autonomous agent asked to "fix" the ocx/grimoire installer divergence will, by default pattern-matching on "two sibling repos, one field differs, make them consistent," either (a) set `installers = ["shell", "powershell"]` on ocx to "match grimoire," silently producing a second, ocx-CAS-unaware install path that fights `ocx self setup`/`ocx self update` for ownership of the same `PATH` entry, or (b) blank out grimoire's installers "to match ocx," deleting grimoire's only working install channel with no replacement. Both are plausible, both are wrong, and the reason is undocumented anywhere dist itself can tell the agent — it lives entirely in `adr_self_setup.md`, a file dist's own tooling has no reason to read.

The smallest mechanical check that catches this: before changing the `installers` key in either `dist-workspace.toml`, `grep -l "adr_self_setup\|self setup\|self update" <repo>/.claude/rules/*.md <repo>/.claude/artifacts/*.md` — if the target repo has an ADR discussing its own install/update architecture, the `installers` field is load-bearing for that architecture and any change is an architecture decision, not a config sync, and needs the same review bar as the ADR that set it. Absence of such a file (as in grimoire today) is itself the signal that the field is still just "which dist installer to generate," safely editable.

A second, narrower trap: an agent asked to "harden the install script" will reach for editing `target/distrib/*-installer.sh` or a committed copy of it directly, because that's where the vulnerable `curl -sSfL` line literally is. The mechanical check: `git log --oneline -- '*installer.sh' '*installer.ps1'` — if the file has no commit history of its own (it's a build artifact regenerated by `dist generate-ci`/`dist build`), any edit belongs upstream (a dist issue/PR) or in the outer one-liner the README controls, never in the generated file.

## Contested / evolving

- **dist's own installer roadmap for Scoop/WinGet.** The book lists both as requested features, not committed ones, with no target version found in the changelog reviewed. This is a real gap in dist's coverage, not a settled "won't do" — worth re-checking on the next dist version bump rather than treating today's absence as permanent.
- **binstall signing adoption.** `--only-signed` is real, shipped, and stable in its mechanics, but ecosystem-wide adoption is admittedly sparse per binstall's own maintainers. This is the kind of thing that can tip from "non-goal" to "expected" if a major downstream consumer (e.g. a corporate binstall-only policy) starts filtering unsigned crates — worth a periodic re-check, not a one-time decision.
- **Homebrew's single-version model.** dist's own docs flag that Homebrew "fundamentally does not support... multiple published versions," meaning any hotfix-after-a-newer-release scenario needs a manual tap-repo revert. This is a known, accepted rough edge in the wider Homebrew ecosystem (not dist-specific) rather than something dist or either repo can design around.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [github.com/axodotdev/cargo-dist](https://github.com/axodotdev/cargo-dist) | Primary repo | checked 2026-08, active | Ground truth for maintenance state, rename framing, activity level |
| [github.com/axodotdev/cargo-dist/releases](https://github.com/axodotdev/cargo-dist/releases) | Release list | 0.32.0, 2026-05-21 | Confirms current version and release cadence |
| [raw.githubusercontent.com/axodotdev/cargo-dist/main/CHANGELOG.md](https://raw.githubusercontent.com/axodotdev/cargo-dist/main/CHANGELOG.md) | Changelog | through 0.32.0 | Exact diff between the pinned 0.31.0 and current 0.32.0 |
| [github.com/axodotdev](https://github.com/axodotdev) | Org page | checked 2026-08, last update 2026-07-28 | Independent maintenance-recency signal beyond the single repo |
| [crates.io/api/v1/crates/cargo-dist](https://crates.io/api/v1/crates/cargo-dist) | Registry API | current | Confirms crates.io identity is still `cargo-dist`, not `dist` |
| [crates.io/api/v1/crates/dist](https://crates.io/api/v1/crates/dist) | Registry API | current | Confirms the `dist` crate name is squatted by an unrelated project |
| [axodotdev.github.io/cargo-dist/book/installers/index.html](https://axodotdev.github.io/cargo-dist/book/installers/index.html) | dist book | current (0.32.0-era) | Authoritative list of dist-generated installer kinds — proves Scoop/WinGet are not native |
| [axodotdev.github.io/cargo-dist/book/installers/homebrew.html](https://axodotdev.github.io/cargo-dist/book/installers/homebrew.html) | dist book | current | Exact config keys and token/secret needed for automated Homebrew publishing |
| [axodotdev.github.io/cargo-dist/book/installers/updater.html](https://axodotdev.github.io/cargo-dist/book/installers/updater.html) | dist book | current, feature since 0.12.0 | Describes `install-updater`/axoupdater's actual behavior and trust model |
| [github.com/axodotdev/axoupdater](https://github.com/axodotdev/axoupdater) | axoupdater repo | active | Confirms it's a standalone/library GitHub-release updater, not OCI-aware |
| [github.com/jaemk/self_update](https://github.com/jaemk/self_update) | `self_update` crate repo | 1.0.0-rc.6 | Confirms checksum + optional zipsign-signature verification model |
| [raw.githubusercontent.com/cargo-bins/cargo-binstall/main/SUPPORT.md](https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/SUPPORT.md) | binstall docs | current | Exact `[package.metadata.binstall]` keys, template variables, pkg-fmt values |
| [github.com/cargo-bins/cargo-binstall README](https://github.com/cargo-bins/cargo-binstall/blob/main/README.md) | binstall docs | current | `--only-signed`/`--skip-signatures` semantics and adoption caveat |
| [raw.githubusercontent.com/cargo-bins/cargo-binstall/main/SIGNING.md](https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/SIGNING.md) | binstall docs | current | Exact `[package.metadata.binstall.signing]` shape (minisign, `.sig` hosting) |
| [learn.microsoft.com/.../package/repository](https://learn.microsoft.com/en-us/windows/package-manager/package/repository) | Microsoft Learn | updated 2026-07-14 | Authoritative WinGet submission process and per-release PR burden |

**In-repo primary sources read directly** (not web, but load-bearing and cited throughout Findings 3-4, 8): `/home/mherwig/dev/ocx/dist-workspace.toml`, `/home/mherwig/dev/grimoire/dist-workspace.toml`, `/home/mherwig/dev/ocx/.claude/artifacts/adr_self_setup.md`, `/home/mherwig/dev/ocx/.claude/rules/workflow-release.md`, `/home/mherwig/dev/grimoire/target/distrib/grimoire-installer.sh`, `/home/mherwig/dev/ocx/README.md`, `/home/mherwig/dev/grimoire/README.md`.
