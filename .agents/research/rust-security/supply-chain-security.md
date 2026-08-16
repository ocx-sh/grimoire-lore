---
title: Rust Dependency & Build Supply-Chain Security
topic: dependency-and-build-supply-chain-security
agent: rust-security-researcher
model: sonnet
date_researched: "2026-08"
sources_count: 33
scope: >
  Covers cargo-audit/RustSec, cargo-deny, cargo-vet, cargo-crev, lockfile policy
  (binaries vs libraries, --locked/--frozen, MSRV-aware resolver), named historical
  crates.io incidents, build-script/proc-macro risk, reproducible builds, vendoring,
  SBOM generation, SLSA/attestations/sigstore, and CLI-installer trust models (relevant
  to grim/ocx, which install and exec third-party binaries). Does NOT cover general
  Rust memory-safety/unsafe-code review, network protocol security, or non-Cargo build
  systems (Bazel/Buck rust rules).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Advisory scanning: cargo-audit and the RustSec advisory database](#1-advisory-scanning-cargo-audit-and-the-rustsec-advisory-database)
   2. [cargo-deny: advisories, bans, licenses, sources — annotated](#2-cargo-deny-advisories-bans-licenses-sources--annotated)
   3. [cargo-vet: audits, criteria, trusted publishers](#3-cargo-vet-audits-criteria-trusted-publishers)
   4. [cargo-crev: web-of-trust review](#4-cargo-crev-web-of-trust-review)
   5. [Combining the tools in CI without drowning in noise](#5-combining-the-tools-in-ci-without-drowning-in-noise)
   6. [Lockfile policy: binaries vs libraries, --locked/--frozen](#6-lockfile-policy-binaries-vs-libraries---locked---frozen)
   7. [cargo update cadence and Renovate](#7-cargo-update-cadence-and-renovate)
   8. [Minimal-version testing and MSRV](#8-minimal-version-testing-and-msrv)
   9. [Named historical incidents](#9-named-historical-incidents)
   10. [Threat: malicious build.rs and proc macros](#10-threat-malicious-buildrs-and-proc-macros)
   11. [Threat: typosquatting and dependency confusion](#11-threat-typosquatting-and-dependency-confusion)
   12. [Build integrity: reproducibility, remap-path-prefix, SOURCE_DATE_EPOCH](#12-build-integrity-reproducibility-remap-path-prefix-source_date_epoch)
   13. [Vendoring, [patch], git dependencies](#13-vendoring-patch-git-dependencies)
   14. [Registry integrity: sparse protocol, checksums, trusted publishing](#14-registry-integrity-sparse-protocol-checksums-trusted-publishing)
   15. [SBOM: cargo-cyclonedx, cargo-sbom, cargo-auditable](#15-sbom-cargo-cyclonedx-cargo-sbom-cargo-auditable)
   16. [SLSA, GitHub artifact attestations, sigstore/cosign](#16-slsa-github-artifact-attestations-sigstorecosign)
   17. [Distribution security for CLI installers (grim/ocx-relevant)](#17-distribution-security-for-cli-installers-grimocx-relevant)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- `cargo audit` and `cargo deny check advisories` both read the community-run [RustSec advisory database](https://github.com/rustsec/advisory-db) — advisory IDs are `RUSTSEC-YYYY-NNNN`; run one of the two in CI, not neither.
- `deny.toml` has four checks — `[advisories]`, `[bans]`, `[licenses]`, `[sources]` — and a real production example (EmbarkStudios' own) is ~45 lines; copy its shape, don't invent one.
- `cargo-vet` is fundamentally different from audit/deny: it doesn't check a CVE list, it requires every dependency to have been read and certified by a named human against a criterion (`safe-to-run` / `safe-to-deploy`), recorded in a committed `audits.toml`.
- Commit `Cargo.lock` for binaries; the long-standing "don't commit it for libraries" advice still holds, but the reason is precise: the lockfile only constrains *your own* build, never a library's downstream consumers, so it gives library authors a false sense of determinism ([Cargo Book FAQ](https://doc.rust-lang.org/cargo/faq.html)).
- `cargo install` **ignores** the published `Cargo.lock` unless you pass `--locked` — this is the opposite of what most people assume, and it means an unpinned `cargo install` of a tool can silently pull newer (possibly compromised) transitive deps ([cargo install docs](https://doc.rust-lang.org/cargo/commands/cargo-install.html)).
- Rust 1.84 shipped an MSRV-aware resolver behind `resolver.incompatible-rust-version = "fallback"`; edition 2024 (`resolver = "3"`) makes it the default, so `cargo new` in the 2024 era gets MSRV-respecting resolution without extra flags ([RFC 3537](https://rust-lang.github.io/rfcs/3537-msrv-resolver.html)).
- The one universally-cited, unambiguous malicious-crate incident is `rustdecimal` (typosquat of `rust_decimal`, published 2022-03-25, reported 2022-05-02, ran a Linux/macOS payload when `GITLAB_CI` was set) — cite this one with dates, not vague "there have been incidents" ([rust-lang blog](https://blog.rust-lang.org/2022/05/10/malicious-crate-rustdecimal/)).
- A second, larger, more recent incident: `faster_log`/`async_println` typosquatted `fast_log`, published 2025-05-25, 8,424 combined downloads, scanned source files for Solana/Ethereum private keys and exfiltrated them over HTTP — discovered by Socket and pulled 2025-09-24 ([rust-lang blog](https://blog.rust-lang.org/2025/09/24/crates.io-malicious-crates-fasterlog-and-asyncprintln)).
- As of 2026-02, crates.io stopped writing a blog post for every removed malicious crate (volume made it noise) — RustSec advisories remain the canonical, complete feed; watch the advisory-db RSS/git log, not the blog ([rust-lang blog](https://blog.rust-lang.org/2026/02/13/crates.io-malicious-crate-update)).
- Both `build.rs` and proc-macro crates execute arbitrary code **on the developer/CI machine at `cargo build`/`cargo check` time**, before any of the program's own runtime sandboxing exists — treat any new dependency that ships a build script or is a proc-macro as requiring closer review, and know that no mainstream tool sandboxes this by default in 2026.
- crates.io added Trusted Publishing (OIDC, short-lived tokens, no long-lived `CARGO_REGISTRY_TOKEN` secret) for GitHub Actions in 2025 and for GitLab.com CI in 2025/2026 ([RFC 3691](https://rust-lang.github.io/rfcs/3691-trusted-publishing-cratesio.html), [crates.io dev update](https://blog.rust-lang.org/2025/07/11/crates-io-development-update-2025-07)).
- `cargo vendor` + `[patch]` for git deps is the standard offline/air-gapped-build pattern, but git dependencies carry **no checksum** in `Cargo.lock` by default — pin git deps to a commit SHA (`rev = "..."`), never a branch, if used at all.
- GitHub Artifact Attestations (GA June 2024) give SLSA v1.0 Build Level 2 automatically on GitHub-hosted runners and are increasingly the default provenance mechanism for Rust binary releases via `cargo-dist`; verify with `gh attestation verify`.
- `cargo-binstall` supports minisign package signatures via `[package.metadata.binstall.signing]` in the publisher's `Cargo.toml`, but signing is opt-in and most of the ecosystem does not publish signatures — `cargo-binstall`'s baseline trust is "crates.io metadata over HTTPS + checksum," not artifact signatures.
- SBOM generation for Rust has two real tools: `cargo-cyclonedx` (CycloneDX format, reads `cargo metadata` + `Cargo.lock`, feature/target-aware) and `cargo-sbom` (built into recent cargo as an unstable/plumbing feature); `cargo-auditable` is a third, different thing — it embeds the dependency tree *into the compiled binary itself* so a shipped binary can be scanned without source access.
- Reproducible builds in Rust are an active, unfinished area: `--remap-path-prefix` plus `SOURCE_DATE_EPOCH` get you close, but known bugs remain (e.g. split-debuginfo `.dwo` paths leaking absolute paths); RFC 3127 (`-Zremap-path-scope` / `-Ztrim-paths`) is the in-progress fix, still nightly-gated as of the era researched.
- `unmaintained` RustSec advisories are informational by default in cargo-deny (`unmaintained = "workspace"` warns once per workspace rather than failing per-crate) — treat "unmaintained" and "vulnerable" as different severities in policy, not the same gate.

## Findings

### 1. Advisory scanning: cargo-audit and the RustSec advisory database

`cargo audit` is the reference CLI for scanning a `Cargo.lock` (or an audited binary — see §15) against the [RustSec Advisory Database](https://rustsec.org/), a community-maintained, git-based database of `RUSTSEC-YYYY-NNNN`-numbered advisories, each with affected version ranges, patched versions, a severity rating, and a CVE cross-reference where one exists ([rustsec.org](https://rustsec.org/), [advisory-db README](https://github.com/rustsec/advisory-db/blob/main/README.md)). `cargo audit` fetches the latest advisory DB on every run — there is no separate "update the database" step to forget.

```bash
cargo install cargo-audit --locked
cargo audit                      # scans Cargo.lock in cwd
cargo audit --deny warnings      # fail CI on any advisory, incl. unmaintained/notice
```

`cargo-deny`'s `[advisories]` check reads the **same** database, so most teams pick one tool as the advisory gate (usually `cargo-deny`, since it also does bans/licenses/sources) rather than running both.

### 2. cargo-deny: advisories, bans, licenses, sources — annotated

Below is EmbarkStudios' own production `deny.toml` (their tool, their dogfood config), fetched verbatim, annotated inline. This is the config to imitate — it is small, and every field is load-bearing ([source](https://github.com/EmbarkStudios/cargo-deny/blob/main/deny.toml)):

```toml
[graph]
# Restrict the check to the platforms you actually ship, not every Rust target —
# unreachable platforms otherwise generate irrelevant multiple-versions noise.
targets = [
    "x86_64-unknown-linux-gnu",
    "aarch64-unknown-linux-gnu",
    "x86_64-unknown-linux-musl",
    "aarch64-apple-darwin",
    "x86_64-apple-darwin",
    "x86_64-pc-windows-msvc",
]
all-features = true              # check the graph as-if every feature were on

[advisories]
unmaintained = "workspace"       # one warning per workspace, not per-crate spam
unsound = "all"                  # unsoundness advisories always fail
ignore = [ ]                     # RUSTSEC IDs explicitly accepted-risk, with reasons expected in PR review

[bans]
multiple-versions = "deny"       # catches two majors of the same crate in the tree
wildcards = 'deny'                # "*" version requirements are banned outright
deny = [
    { crate = "git2", use-instead = "gix" },
    { crate = "openssl", use-instead = "rustls" },
    { crate = "openssl-sys", use-instead = "rustls" },
    "libssh2-sys",
    { crate = "cmake", use-instead = "cc" },
    { crate = "windows", reason = "bloated and unnecessary", use-instead = "ideally inline bindings, practically, windows-sys" },
]
skip = [                          # named-version exceptions to multiple-versions, with a reason
    { crate = "getrandom@0.2.17", reason = "ring uses this old version" },
    { crate = "hashbrown@0.15.5", reason = "petgraph uses this old version" },
]
skip-tree = [                     # skip a whole subtree, for crates that churn versions constantly
    { crate = "windows-sys", reason = "a foundational crate for many that bumps far too frequently to ever have a shared version" },
]

[bans.std-replacements]
scope = "workspace"

[sources]
unknown-registry = "deny"        # only vetted registries (crates.io by default) — blocks dependency confusion via ad-hoc registries
unknown-git = "deny"             # only vetted git hosts — blocks silent git-dependency swaps

[licenses]
confidence-threshold = 0.93      # cargo-deny infers license from LICENSE text when Cargo.toml is ambiguous; keep this high
allow = [
    "Apache-2.0", "Apache-2.0 WITH LLVM-exception", "MIT", "ISC", "Unicode-3.0", "Zlib",
]
exceptions = [ ]                  # per-crate license overrides, each needs a reason in review
```

Key operational notes not obvious from the file alone:
- `[sources] unknown-registry/unknown-git = "deny"` is the single line that stops a compromised or malicious `[patch]`/git override or an unreviewed private registry from entering the build silently — this is the cargo-deny equivalent of an allowlist for *where* code is allowed to come from.
- `unmaintained = "workspace"` deliberately makes "this transitive dep is unmaintained" non-blocking-by-default (it's a workspace-wide warning), because in large graphs an unmaintained-but-vulnerability-free leaf crate is common and should not gate every PR — contrast with `unsound = "all"`, which always fails.
- Official docs for the full check semantics: [cargo-deny config reference](https://embarkstudios.github.io/cargo-deny/checks/cfg.html); shipped as a first-class [GitHub Action](https://github.com/EmbarkStudios/cargo-deny-action).

### 3. cargo-vet: audits, criteria, trusted publishers

`cargo-vet` (Mozilla-originated, now used by Mozilla, Google/Android/Chromium/Fuchsia, ISRG) is not a vulnerability scanner — it enforces that **every crate version in the dependency graph has been read by a named human** and certified against a criterion, recorded in a committed `audits.toml` ([cargo-vet intro](https://mozilla.github.io/cargo-vet/)).

Two built-in criteria ship out of the box, and are composable: `safe-to-run` (fine to execute, e.g. in a build script or test) and `safe-to-deploy` (fine to ship in a production binary — implies `safe-to-run`) ([audit criteria docs](https://mozilla.github.io/cargo-vet/audit-criteria.html)). Teams can define stricter custom criteria (Google's `rust-crate-audits` uses a `ub-risk-0`..`ub-risk-4` implication chain for unsafe-code risk — [google/rust-crate-audits](https://github.com/google/rust-crate-audits)).

Two mechanisms make cargo-vet usable at scale instead of a full audit-everything burden:
- **Importing audits**: pull in another org's `audits.toml` (Mozilla's, Google's) so crates they've already vetted don't need re-review ([importing audits](https://mozilla.github.io/cargo-vet/importing-audits.html)).
- **Trusted publishers / wildcard audits**: certify that *any* version published by a specific account will meet a criterion, rather than re-auditing every release diff — e.g. ISRG/Mozilla/Bytecode Alliance trust all crates published by BurntSushi's account ([wildcard audit entries](https://mozilla.github.io/cargo-vet/wildcard-audit-entries.html)).

```bash
cargo install cargo-vet --locked
cargo vet init
cargo vet          # fails CI if any crate in the graph lacks a sufficient audit
cargo vet certify <crate> <version>   # record that you personally reviewed it
```

### 4. cargo-crev: web-of-trust review

`cargo-crev` predates cargo-vet and uses a decentralized web-of-trust model: reviewers publish signed "proofs" (crev IDs, trust levels, per-crate reviews) to git repositories, and you build trust transitively through people you trust ([crev-dev/cargo-crev](https://github.com/crev-dev/cargo-crev)). It remains maintained (releases through 2026) but has far lower adoption than cargo-vet in production Rust shops — cargo-vet's centralized, org-scoped model fits corporate review workflows better than crev's social web-of-trust model. For a small team, cargo-vet (or nothing beyond cargo-deny) is the pragmatic default; crev is worth knowing about, not defaulting to.

### 5. Combining the tools in CI without drowning in noise

The three tools check different things and are not redundant:

| Tool | Answers | Gate on |
|---|---|---|
| cargo-audit / cargo-deny advisories | "Is a known CVE/RUSTSEC in my lock file?" | Any advisory except explicitly `ignore`d IDs |
| cargo-deny bans/sources/licenses | "Is my dependency graph shaped the way policy requires?" | Banned crates, duplicate majors, unapproved licenses, unvetted sources |
| cargo-vet | "Has a human actually read this code?" | Missing audit for any crate/version in the graph |

Practical noise-control patterns actually used:
- Run `cargo deny check` as a single required CI job covering advisories+bans+licenses+sources — one job, one pass/fail, instead of three flaky separate ones.
- Pin the advisory database checkout or accept that `cargo audit`/`cargo deny`'s DB fetch means a build can start passing→failing with no code change — treat a sudden CI failure with no diff as "new RUSTSEC advisory," not as flaky CI, and don't just retry it.
- Use `[advisories].ignore` and `[bans].skip`/`skip-tree` for accepted risk, but require a `reason` string and treat additions to those lists as review-worthy diffs, not rubber-stamped.
- cargo-vet's noise-control is `unpublished = "..."` handling and wildcard/trusted-publisher audits (§3) — without them, a large graph is an unauditable wall of unreviewed crates on day one; importing an established org's `audits.toml` is what makes adopting cargo-vet tractable rather than a multi-week backlog.
- Don't run cargo-audit and cargo-deny-advisories both as blocking gates against the same DB — pick one as authoritative to avoid two "the same CVE is failing" alerts with different messaging.

### 6. Lockfile policy: binaries vs libraries, --locked/--frozen

**Commit `Cargo.lock` for binaries. Don't (necessarily) for libraries** — this is still current guidance, but the reasoning matters more than the rule: `Cargo.lock` only pins *your own* crate's resolved graph; it has zero effect on what versions get resolved for anyone depending on your library, because downstream resolution reads only `Cargo.toml`'s version requirements. A library author who commits `Cargo.lock` and never looks at it gets a false sense that they've tested a known-good set of versions ([Cargo Book FAQ](https://doc.rust-lang.org/cargo/faq.html)).

```
✅ Binary crate (a CLI, a service): commit Cargo.lock.
   - Deterministic builds across machines/CI/time; helps git bisect.
✅ Library crate: Cargo.lock may be committed for CI reproducibility of *its own*
   test suite, but is irrelevant to consumers — don't rely on it as a security
   control for downstream users.
```

**`--locked` and `--frozen`**:
- `cargo build --locked` / `cargo test --locked`: fail instead of silently updating `Cargo.lock` if it's out of sync with `Cargo.toml`. Use in CI and release builds — this is what actually enforces "the lockfile you committed is the lockfile that gets built."
- `cargo install --locked`: **critically**, `cargo install` *ignores the published crate's `Cargo.lock` by default* and re-resolves dependencies — meaning a plain `cargo install some-tool` can pull newer (and potentially newly-compromised or newly-broken) transitive dependencies than the maintainer tested, even though the maintainer published a lockfile ([cargo install docs](https://doc.rust-lang.org/cargo/commands/cargo-install.html)). Always pass `--locked` when installing a tool for reproducible/security-sensitive use. Note: crates published before Cargo 1.37 have no `Cargo.lock` to lock to.
- `--frozen` = `--locked` + `--offline` combined: fail if network access would be required at all. Use in fully air-gapped/sandboxed CI to catch an unexpected registry hit.

```bash
# release/CI build — reject any lockfile drift
cargo build --release --locked

# installing a security-sensitive tool (this is grim/ocx's own use case
# when it shells out to `cargo install` for anything, and the lesson for
# grim/ocx's own installer logic: don't trust an unpinned resolve)
cargo install some-tool --locked
```

### 7. cargo update cadence and Renovate

There's no single numeric SLA in official docs, but the operative pattern: `cargo update` bumps `Cargo.lock` within existing `Cargo.toml` semver constraints; `cargo update --precise <ver> -p <crate>` targets one crate. Automated update tooling is standard: Renovate supports Cargo natively — it scans `Cargo.toml`, extracts `crate`, `git-refs`/`git-tags`/`github-tags`/`gitlab-tags` datasources, and runs `cargo update` to refresh both `Cargo.toml` and `Cargo.lock` together, with `lockFileMaintenance` for periodic full-lockfile refresh independent of version bumps ([Renovate cargo manager docs](https://docs.renovatebot.com/modules/manager/cargo/)). Dependabot has equivalent, if historically less complete, Cargo support. The actionable cadence pattern teams converge on: let Renovate/Dependabot open PRs continuously (patch/minor auto-mergeable if CI+cargo-deny pass), and schedule a manual `cargo update` + full test pass at a fixed interval (weekly/monthly) to catch drift Renovate's per-crate PRs don't (transitive-only bumps with no direct `Cargo.toml` change).

### 8. Minimal-version testing and MSRV

Two related but distinct mechanisms:

- **`-Z minimal-versions`** (nightly-only cargo flag) and the stable-friendly wrapper crate **`cargo-minimal-versions`**: resolve every dependency to the *lowest* version satisfying its semver range instead of the highest, then build/test. This catches under-specified `Cargo.toml` version requirements (code that actually needs `foo = "1.5"` behavior but only declared `foo = "1"`) — a real, if under-used, supply-chain-adjacent check because it's the only way to verify your stated minimum bounds are truthful.
- **MSRV-aware resolver**: historically, `cargo update` had no concept of your project's minimum-supported Rust version, so `cargo build` could pull a transitive dependency version that requires a newer rustc than your MSRV, breaking builds on older toolchains with no `Cargo.toml` change on your side. RFC 3537 fixes this: set `package.rust-version` (or the special `rust-version.workspace = true` inference from the current toolchain at publish time), and Cargo prefers MSRV-compatible dependency versions during resolution rather than hard-failing or silently picking incompatible ones. Stabilized behind `resolver.incompatible-rust-version = "fallback"` in `.cargo/config.toml` starting Rust 1.84; **edition 2024 makes this the default** via `resolver = "3"` ([RFC 3537](https://rust-lang.github.io/rfcs/3537-msrv-resolver.html)). `--ignore-rust-version` opts back out per-invocation.

```toml
# Cargo.toml — declare MSRV explicitly; do this even if you don't test it yet,
# because edition-2024 resolver behavior reads this field.
[package]
rust-version = "1.82"
```

### 9. Named historical incidents

Concrete, dated incidents — cite these, not "there have been supply chain attacks":

1. **`rustdecimal`, March–May 2022.** Typosquatted `rust_decimal`. Published 2022-03-25; reported to the Rust Security Response WG 2022-05-02 by GitHub user safinaskar via an issue on the real `rust_decimal` repo. The tampered `Decimal::new` checked for the `GITLAB_CI` env var and, if present, downloaded and executed a Linux/macOS binary payload to `/tmp/git-updater.bin`. Fewer than 500 downloads, zero dependents. Immediate removal; no other similarly-patterned crates found at the time ([rust-lang blog](https://blog.rust-lang.org/2022/05/10/malicious-crate-rustdecimal/)).
2. **`faster_log` / `async_println`, May–September 2025.** Typosquatted the popular `fast_log` logging crate, published 2025-05-25 under aliases `rustguruman`/`dumbnbased`. Included working logging code as cover; at *runtime* (not build time) scanned source files for Solana/Ethereum private-key patterns and POSTed matches to a hardcoded C2 endpoint. 8,424 combined downloads before Socket researchers reported it; crates.io removed both crates and suspended the accounts 2025-09-24 ([rust-lang blog](https://blog.rust-lang.org/2025/09/24/crates.io-malicious-crates-fasterlog-and-asyncprintln), [Socket.dev](https://socket.dev/blog/two-malicious-rust-crates-impersonate-popular-logger-to-steal-wallet-keys)).
3. **`oncecell` / `winx-rs` and related, 2023.** Part of a broader typosquatting cluster (publisher `amaperf`) — `oncecell` ran a `build.rs`-stage payload to exfiltrate host information; `winx-rs` ran a Windows-targeted payload. Recorded as [RUSTSEC-2023-0101](https://rustsec.org/advisories/RUSTSEC-2023-0101) and [RUSTSEC-2023-0122](https://rustsec.org/advisories/RUSTSEC-2023-0122.html).
4. **`polymarket-client-sdks` / `polymarket-clients-sdk` / `polymarkets-client-sdk`, February 2026.** A cluster typosquatting `polymarket-client-sdk`, attempting local credential-file theft. One variant was caught and removed **within an hour of publication, before any downloads** — evidence the current detection pipeline (crates.io + third-party scanners like Socket feeding RustSec) is materially faster than in 2022 ([RUSTSEC-2026-0011](https://rustsec.org/advisories/RUSTSEC-2026-0011.html), [RUSTSEC-2026-0015](https://rustsec.org/advisories/RUSTSEC-2026-0015.html)).
5. **CVE-2019-16760 — Cargo dependency-resolution bug, pre-1.26.0.** Not a malicious crate but a Cargo defect: under specific conditions Cargo could resolve to the wrong package with a squatted name. Fixed by 1.26.0; relevant only to pre-2019 toolchains — flag as historical, not current risk ([RustSec](https://rustsec.org/advisories/CVE-2019-16760.html)).
6. **Cross-ecosystem cautionary reference, not Rust-specific: the XZ Utils backdoor (CVE-2024-3094, March 2024).** Not a Rust/crates.io incident (liblzma is C), but directly relevant to this project's threat model because it demonstrates a *trusted maintainer account* inserting a build-time backdoor over a long social-engineering campaign — the exact failure mode cargo-vet's "who reviewed this" model and reproducible-builds work are trying to close. Worth citing when justifying human-review gates (cargo-vet) rather than pure automated scanning.

Meta-point: crates.io stopped blogging every individual malicious-crate removal as of **2026-02-13**, reserving posts for crates with evidence of real-world usage/exploitation; the complete, current feed is the [RustSec advisory-db](https://github.com/rustsec/advisory-db) itself (git log or RSS), not the rust-lang blog ([rust-lang blog](https://blog.rust-lang.org/2026/02/13/crates.io-malicious-crate-update)).

### 10. Threat: malicious build.rs and proc macros

Both execute **arbitrary native code on the machine running `cargo build`/`cargo check`/`cargo test`**, at the *developer's or CI runner's* full permission level — before any of the target program's own security posture exists, and even if the crate is only a dev-dependency or is never actually invoked by the resulting binary's logic. Concretely: full filesystem access, network access, and access to every environment variable the build process sees (which routinely includes CI secrets — registry tokens, cloud credentials, signing keys).

- A `build.rs` script is just a Rust binary cargo compiles and runs before compiling the crate. No sandbox exists by default in mainline cargo as of 2026 — proposals to sandbox it exist ([internals.rust-lang.org discussion](https://internals.rust-lang.org/t/sandbox-build-rs-and-proc-macros/16345)) but nothing has shipped.
- A proc-macro crate is compiled into a `dylib`/plugin and *loaded into the compiler process itself* during macro expansion — same arbitrary-code-at-build-time property, arguably higher-trust position since it runs inside `rustc`.
- `oncecell` (§9 item 3) is a concrete example of a build.rs-stage exfiltration payload actually seen in the wild, not a theoretical risk.

Mitigations that exist today: cargo-deny can flag *that* a crate has a build script (via `[bans]` rules against specific crates) but cannot inspect *what* it does; cargo-vet's human-audit requirement is the closest thing to a real control, specifically because a reviewer is expected to read `build.rs`/proc-macro source, not just the public API. `cargo-geiger`-style static scanning does not cover this category (it's about `unsafe` usage in compiled code, not build-time execution).

### 11. Threat: typosquatting and dependency confusion

- **Typosquatting** is the dominant real-world pattern on crates.io (§9) — near-miss names (`rustdecimal` vs `rust_decimal`, `faster_log` vs `fast_log`, `polymarket-clients-sdk` vs `polymarket-client-sdk`). `[bans] deny` lists in `deny.toml` don't prevent first-time typosquat installs (you can't ban a name you don't know is coming) — the actual defense is `cargo add`/copy-paste discipline (verify the exact crate name against the project's real repo before adding) plus the ecosystem-level scanning that feeds RustSec.
- **Dependency confusion** (the "internal package name shadowed by a public registry package" attack well-known from npm/PyPI) is structurally harder to pull off against crates.io *by default* because Cargo requires you to specify a `registry = "..."` or `[patch]`/`[source]` replacement explicitly per-dependency to pull from anywhere other than crates.io — there's no implicit "check the internal registry first, fall back to public" resolution the way some npm/pip configs default to. The residual risk is misconfigured `[source]` replacement blocks (e.g., a `replace-with` that silently falls through) — this is exactly what `[sources] unknown-registry = "deny"` / `unknown-git = "deny"` in cargo-deny is designed to catch (§2).

### 12. Build integrity: reproducibility, remap-path-prefix, SOURCE_DATE_EPOCH

Rust/Cargo reproducible builds are real but incomplete as of the research era:

- `rustc -C link-args=... --remap-path-prefix=<from>=<to>` rewrites absolute source paths embedded in debug info and `file!()`/panic messages, so two builds on different machines/directories produce byte-identical output modulo this substitution ([rustc book: remap-source-paths](https://doc.rust-lang.org/beta/rustc/remap-source-paths.html)).
- If build-time code logic reads the current time, teams building for reproducibility are expected to honor `SOURCE_DATE_EPOCH` when set and only fall back to the real clock when it's unset (the standard cross-ecosystem convention from [reproducible-builds.org](https://reproducible-builds.org/docs/rust/)).
- **Known gap**: known bugs remain where `--remap-path-prefix` doesn't fully sanitize paths — e.g. `profile.*.split-debuginfo = "packed"` still embeds a `DW_AT_GNU_dwo_name` referencing an absolute `.dwo` path, so two "identical" builds from different checkout directories differ. Tracked under [rust-lang/rust#129080](https://github.com/rust-lang/rust/issues/129080).
- **Historical footgun**: older Cargo (pre-fix) hashed the entire `RUSTFLAGS` string (including a `--remap-path-prefix=/home/alice/build=...` value) into the `-C metadata` symbol-mangling hash, so setting the remap flag via `RUSTFLAGS` broke reproducibility across machines with different home directories — the opposite of the flag's purpose ([cargo#6914](https://github.com/rust-lang/cargo/issues/6914)). Fixed; relevant only if pinned to very old cargo.
- **In-progress fix**: [RFC 3127 "trim-paths"](https://rust-lang.github.io/rfcs/3127-trim-paths.html) proposes a proper `-Ztrim-paths` / `trim-paths` profile setting distinguishing scope (diagnostics vs macro vs object output), modeled on GCC/Clang's equivalent flags — still gated behind nightly `-Z` flags as of this research, not yet a stable one-liner.
- Practical recipe for a release build wanting reproducibility today:

```bash
SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) \
RUSTFLAGS="--remap-path-prefix=$(pwd)=." \
cargo build --release --locked
```

sccache trust note: sccache (compilation cache, local or remote/S3) trusts its cache key derivation to fully capture compiler inputs; a remote shared sccache is a supply-chain trust boundary of its own (a poisoned cache entry serves stale/tampered object code to every consumer) — treat a shared sccache backend with the same access control rigor as a package registry, not as "just a build speedup."

### 13. Vendoring, [patch], git dependencies

- `cargo vendor` copies every crate in the resolved graph into a local `vendor/` directory and emits the `.cargo/config.toml` source-replacement stanza needed to build fully offline — the standard pattern for air-gapped builds and for organizations that want a single point to diff/scan before code enters the build.
- **Git dependencies (`{ git = "...", rev|tag|branch = "..." }`) do not get a checksum in `Cargo.lock`** the way registry dependencies do — Cargo trusts the git transport (and, if `rev` isn't pinned, trusts that the branch/tag hasn't moved) rather than a content hash. This is a materially weaker integrity guarantee than a registry dependency. **Always pin `rev` to a full commit SHA**, never a branch name, for any git dependency that matters.
- `[patch]` in `Cargo.toml` transparently substitutes a different source (often a git fork) for a registry crate across the whole graph — powerful for vendoring a security fix ahead of upstream, but it is also the mechanism a compromised `Cargo.toml` edit would use to route a trusted crate name to attacker-controlled code. Review `[patch]` sections in PR diffs with the same scrutiny as a new dependency, not less.
- When vendoring modified/patched sources, checksums in `.cargo-checksum.json` must be regenerated per-package after patching, or `cargo build --offline` will refuse to build from the tampered-looking vendor directory — this checksum mismatch is a *feature*: it's the guard against silent vendor-directory tampering, don't work around it by stripping the checksum file.

### 14. Registry integrity: sparse protocol, checksums, trusted publishing

- crates.io's index is served over the **sparse protocol** (`sparse+https://index.crates.io/`, the default since Cargo 1.68) — individual per-crate metadata files fetched over plain HTTPS, rather than cloning a monolithic git repo. Registry choice is configured per-registry: `[registries.crates-io] protocol = "sparse"` ([Cargo Book: registries](https://doc.rust-lang.org/cargo/reference/registries.html)).
- Every crate `.crate` file downloaded from crates.io is checksum-verified against the SHA-256 recorded in the index/`Cargo.lock`; this is why registry dependencies (unlike git dependencies, §13) get integrity verification for free.
- **Trusted Publishing** (crates.io, RFC 3691, rolled out through 2025): replaces long-lived `CARGO_REGISTRY_TOKEN` CI secrets with short-lived OIDC-derived tokens. Flow: CI workflow requests an OIDC ID token from its provider → crates.io validates the token's signature against the provider's public keys and checks it matches a pre-registered repo+workflow(+environment) → crates.io issues a publish-scoped access token valid on the order of minutes → workflow publishes → token expires/is revoked. Modeled directly on PyPI's 2023 rollout (cited in the RFC as prior art with >13,000 adopting projects) ([RFC 3691](https://rust-lang.github.io/rfcs/3691-trusted-publishing-cratesio.html)). As of the 2025-07 crates.io dev update it supports GitHub Actions and GitLab.com CI (not self-hosted GitLab) ([crates.io dev update](https://blog.rust-lang.org/2025/07/11/crates-io-development-update-2025-07)). Setup requires one manual publish first, then linking the repo/workflow in the crates.io web UI. Security payoff versus a static token: nothing to leak from a compromised secrets store, tokens are workflow-scoped (not account-scoped), and no manual rotation.

### 15. SBOM: cargo-cyclonedx, cargo-sbom, cargo-auditable

Three genuinely different tools, easy to conflate:

- **`cargo-cyclonedx`** ([CycloneDX/cyclonedx-rust-cargo](https://github.com/CycloneDX/cyclonedx-rust-cargo)): produces a [CycloneDX](https://cyclonedx.org/) SBOM. Sources data from both `Cargo.lock` *and* `cargo metadata`, so — unlike SBOM generators that only parse the lockfile — it can scope the SBOM to one binary/feature-set within a workspace and record per-component license data. `cargo install cargo-cyclonedx && cargo cyclonedx`.
- **`cargo-sbom`**: a lighter-weight, cargo-adjacent SBOM generator; less feature-rich than cargo-cyclonedx but lower-dependency. Use when a simple manifest-format SBOM (not full CycloneDX component graph) satisfies the compliance requirement.
- **`cargo-auditable`** ([rust-secure-code/cargo-auditable](https://github.com/rust-secure-code/cargo-auditable)): a fundamentally different mechanism — it's a build wrapper (`cargo auditable build --release`) that embeds the full resolved dependency tree as zlib-compressed JSON into a dedicated `.dep-v0` linker section **inside the compiled binary itself**. This means a *shipped binary*, with no accompanying SBOM file and no source access, can be scanned: `cargo audit bin ./mybinary` (cargo-audit ≥0.17.3 understands the embedded format) or `auditable-info` can extract it programmatically. Overhead is tiny (well under 1% of typical binary size). This is the directly relevant tool for a project (grim/ocx) that ships prebuilt binaries — it answers "what did we actually ship" independent of what the build log claimed.

For grim/ocx specifically: `cargo-auditable` is the higher-leverage of the three for release binaries (verifiable post-hoc against the artifact, not the build process); `cargo-cyclonedx` is the one to reach for if a downstream consumer specifically requires a CycloneDX file for their own compliance tooling.

### 16. SLSA, GitHub artifact attestations, sigstore/cosign

- **GitHub Artifact Attestations** went GA June 2024 and, run on GitHub-hosted runners via `actions/attest-build-provenance`, give **SLSA v1.0 Build Level 2** automatically — a cryptographically verifiable link between a released artifact and the exact workflow run/commit that built it ([GitHub blog](https://github.blog/enterprise-software/devsecops/enhance-build-security-and-reach-slsa-level-3-with-github-artifact-attestations/), [GitHub docs](https://docs.github.com/en/actions/concepts/security/artifact-attestations)). Through 2025 GitHub added enforcement (org-level policies, admission-controller integration) and is moving public-repo attestation from opt-in toward default.
- Under the hood this is **sigstore**: Fulcio issues a short-lived X.509 cert bound to the workflow's OIDC identity, the workflow signs the artifact with the matching ephemeral key, Rekor (transparency log) records cert+signature+metadata publicly, and `cosign`/`gh attestation verify` check the chain — no long-lived signing key to manage or leak ([sigstore docs](https://docs.sigstore.dev/cosign/verifying/verify/), [sigstore blog on bundle verification](https://blog.sigstore.dev/cosign-verify-bundles/)).
- `cargo-dist` (the release-binary tool most Rust CLIs use) supports emitting and the consumer verifying attestations via `gh attestation verify <artifact> --repo <owner>/<repo>`.
- Verification a downloading tool (or a human) should perform, in order: (1) checksum match against the release manifest, (2) `gh attestation verify` (or raw `cosign verify-attestation`) against the expected repo/workflow identity, (3) only then execute. Checksum alone proves nothing about *provenance* — an attacker who can replace the release asset can also replace the checksum file next to it unless the checksum file itself is signed/attested.

### 17. Distribution security for CLI installers (grim/ocx-relevant)

This is the subsection most directly applicable to grim/ocx's own job (installing and executing other people's binaries):

- **curl|sh is not inherently unverifiable, but it is unverified by convention.** The script executes with the invoking user's full permissions, over a channel that (even under TLS) offers no artifact-level integrity guarantee independent of that one connection — no separate checksum check, no signature, nothing to diff against a second source. It's the pattern, not TLS, that's the weak point: nothing stops the *served script itself* from being altered at the origin.
- **`cargo-binstall`'s actual trust model** ([cargo-binstall repo](https://github.com/cargo-bins/cargo-binstall), [SIGNING.md](https://github.com/cargo-bins/cargo-binstall/blob/main/SIGNING.md)): by default, it resolves package metadata from crates.io over HTTPS (TLS ≥1.2 enforced) and trusts crates.io's own integrity guarantees for the metadata; it then downloads the prebuilt binary from wherever the crate's metadata points (often a GitHub release) with **no default artifact signature check**. Opt-in minisign signing exists (`[package.metadata.binstall.signing]` in the publisher's `Cargo.toml`, a `.sig` file alongside the binary) with `--only-signed` to require it and `--skip-signatures` to disable even attempting it — but adoption across the ecosystem is low, so binstall's real-world default guarantee is "authenticated metadata source, unauthenticated binary," not "verified binary."
- **`cargo-dist`'s model leans on GitHub attestations** (§16) rather than a bespoke signing scheme — for projects that adopt it, verification is `gh attestation verify`, which is a stronger, standardized guarantee than binstall's optional minisign path.
- **What a package manager must verify before exec, in priority order**, for a tool whose job is literally "install and run other people's binaries" (this is the grim/ocx case directly):
  1. Fetch metadata (checksums, expected signer identity) over a channel independent from the artifact download itself, or from a source with its own integrity guarantee (crates.io index, a signed manifest).
  2. Verify a cryptographic checksum of the downloaded artifact against that metadata — reject on any mismatch, no "warn and continue."
  3. Where a signature or attestation is available (GitHub attestation, minisign, sigstore bundle), verify it against a *pinned* expected identity (repo+workflow, or public key) — not merely "a valid signature exists," since a valid signature from an attacker-controlled key/identity is not a control.
  4. Only after 2–3 pass, extract/execute — and even then, extraction of arbitrary archives (tar/zip) needs its own hardening (path traversal via `../` entries, symlink escapes, zip-slip) independent of whether the archive's *authenticity* was verified; authenticity and safe-extraction are separate checks and both are required.
  5. Never widen trust based on "it downloaded over HTTPS" alone — TLS authenticates the transport to the server, not that the server is serving what the user believes it's serving.

## Normative guidance candidates

1. **Commit `Cargo.lock` for every binary crate; do not treat an uncommitted lockfile as acceptable for anything grim/ocx ships.** Rationale: it's the only thing making a release build reproducible across CI runs and machines. Verify: `git ls-files Cargo.lock` returns the file; `.gitignore` must not mention `Cargo.lock` in any binary crate/workspace.
2. **All CI and release builds run with `--locked` (or `--frozen` where full offline enforcement is wanted), never a bare `cargo build`/`cargo test`.** Rationale: without it, a lockfile drift is silently "fixed" by re-resolving instead of failing the build, defeating the point of committing the lockfile. Verify: grep CI workflow YAML for `cargo build`/`cargo test`/`cargo install` invocations lacking `--locked`.
3. **Any `cargo install` of a tool (in CI, in the installer's own bootstrap, in docs) must pass `--locked`.** Rationale: `cargo install` ignores the published lockfile by default, so an unpinned install can silently pull newer transitive deps than the maintainer tested/shipped. Verify: grep for `cargo install` without `--locked` in scripts and CI.
4. **Run `cargo deny check` (advisories + bans + licenses + sources) as a single required CI job with a real `deny.toml` modeled on §2, not a default/empty one.** Rationale: default configs pass on graphs with unreviewed sources, banned crates, and license violations. Verify: `deny.toml` exists at repo root, has non-empty `[sources]` with `unknown-registry = "deny"` and `unknown-git = "deny"`, and CI has a required `cargo-deny-action` (or `cargo deny check`) step.
5. **Any new dependency with a build script (`build.rs`) or that is a proc-macro crate gets manual review of that script/macro's source before merge, not just its public API.** Rationale: build.rs and proc-macros run arbitrary code at build time with full filesystem/network/env access, before any runtime sandboxing exists — this is the exact mechanism used by the `oncecell` incident. Verify: `cargo metadata --format-version1 | jq` for `build` field presence on new deps in a PR diff, or `grep -l 'build\.rs$'` in the vendored/new crate's file listing; reviewer reads the file.
6. **Pin every git dependency (`{ git = ... }`) to a full commit SHA via `rev =`, never `branch =` or an unpinned `tag =`.** Rationale: unlike registry deps, git deps carry no checksum in `Cargo.lock` — Cargo trusts the ref to still point at the reviewed commit; a branch can move underneath you with zero `Cargo.toml` diff. Verify: grep `Cargo.toml`/`Cargo.lock` for `git = ` entries lacking a `rev = "<40-hex-char sha>"`.
7. **Treat any diff touching `[patch]` in `Cargo.toml` as equivalent in review weight to adding a new dependency, not as a minor edit.** Rationale: `[patch]` silently reroutes a trusted crate name to arbitrary source code across the whole graph. Verify: CODEOWNERS or PR-template rule flags `[patch]` section diffs for mandatory security-reviewer sign-off; grep diff for `^\[patch\.`.
8. **Set `package.rust-version` explicitly in every crate's `Cargo.toml`, matching the actual minimum tested toolchain.** Rationale: edition-2024's default `resolver = "3"` uses this field to steer dependency resolution toward MSRV-compatible versions; an unset field means Cargo falls back to the *invoking* toolchain's version, which varies by machine and silently changes resolution behavior between a dev laptop and CI. Verify: `grep -r 'rust-version' */Cargo.toml`; CI runs `cargo build` on the declared MSRV toolchain, not just stable/nightly.
9. **Any tool that downloads and executes a binary (this is grim/ocx's core function) must checksum-verify the artifact and, where an attestation/signature exists, verify it against a pinned expected identity before extraction — and must reject on any verification failure, never warn-and-continue.** Rationale: this is the direct analogue of §17's "what a package manager must verify before exec"; a downloaded, unverified binary run with the user's permissions is full RCE if the source is compromised. Verify: code-read the download path — trace from HTTP fetch to `exec`/`Command::new` and confirm a checksum/signature check sits on that path with a hard-fail branch, not a logged-warning branch.
10. **Archive extraction (tar/zip) of anything downloaded must reject path-traversal and symlink-escape entries, independent of and in addition to artifact-authenticity checks.** Rationale: authenticity (it came from the right publisher) and safe extraction (it can't write outside the target directory) are orthogonal controls — a legitimately-signed archive can still contain a malicious `../../.ssh/authorized_keys` entry if the packaging step that produced it was compromised, or simply due to a bug. Verify: grep the extraction code for manual path-join without a canonicalize-and-prefix-check, or confirm use of a battle-tested extraction crate (e.g. `tar`'s `unpack_in`) rather than hand-rolled entry iteration + raw `std::fs::write` on the entry path.
11. **Prefer crates.io Trusted Publishing (OIDC) over a stored `CARGO_REGISTRY_TOKEN` CI secret for any crate this project (or its dependents) publishes.** Rationale: eliminates a long-lived credential that, if leaked, allows publishing malicious versions under the project's trusted name indefinitely — the exact mechanism behind several ecosystem-wide incidents in npm/PyPI. Verify: repo settings — crates.io publisher config for the repo shows a Trusted Publisher entry; CI workflow has no `CARGO_REGISTRY_TOKEN` secret reference on the publish job.
12. **Build release binaries with `cargo auditable build --release` (or embed an equivalent SBOM) so a shipped artifact is scannable without source access.** Rationale: this is the tool that lets *anyone downstream* (including grim/ocx's own users, or a future incident responder) answer "what dependencies actually shipped in this binary" from the binary alone. Verify: `cargo audit bin <release-artifact>` returns embedded dependency data instead of an error.
13. **Generate and publish GitHub Artifact Attestations (or an equivalent sigstore-based provenance record) for every released binary, and document the `gh attestation verify` command in the release README.** Rationale: gives SLSA Build Level 2 automatically on GitHub-hosted runners at near-zero marginal setup cost, and is the strongest provenance signal available to a user deciding whether to trust a downloaded binary. Verify: release workflow includes `actions/attest-build-provenance`; a fresh download passes `gh attestation verify <file> --repo <owner>/<repo>`.
14. **Do not gate CI on `unmaintained` RustSec advisories with the same severity as `vulnerable`/`unsound` ones.** Rationale: an unmaintained-but-not-vulnerable leaf crate is common in real graphs and blocking every PR on it produces exactly the "drowning in noise" failure mode the tools are meant to avoid; `unsound`/CVE-bearing advisories are a different, always-block category. Verify: `deny.toml` has `unmaintained = "workspace"` (or `"warn"`), not `"deny"`, while `unsound = "all"` remains a hard fail.

## AI-agent angle

An LLM coding agent working on grim/ocx-shaped code characteristically gets this subarea wrong in these specific ways:

- **Writes `cargo install foo` in scripts/docs/CI without `--locked`.** This is genuinely counter-intuitive (most engineers assume `cargo install` respects the published lockfile the way `cargo build` does), so a model trained on general code will reproduce the unpinned form by default. Check: grep any generated script/CI YAML for `cargo install` lacking `--locked`.
- **Generates a `deny.toml` with an empty or absent `[sources]` section**, because it's the least "obviously security-relevant" of the four checks and models tend to reproduce whichever example config they saw most (many blog-post examples online omit `[sources]` entirely, unlike EmbarkStudios' own). Check: confirm `[sources]` block is present with both `unknown-registry` and `unknown-git` set to `"deny"` (or explicitly `"warn"` with a stated reason), not silently absent.
- **Adds a git dependency with `branch = "main"`** because it "looks like" the equivalent of a loose semver range, without registering that (unlike registry deps) this carries zero checksum and can silently change under the pinned commit. Check: grep for `branch =` in any `git = ` dependency entry and flag for `rev =` conversion.
- **Hallucinates or misremembers cargo-vet/cargo-deny syntax from older versions** — e.g. proposing `cargo audit`'s old `.cargo/audit.toml` ignore-list format, or a `deny.toml` `[licenses] copyleft = "..."` field that existed in pre-0.14 cargo-deny and was later restructured. Check: run the generated config through the actual installed tool (`cargo deny check` / `cargo vet check`) rather than trusting it compiles-by-inspection — a config with dead/renamed fields typically still parses as valid TOML but silently no-ops the intended check.
- **Suggests reproducible-build flags (`-Ztrim-paths`, full RFC 3127 scope-selection syntax) as if they were stable**, because training data includes both the RFC discussion and the eventual stabilization announcement without a clear temporal boundary in the model's memory. Check: confirm the flag is invoked without `-Z`/`RUSTC_BOOTSTRAP=1` on the pinned stable toolchain actually used by the project — if it requires either, it's still nightly-gated as of this research and must be flagged as such, not presented as a drop-in stable option.
- **Treats a green `cargo audit`/`cargo deny` run as proof a dependency is safe**, and therefore skips the manual build.rs/proc-macro review this doc calls for (§10) — because "the automated check passed" is the pattern the model has seen used to close out review checklists elsewhere. Check: a PR adding a new dependency with a build script or proc-macro attribute (`grep -rE 'proc-macro = true'` in the new crate's `Cargo.toml`, or presence of `build.rs`) must show evidence of a human/agent having actually opened that file, not just a passing CI badge.
- **Writes a manual `curl | tar -xz` install snippet for grim/ocx's own docs/README** without a checksum or signature step, because that's the modal pattern for "how to install a Rust CLI" across the open web the model was trained on, and it's exactly the anti-pattern §17 flags. Check: any generated install one-liner must be followed immediately by a checksum or `gh attestation verify` step, or must be rejected/flagged in review.
- **Recommends `openssl`/`openssl-sys` as the default TLS backend** for a new HTTP client dependency, reflecting older (pre-rustls-dominance) training-data conventions, when the project's own supply-chain policy (mirroring the EmbarkStudios example in §2) explicitly bans it in favor of `rustls`. Check: grep new `Cargo.toml` dependency additions for `openssl`/`native-tls` and flag against the project's `deny.toml` ban list.

## Contested / evolving

- **Committing `Cargo.lock` for libraries.** The historical "never commit it for libraries" rule has softened — current guidance (Cargo Book FAQ, as fetched) frames it as "commit it if it helps your own CI reproducibility and testing" while being explicit that it has zero effect on downstream consumers either way. The trend is toward "commit is fine, understand why it doesn't do what you think," not toward a stricter both-directions rule change.
- **Reproducible builds.** Actively unfinished — RFC 3127's trim-paths work is still landing incrementally; known open bugs (dwo debug-info paths) mean "fully reproducible Rust binary across machines" is not yet a turnkey guarantee even with all recommended flags applied. Trending toward stabilization but not there as of this research.
- **cargo-vet vs cargo-crev adoption.** cargo-vet has clearly won the mindshare/production-adoption contest among large Rust consumers (Mozilla, Google, ISRG) as of 2025-2026; cargo-crev remains maintained but is a minority choice. This isn't really "contested" so much as settled-in-practice while both remain technically viable — worth noting the direction rather than presenting them as equally live options.
- **Sandboxing build.rs/proc-macros.** Actively discussed (internals.rust-lang.org thread cited in §10) but nothing shipped in mainline cargo as of this research — this is a real, unresolved gap in the ecosystem's defenses, not a solved problem being under-communicated.
- **Trusted Publishing rollout scope.** GitHub Actions and GitLab.com are supported; self-hosted GitLab and other CI providers are not yet, as of the 2025-07 crates.io dev update. Expect this list to grow — treat "does our CI provider support Trusted Publishing yet" as a question worth re-checking periodically rather than a settled no.
- **crates.io malicious-crate blog-post policy.** Changed 2026-02-13 from "post for every removal" to "post only for real-world-usage cases" — a deliberate, recent, and somewhat debatable trade-off (less blog noise vs. less passive visibility into the low-download-count long tail). The RustSec advisory-db itself is unaffected and remains the complete record either way.

## Sources

| URL | What it is | Date/era | Why it was worth reading |
|---|---|---|---|
| [rustsec.org](https://rustsec.org/) | Official docs (RustSec project) | current, 2026 | Canonical description of the advisory database cargo-audit/cargo-deny both consume |
| [rustsec/advisory-db README](https://github.com/rustsec/advisory-db/blob/main/README.md) | Primary source (repo) | current, 2026 | Advisory ID format, DB structure, contribution process |
| [EmbarkStudios/cargo-deny deny.toml](https://github.com/EmbarkStudios/cargo-deny/blob/main/deny.toml) | Primary source (real production config) | fetched 2026-08 | The tool authors' own dogfood config — used verbatim as the annotated example in §2 |
| [cargo-deny config reference](https://embarkstudios.github.io/cargo-deny/checks/cfg.html) | Official docs | current | Full field-by-field semantics for `deny.toml` |
| [Cargo-deny GitHub Action](https://github.com/EmbarkStudios/cargo-deny-action) | Primary source (repo) | current | How teams wire cargo-deny into CI in practice |
| [cargo-vet: Introduction](https://mozilla.github.io/cargo-vet/) | Official docs (Mozilla) | current, 2026 | Core mental model: audits, not vuln scanning |
| [cargo-vet: Audit Criteria](https://mozilla.github.io/cargo-vet/audit-criteria.html) | Official docs | current | `safe-to-run`/`safe-to-deploy` built-ins and custom criteria mechanics |
| [cargo-vet: Wildcard Audit Entries](https://mozilla.github.io/cargo-vet/wildcard-audit-entries.html) | Official docs | current | Trusted-publisher mechanism, real example (BurntSushi) |
| [cargo-vet: Importing Audits](https://mozilla.github.io/cargo-vet/importing-audits.html) | Official docs | current | How orgs share audit work to make adoption tractable |
| [google/rust-crate-audits](https://github.com/google/rust-crate-audits) | Primary source (repo) | current | Real-world custom-criteria example (`ub-risk-N` chain) |
| [crev-dev/cargo-crev](https://github.com/crev-dev/cargo-crev) | Primary source (repo) | current, releases through 2026 | Confirmed cargo-crev is maintained but lower-adoption than cargo-vet |
| [Cargo Book: FAQ — Cargo.lock](https://doc.rust-lang.org/cargo/faq.html) | Official docs | current | Authoritative binaries-vs-libraries lockfile guidance and rationale |
| [Cargo Book: cargo-install](https://doc.rust-lang.org/cargo/commands/cargo-install.html) | Official docs | current | `--locked` semantics; the "cargo install ignores the lockfile by default" fact |
| [RFC 3537: MSRV-aware resolver](https://rust-lang.github.io/rfcs/3537-msrv-resolver.html) | RFC (accepted, implemented) | 2024–2026 rollout | Precise mechanics of `rust-version`, `resolver.incompatible-rust-version`, edition-2024 default |
| [blog.rust-lang.org: malicious crate rustdecimal](https://blog.rust-lang.org/2022/05/10/malicious-crate-rustdecimal/) | Official incident report | 2022-05-10 | Primary account of the first well-documented crates.io malware incident, with dates |
| [blog.rust-lang.org: faster_log/async_println](https://blog.rust-lang.org/2025/09/24/crates.io-malicious-crates-fasterlog-and-asyncprintln) | Official incident report | 2025-09-24 | Primary account of the largest recent (wallet-key-stealing) incident |
| [blog.rust-lang.org: malicious crate notification policy update](https://blog.rust-lang.org/2026/02/13/crates.io-malicious-crate-update) | Official policy announcement | 2026-02-13 | Explains why RustSec advisory-db, not the blog, is now the complete incident feed |
| [RUSTSEC-2026-0011 / -0015](https://rustsec.org/advisories/RUSTSEC-2026-0011.html) | Advisory database entries | 2026-02 | Most recent typosquat cluster, shows sub-hour detection turnaround |
| [RFC 3691: Trusted Publishing for crates.io](https://rust-lang.github.io/rfcs/3691-trusted-publishing-cratesio.html) | RFC | 2024–2025 rollout | Full OIDC token-exchange flow and motivation, PyPI comparison |
| [crates.io development update, 2025-07-11](https://blog.rust-lang.org/2025/07/11/crates-io-development-update-2025-07) | Official project update | 2025-07 | Confirms current provider support (GitHub Actions, GitLab.com) |
| [Cargo Book: registries reference](https://doc.rust-lang.org/cargo/reference/registries.html) | Official docs | current | Sparse protocol mechanics and configuration |
| [rustc book: remap-source-paths](https://doc.rust-lang.org/beta/rustc/remap-source-paths.html) | Official docs | current | `--remap-path-prefix` semantics |
| [RFC 3127: trim-paths](https://rust-lang.github.io/rfcs/3127-trim-paths.html) | RFC (in progress) | ongoing | In-progress replacement/extension for path sanitization, still nightly-gated |
| [reproducible-builds.org: Rust](https://reproducible-builds.org/docs/rust/) | Cross-ecosystem project docs | current | `SOURCE_DATE_EPOCH` convention as it applies to Rust toolchains |
| [rust-lang/rust#129080](https://github.com/rust-lang/rust/issues/129080) | Primary source (issue tracker) | ongoing | Concrete open reproducibility bug (dwo debug-info paths) |
| [rust-secure-code/cargo-auditable](https://github.com/rust-secure-code/cargo-auditable) | Primary source (repo/README) | current | How binary-embedded SBOM works; directly relevant to shipping prebuilt binaries |
| [CycloneDX/cyclonedx-rust-cargo](https://github.com/CycloneDX/cyclonedx-rust-cargo) | Primary source (repo/README) | current | cargo-cyclonedx capabilities vs lockfile-only SBOM tools |
| [GitHub docs: Artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations) | Official docs | current | SLSA Build Level 2 mechanics via GitHub-hosted runners |
| [GitHub blog: SLSA Level 3 with Artifact Attestations](https://github.blog/enterprise-software/devsecops/enhance-build-security-and-reach-slsa-level-3-with-github-artifact-attestations/) | Official vendor blog | 2024–2025 | Rollout timeline and default-vs-opt-in trend through 2025-2026 |
| [sigstore docs: Verifying Signatures](https://docs.sigstore.dev/cosign/verifying/verify/) | Official docs | current | cosign verification mechanics underlying GitHub attestations |
| [cargo-bins/cargo-binstall SIGNING.md](https://github.com/cargo-bins/cargo-binstall/blob/main/SIGNING.md) | Primary source (repo) | current | Exact trust model (minisign, opt-in, low adoption) directly relevant to grim/ocx's own installer design |
| [Renovate docs: Cargo manager](https://docs.renovatebot.com/modules/manager/cargo/) | Official docs | current | Real automated-update mechanics for Cargo.toml/Cargo.lock |
| [internals.rust-lang.org: Sandbox build.rs and proc macros](https://internals.rust-lang.org/t/sandbox-build-rs-and-proc-macros/16345) | Community RFC discussion | ongoing | Confirms this is a known, unresolved ecosystem gap, not solved |
