---
title: rust-cargo delta refresh, 2026-08-14 to 2026-11-27
pair: rust-cargo
date: 2026-11-27
window_start: 2026-08-14
model: opus
consolidates:
  - .agents/research/refresh-2026-11/rust-cargo/clippy-lint-surface.md
  - .agents/research/refresh-2026-11/rust-cargo/cargo-rustc-rustfmt-rustup.md
  - .agents/research/refresh-2026-11/rust-cargo/github-actions-platform.md
  - .agents/research/refresh-2026-11/rust-cargo/release-and-cargo-tools.md
  - .agents/research/refresh-2026-11/rust-cargo/crates-of-record-runtime-net-cli.md
  - .agents/research/refresh-2026-11/rust-cargo/crates-of-record-data-fs-archive.md
  - .agents/research/refresh-2026-11/rust-cargo/recent-shifts.md
revises:
  - .agents/research/rust-tooling-ci.md
  - .agents/research/rust-ecosystem.md
---

# rust-cargo delta refresh

## Contents

- [Verdict](#verdict)
- [Changed rules](#changed-rules)
- [New rules](#new-rules)
- [Confirmed unchanged](#confirmed-unchanged)
- [Open questions](#open-questions)
- [Revision log](#revision-log)
- [Edit list](#edit-list)
- [Spillover round](#spillover-round)

## Verdict

- Keep the denial design of LINT-02 and LINT-15, and name Cargo 1.97's `build.warnings` / `CARGO_BUILD_WARNINGS=deny` in both. It is the upstream replacement for `RUSTFLAGS=-Dwarnings` and keeps the build cache. However, it applies to "local packages", and the docs never say whether a path dependency counts as local. It also turns the ratchet's `-W` warnings into errors. So the rule does not adopt it as a substitute. It bans it from `.cargo/config.toml`, where it would hit every invocation, and it bans it from the ratchet step. The phrase "busts the incremental cache" becomes "invalidates the build cache", because Cargo 1.99 turns incremental compilation off by default when `CI` is set.
- Disambiguate the clippy `cargo` group from Cargo's own `[lints.cargo]` table, which is stable since Cargo 1.100. This touches LINT-04 ("clippy's ... groups") and LINT-01 (the table is a third workspace lint table).
- TOOL-05 keeps `cargo shear` and adds one sentence: Cargo 1.100's `cargo::unused_dependencies` lint complements it and does not replace it, because it never checks `[dev-dependencies]` and checks only the selected packages.
- CI-02 stays a MUST for SHA pins. It gains one sentence: a SHA pin does not reach the actions that a composite action calls, while GitHub's workflow lockfile, GA on 2026-10-28, does. CI-03's reason is corrected for checkout v6 and later, where the token lives in a file under `$RUNNER_TEMP` rather than in `.git/config`. The stale-version example in What Agents Get Wrong #6 now names checkout v7 as current.
- REL-04's verification names all three permissions the `actions/attest` README lists: `id-token`, `attestations` and `artifact-metadata`.
- Add two rules. CI-13 (SHOULD) sets Cargo 1.100's `registry.global-min-publish-age` cooldown, motivated by the 2026-08-20 `arrayref` compromise, which was live for about an hour. CI-14 (MUST) forbids checking out pull-request head code under `pull_request_target` or `workflow_run`, and forbids `allow-unsafe-pr-checkout: true`. GitHub blocks `pull_request_target` by default in public repositories from 2026-12-02.
- Flip two crates-of-record rows. Date and time moves to `jiff` 1.x: chrono is flagged unmaintained by RUSTSEC-2026-0543 (2026-09-14), and jiff 1.0 shipped on 2026-11-15. zip moves to a floor of 9.0.5, because eight October 2026 advisories are patched only in 9.x. Correct two baseline errors: `console` 0.16 does read the colour variables, and hyper 1.0 shipped in 2023-11, not 2025-01. Update three cells: `anstream` arrives only with clap's `color` feature, `keyring-core` is at 1.x, and `dirs` 7.0 moved Windows `preference_dir`. DEP-08 says that cargo-deny 0.21's native `expiry` is a backstop and never a replacement for the removal-condition comment.
- Remove the `.agents/research/` path from the crates-of-record Sources section. This is a publishing-contract fix, not a delta finding.
- Consequence for the owner: under DEP-06, the flipped rows put `chrono` and `zip` 8.x into `bans.deny`. Any family repository that still depends on chrono will fail `cargo deny check bans` until it migrates or carries a justified skip. It already fails the scheduled advisories leg on RUSTSEC-2026-0543.
- Bumps: rule minor (two new rules), reference skill minor (new guidance and new verification blocks).

## Changed rules

| ID | Old text | New text | Source |
|---|---|---|---|
| LINT-01 | "All lint policy lives in the workspace root `[workspace.lints.rust]` / `[workspace.lints.clippy]`." | "All lint policy lives in the workspace root `[workspace.lints.rust]` / `[workspace.lints.clippy]` (and `[workspace.lints.cargo]`, stable since Cargo 1.100)." The verification is unchanged. | [Cargo lints](https://doc.rust-lang.org/cargo/reference/lints.html), [Cargo changelog 1.100](https://doc.rust-lang.org/nightly/cargo/CHANGELOG.html) |
| LINT-02 | "... and busts the incremental cache." Verification: block LINT-02 is empty. | "... and invalidates the build cache. Cargo 1.97's `CARGO_BUILD_WARNINGS=deny` (`[build] warnings`) keeps the cache, but its "local packages" scope is undocumented for path dependencies, so it substitutes for nothing until it passes on the vendored fork. It never goes in `.cargo/config.toml`, where it would also deny LINT-15's ratchet." Verification adds: block LINT-02 (2) is empty. | [Cargo config `build.warnings`](https://doc.rust-lang.org/cargo/reference/config.html#buildwarnings), [Rust 1.97.0 post](https://blog.rust-lang.org/2026/07/09/Rust-1.97.0/), [Cargo changelog 1.99, CI incremental off](https://doc.rust-lang.org/nightly/cargo/CHANGELOG.html), [Clippy usage book](https://github.com/rust-lang/rust-clippy/blob/master/book/src/usage.md) |
| LINT-04 | "Never enable `nursery`, `restriction` or `cargo` as groups" | "Never enable clippy's `nursery`, `restriction` or `cargo` groups (clippy's `cargo` group is not Cargo's own `[lints.cargo]` table)". The verification is unchanged. | [Cargo lints](https://doc.rust-lang.org/cargo/reference/lints.html) |
| LINT-15 | "... the group blocks merges instead of ratcheting." Verification: "The ratchet step's command line contains no `-D warnings`". | Rule text appends: "`CARGO_BUILD_WARNINGS=deny` (Cargo 1.97) promotes the ratchet's `-W` warnings the same way, so the ratchet step never runs under it." The verification appends: "and its `env:` sets no `CARGO_BUILD_WARNINGS`". | [Cargo config `build.warnings`](https://doc.rust-lang.org/cargo/reference/config.html#buildwarnings) ("`deny`" emits an error for a crate with lint warnings) |
| TOOL-05 | "... not rustc's `unused_crate_dependencies` (fires falsely on single-target deps)." | The same text, plus: "Keep `cargo shear` beside Cargo 1.100's `cargo::unused_dependencies` lint, which never checks `[dev-dependencies]` and covers only the packages selected on the command line." The verification is unchanged. | [Cargo lints](https://doc.rust-lang.org/cargo/reference/lints.html), [Rust 1.100.0 post](https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/), [cargo-shear README](https://raw.githubusercontent.com/Boshen/cargo-shear/main/README.md) |
| CI-02 | "... with a trailing `# vX.Y.Z` comment. Tags are mutable." | The same text, plus: "A SHA pin does not reach the actions a composite action calls; GitHub's workflow lockfile (`.github/workflows/actions.lock`, GA 2026-10-28) does, and GitHub's secure-use guide ranks it above SHA pinning where the plan offers it." The verification is unchanged. | [Lockfile GA](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available), [secure-use reference](https://docs.github.com/en/actions/reference/security/secure-use) |
| CI-03 | "otherwise `GITHUB_TOKEN` stays in the git credential helper for every later step, third-party actions and build scripts included." | "otherwise `GITHUB_TOKEN` stays on the runner for every later step, third-party actions and build scripts included. Checkout v6 and later move it from `.git/config` to a file under `$RUNNER_TEMP`, which those steps can still read." The verification is unchanged. | [checkout README](https://raw.githubusercontent.com/actions/checkout/main/README.md), [checkout action.yml](https://raw.githubusercontent.com/actions/checkout/main/action.yml) |
| REL-04 (verification) | "the release workflow runs an attestation step with `attestations: write`" | "the release workflow runs an attestation step whose job grants `id-token: write`, `attestations: write` and `artifact-metadata: write` (the three the `actions/attest` README lists)" | [actions/attest README](https://github.com/actions/attest) |
| Agents Get Wrong #6 (no ID) | "`actions/checkout@v3`, invented `with:` keys." | "`actions/checkout@v3` or `@v4` (the current major is v7, and upstream READMEs still show `@v4`), invented `with:` keys." | [checkout releases](https://github.com/actions/checkout/releases) |
| Sources, cargo-deny-action (no ID) | "the advisories-split pattern, verbatim from upstream" | "the matrix-and-`continue-on-error` advisories split; the scheduled blocking leg is this rule's addition" | [cargo-deny-action README](https://raw.githubusercontent.com/EmbarkStudios/cargo-deny-action/main/README.md) |
| DEP-08 | "... not a date and not \"revisit later\"." | The same text, plus: "cargo-deny 0.21's per-entry `expiry` may back the comment up, never replace it: a date says nothing about whether the condition is met." The verification is unchanged. | [cargo-deny CHANGELOG](https://github.com/EmbarkStudios/cargo-deny/blob/main/CHANGELOG.md) (0.21.0, 2026-11-16) |
| Table: Terminal styling | "`anstream`/`anstyle` arrive transitively via `clap_builder`" | "`anstyle` always, and `anstream` under clap's default `color` feature, arrive transitively via `clap_builder`" | [clap_builder 4.6.10 dependencies](https://crates.io/api/v1/crates/clap_builder/4.6.10/dependencies) |
| Table: Colour resolution | "assuming the styling crate reads the environment" / "`console` 0.16 has an independent global switch and reads none of those variables. The application wires them" | "trusting the styling crate's own environment reading" / "`console` 0.16 reads all four itself, in its own precedence: `CLICOLOR_FORCE` overrides `NO_COLOR`, and an empty `NO_COLOR` disables colour, which the NO_COLOR spec says it must not. The application resolves the chain once and calls `set_colors_enabled`, which overrides those defaults" | console 0.16.0 and 0.16.6 source tarballs on static.crates.io (`src/utils.rs`, `src/unix_term.rs`) |
| Table: HTTP client | "hyper 1.0 (2025-01)" | "hyper 1.0 (2023-11)" | [crates.io hyper versions](https://crates.io/api/v1/crates/hyper) (1.0.0 created 2023-11-15) |
| Table: OS keychain | "`keyring-core` 1.0 plus" | "`keyring-core` 1.x plus" | [keyring-core releases](https://github.com/open-source-cooperative/keyring-core/releases) (1.1.0, 2026-11-20) |
| Table: Base directories | "Both are maintained by the same org; the failure is inconsistency, not the choice" | "Both come from the same author, now developed on Codeberg (the GitHub `dirs-dev/dirs-rs` repository is archived). `dirs` 7.0 (2026-09-05) moved Windows `preference_dir` from LocalAppData to RoamingAppData, so an upgrade changes where existing preference files are looked up. The failure is inconsistency, not the choice" | [crates.io dirs](https://crates.io/api/v1/crates/dirs), [dirs-rs on Codeberg](https://codeberg.org/dirs/dirs-rs) |
| Table: zip | "`zip` 8.x with an explicit extraction loop" / "`ZipArchive::extract()`" | "`zip` ≥ 9.0.5 with an explicit extraction loop" / "`ZipArchive::extract()`, `zip` 8.x", and the cell names the eight October 2026 advisories | [RustSec advisory-db](https://github.com/rustsec/advisory-db) `crates/zip/`, [crates.io zip](https://crates.io/api/v1/crates/zip) |
| Table: Date and time | "`chrono`" / "`jiff`" / "jiff is the direction of travel for calendar arithmetic, not a migration mandate." | "`jiff` 1.x" / "`chrono`", with RUSTSEC-2026-0543, jiff 1.0 and chrono-tz | [RUSTSEC-2026-0543](https://rustsec.org/advisories/RUSTSEC-2026-0543.html), [chrono#1768](https://github.com/chronotope/chrono/issues/1768), [jiff CHANGELOG](https://github.com/BurntSushi/jiff/blob/master/CHANGELOG.md) |
| crates-of-record Sources (RustSec line) | "`RUSTSEC-2025-0168` (zip), `RUSTSEC-2026-0067` (tar)" | "`RUSTSEC-2025-0168` and the October 2026 set (zip), `RUSTSEC-2026-0067` (tar), `RUSTSEC-2026-0543` (chrono)" | as above |
| crates-of-record Sources (research pointer) | A link to the in-repo research file path | Plain prose with no path. The `ECO-*` and `DEP-*` namespace note is kept. | publishing contract (published files carry no research path) |

## New rules

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| CI-13 | Once TOOL-01's pin is 1.100 or later, set `[registry] global-min-publish-age = "3 days"` (or longer) in the workspace `.cargo/config.toml`, and never set `CARGO_RESOLVER_INCOMPATIBLE_PUBLISH_AGE` in CI. The resolver then skips versions younger than the window unless `Cargo.lock` already holds them. The 2026-08-20 `arrayref` compromise was live for about an hour, which is the case a cooldown covers. Upstream calls it no complete defence, and `cargo install` ignores it. | Stabilised in Cargo 1.100 (2026-11-12, RFC 3923). It closes the window that `--locked` (CI-04) leaves open on the PR that refreshes the lockfile. Sources: [Rust 1.100.0 post](https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/), [resolver publish-age](https://doc.rust-lang.org/nightly/cargo/reference/resolver.html#publish-age), [arrayref incident post](https://blog.rust-lang.org/2026/08/20/supply-chain-attack-on-arrayref/). | `grep -n -E -e 'global-min-publish-age' -- .cargo/config.toml` prints a line; see block CI-13, which is empty | SHOULD |
| CI-14 | Never check out pull-request head code in a `pull_request_target` or `workflow_run` workflow, and never set `allow-unsafe-pr-checkout: true`. Both triggers run with the base repository's secrets and token, so a fork's `build.rs` runs with them. Checkout v7 refuses that checkout by default, and GitHub blocks `pull_request_target` by default in public repositories from 2026-12-02. | A pwn-request turns any fork PR into code execution with secrets. The platform now defaults to safe, so the remaining failure is an agent opting out to "make fork PRs work". Sources: [checkout v7.0.0](https://github.com/actions/checkout/releases/tag/v7.0.0), [GitHub changelog 2026-11-02](https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2). | see block CI-14 and block CI-14 (2), both empty | MUST |

Candidates considered and declined:

| Candidate | Why declined |
|---|---|
| A lockfile-diff review gate (new crates, new `build.rs`) | The artifact read no tool evidence and has no mechanical verification. CI-13 covers the incident shape. See open questions. |
| A zizmor PR gate | The only evidence is Rust-project adoption, with no incident tie. |
| A pinned cargo-deny version | CI-02's SHA pin of the action already pins the binary. |
| crates.io "Trusted Publishing Only Mode" for REL-06 | Published 2026-01-21, before the baseline. It makes no text false. See open questions. |
| reqwest 0.13 TLS defaults and the `rustls-tls` to `rustls` rename | Published 2025-12-30, before the baseline. No cell is false, and the feature rename fails `cargo check` loudly. |
| Floors for tokio ≥ 1.54.1, rustls ≥ 0.23.46 and rustls-webpki ≥ 0.103.16 | `cargo deny check advisories` (CI-07) already catches these. The table is not a floor list. |
| Hyphenated lint names deprecated (Cargo 1.99) | The stanza already uses underscores, and Cargo warns. |
| Pedantic membership evidence in LINT-04 | TOOL-03 already states that membership moves. |
| `allow-unwrap-in-tests` covering integration tests (Clippy 1.100), `--fix` implying `--no-deps` | Both widen behaviour and leave no claim false. |

## Confirmed unchanged

- LINT-05: all thirteen named lints are still `restriction`. clippy#13755 is still open, with its "really noisy" wording.
- LINT-06: `await_holding_lock` and `await_holding_refcell_ref` are still `suspicious`.
- LINT-07: the guidance is unchanged. Rust 1.98 only emits `unsafe_code` for every unsafe attribute.
- LINT-08: `#[expect]` and `unfulfilled_lint_expectations` behave as stated. The 1.100 change is a dead-code false-positive fix.
- LINT-09: every `clippy.toml` key name and default is unchanged.
- LINT-11: `unreachable_pub` is still allow-by-default.
- LINT-12: both doc lints are still `pedantic` and governed by `check-private-items`.
- LINT-13: `redundant_clone` is still `nursery`. It now fires more often, which strengthens "time-boxed".
- LINT-14: none of the five rustfmt options was stabilised.
- LINT-16: clippy still has no native baseline.
- LINT-18: the cited `--fix` breakage issues are still open.
- TOOL-01: the `rust-toolchain.toml` grammar and precedence are unchanged. There has been no rustup release since 1.29.0.
- CI-01: the `permissions: {}` syntax is unchanged.
- CI-04: `--locked` is still required on build, check, clippy and test. It is a no-op only for `cargo install` from 1.100.
- CI-07: the split matches the upstream README mechanics.
- CI-08: the ignore format is still valid. `expiry` is additive.
- CI-09: `save-if` is unchanged in rust-cache v2.9.2 and v2.9.3.
- CI-11: the `merge_group` requirement is unchanged.
- CI-12: the giraffate `reporter` values are unchanged, with a v1.0.0 pre-release on 10 Nov.
- REL-01: the release-profile defaults are identical. Cargo 1.99 adds a `debug` profile but does not touch `release`.
- REL-04: the dist key names `cargo-auditable` and `cargo-cyclonedx` are unchanged.
- REL-05: `pr-run-mode = "plan"` is valid and is the default.
- REL-06: the OIDC mechanism and `crates-io-auth-action@v1` are unchanged.
- What Agents Get Wrong #14: the `.2.17` suffix is still zigbuild-only, and cross has had no release.
- Crates table, unchanged rows: clap (and the separate Nushell crate), ratatui 0.30 (0.30.2 current, still no 0.31), indicatif, tokio and async-std (the description quote is exact), rustls stable 0.23 defaults, oci-client, secrecy, serde_json, canonicalizer, toml, toml_edit gaps, YAML (both forks idle, still unsettled), schemars (1.2.3 just demonstrated the stability statement), bincode, postcard and rmp-serde, thiserror and anyhow, tracing, tempfile, atomicwrites, fs4, dunce, globset, flate2, xz, tar ≥ 0.4.45, sha2, backon, governor, dotenvy, rand 0.10, uuid, wiremock and nextest.
- Rule Sources: the anchors for the `[lints]` section, the lint levels page, rustfmt `Configurations.md`, rustup overrides and profiles all resolve.

## Open questions

1. Does `build.warnings = "deny"` treat a path dependency as a "local package"? If it does not, it could replace the manifest switch. This needs a test on a workspace with a vendored path fork, and then an owner decision.
2. This question predates the delta and is not a delta finding. LINT-15 keeps `warnings = "deny"` in `[workspace.lints.rust]`, and that applies to the ratchet invocation too. Does it promote the ratchet's `-W clippy::<lint>` warnings to errors? If it does, the ratchet design needs `warnings` out of the manifest. Confirm on the pinned toolchain.
3. Should a workflow lockfile replace SHA pins, rather than supplement them? This is an owner decision. The verify-mode flag of `gh actions-lock` is unconfirmed, and the docs page returned 404.
4. Should there be a `Cargo.lock` diff review gate for new crates and new `build.rs` crates? There is no fetched tool evidence, and the `cargo vet` side was not researched.
5. When did `artifact-metadata: write` become required, and do dist-generated release workflows grant it? If they do not, the new REL-04 verification fails on a stock `dist generate` workflow.
6. Does the tracing-indicatif sharded-registry concurrency objection still hold? It is unresolved, and there has been no release since 2025-12-03.
7. Are `serde_yml` and `libyml` viable YAML alternatives? They were not evaluated.
8. When will rustls 0.24 go stable? At that point the providers move to `rustls-aws-lc-rs` and `rustls-ring`, and "one explicit provider" becomes mandatory. The TLS row needs a revisit then.
9. What do postcard 2.0.0-rc.0 and keyring 4.2.0 contain? Neither could be determined.
10. Does DEP-01's "403 without a User-Agent" still hold? No crates.io policy source was read in the window.
11. crates.io "Trusted Publishing Only Mode" and GitLab.com trusted publishing date from 2026-01-21, before the baseline. Should REL-06 gain a CONSIDER for Only Mode? This is an owner decision.

## Revision log

- LINT-01: names `[workspace.lints.cargo]` as a third workspace lint table.
- LINT-02: "invalidates the build cache"; names `CARGO_BUILD_WARNINGS`, bans it from `.cargo/config.toml`; adds block LINT-02 (2).
- LINT-04: "clippy's ... groups", disambiguated from `[lints.cargo]`.
- LINT-15: the ratchet step never runs under `CARGO_BUILD_WARNINGS=deny`; the verification checks its `env:`.
- TOOL-05: `cargo::unused_dependencies` complements `cargo shear` and does not replace it.
- CI-02: names the workflow lockfile as covering transitive actions.
- CI-03: corrects where checkout v6 and later keep the token.
- CI-13: new, publish-age cooldown (SHOULD).
- CI-14: new, no PR-head checkout under `pull_request_target` or `workflow_run` (MUST); adds blocks CI-14 and CI-14 (2).
- REL-04: the verification names all three attestation permissions.
- Agents Get Wrong #6: checkout v7 is current.
- Rule Sources: cargo-deny-action note corrected; adds `build.warnings`, the Rust 1.100.0 post and the lockfile GA entry.
- DEP-08: `expiry` is a backstop, never a replacement.
- Crates table: corrects Terminal styling, Colour resolution, HTTP client and OS keychain; updates Base directories; flips zip and Date and time.
- crates-of-record Sources: adds the RustSec IDs; removes the research path.
- gates.md: adds blocks LINT-02 (2), CI-13, CI-14 and CI-14 (2).
- REL-04 (spillover round): on a Rust 1.100+ pin, Windows artifacts need cargo-auditable 0.7.8 or later; the verification checks each Windows artifact with `rust-audit-info`.

## Edit list

Apply the edits in order. Each "Find" string is verbatim and unique in its file. Paths are relative to the repository root.

1. `rules/rust-cargo.md`
   Find:
   ```
   | LINT-01 | All lint policy lives in the workspace root `[workspace.lints.rust]` / `[workspace.lints.clippy]`. Every member crate
   ```
   Replace:
   ```
   | LINT-01 | All lint policy lives in the workspace root `[workspace.lints.rust]` / `[workspace.lints.clippy]` (and `[workspace.lints.cargo]`, stable since Cargo 1.100). Every member crate
   ```

2. `rules/rust-cargo.md`
   Find:
   ```
   turning a vendored fork's upstream noise into a build failure, and busts the incremental cache. | see block LINT-02, which is empty — the git-fed list includes the dot-directories, and a pathspec that matches no file contributes nothing instead of erroring | MUST |
   ```
   Replace:
   ```
   turning a vendored fork's upstream noise into a build failure, and invalidates the build cache. Cargo 1.97's `CARGO_BUILD_WARNINGS=deny` (`[build] warnings`) keeps the cache, but its "local packages" scope is undocumented for path dependencies, so it substitutes for nothing until it passes on the vendored fork; it never goes in `.cargo/config.toml`, where it would also deny LINT-15's ratchet. | see block LINT-02, which is empty — the git-fed list includes the dot-directories, and a pathspec that matches no file contributes nothing instead of erroring; see block LINT-02 (2), which is empty | MUST |
   ```

3. `rules/rust-cargo.md`
   Find:
   ```
   Never enable `nursery`, `restriction` or `cargo` as groups —
   ```
   Replace:
   ```
   Never enable clippy's `nursery`, `restriction` or `cargo` groups (clippy's `cargo` group is not Cargo's own `[lints.cargo]` table) —
   ```

4. `rules/rust-cargo.md`
   Find:
   ```
   promotes a manifest-level group `warn` to a hard deny on the first hit — the group blocks merges instead of ratcheting. | The ratchet step's command line contains no `-D warnings` | MUST |
   ```
   Replace:
   ```
   promotes a manifest-level group `warn` to a hard deny on the first hit — the group blocks merges instead of ratcheting. `CARGO_BUILD_WARNINGS=deny` (Cargo 1.97) promotes the ratchet's `-W` warnings the same way, so the ratchet step never runs under it. | The ratchet step's command line contains no `-D warnings`, and its `env:` sets no `CARGO_BUILD_WARNINGS` | MUST |
   ```

5. `rules/rust-cargo.md`
   Find:
   ```
   not rustc's `unused_crate_dependencies` (fires falsely on single-target deps). |
   ```
   Replace:
   ```
   not rustc's `unused_crate_dependencies` (fires falsely on single-target deps). Keep `cargo shear` beside Cargo 1.100's `cargo::unused_dependencies` lint, which never checks `[dev-dependencies]` and covers only the packages selected on the command line. |
   ```

6. `rules/rust-cargo.md`
   Find:
   ```
   with a trailing `# vX.Y.Z` comment. Tags are mutable. |
   ```
   Replace:
   ```
   with a trailing `# vX.Y.Z` comment. Tags are mutable. A SHA pin does not reach the actions a composite action calls; GitHub's workflow lockfile (`.github/workflows/actions.lock`, GA 2026-10-28) does, and GitHub's secure-use guide ranks it above SHA pinning where the plan offers it. |
   ```

7. `rules/rust-cargo.md`
   Find:
   ```
   otherwise `GITHUB_TOKEN` stays in the git credential helper for every later step, third-party actions and build scripts included. |
   ```
   Replace:
   ```
   otherwise `GITHUB_TOKEN` stays on the runner for every later step, third-party actions and build scripts included. Checkout v6 and later move it from `.git/config` to a file under `$RUNNER_TEMP`, which those steps can still read. |
   ```

8. `rules/rust-cargo.md` (insertion)
   Anchor (insert after this line):
   ```
   | CI-12 | Report LINT-15's ratcheted invocation on PRs through a SHA-pinned `giraffate/clippy-action` with `reporter: github-pr-review`, advisory only — line-scoped review misses a lint whose span does not overlap a changed line, and it shrinks no existing backlog. | The action step exists and the LINT-16 ratchet step still runs alongside it | CONSIDER |
   ```
   Insert:
   ```
   | CI-13 | Once TOOL-01's pin is 1.100 or later, set `[registry] global-min-publish-age = "3 days"` (or longer) in the workspace `.cargo/config.toml`, and never set `CARGO_RESOLVER_INCOMPATIBLE_PUBLISH_AGE` in CI. The resolver then skips versions younger than the window unless `Cargo.lock` already holds them — the 2026-08-20 `arrayref` compromise was live for about an hour, the case a cooldown covers. Upstream calls it no complete defence, and `cargo install` ignores it. | `grep -n -E -e 'global-min-publish-age' -- .cargo/config.toml` prints a line; see block CI-13, which is empty | SHOULD |
   | CI-14 | Never check out pull-request head code in a `pull_request_target` or `workflow_run` workflow, and never set `allow-unsafe-pr-checkout: true`. Both triggers run with the base repository's secrets and token, so a fork's `build.rs` runs with them; checkout v7 refuses that checkout by default, and GitHub blocks `pull_request_target` by default in public repositories from 2026-12-02. | see block CI-14 and block CI-14 (2), both empty | MUST |
   ```

9. `rules/rust-cargo.md`
   Find:
   ```
   the release workflow runs an attestation step with `attestations: write` | MUST |
   ```
   Replace:
   ```
   the release workflow runs an attestation step whose job grants `id-token: write`, `attestations: write` and `artifact-metadata: write` (the three the `actions/attest` README lists) | MUST |
   ```

10. `rules/rust-cargo.md`
    Find:
    ```
    6. **Stale or hallucinated Action versions and inputs** — `actions/checkout@v3`,
       invented `with:` keys.
    ```
    Replace:
    ```
    6. **Stale or hallucinated Action versions and inputs** — `actions/checkout@v3`
       or `@v4` (the current major is v7, and upstream READMEs still show `@v4`),
       invented `with:` keys.
    ```

11. `rules/rust-cargo.md`
    Find:
    ```
    — the advisories-split pattern, verbatim from upstream
    ```
    Replace:
    ```
    — the matrix-and-`continue-on-error` advisories split; the scheduled blocking leg is this rule's addition
    ```

12. `rules/rust-cargo.md` (insertion)
    Anchor (insert after this line):
    ```
    - [Cargo Book — profiles](https://doc.rust-lang.org/cargo/reference/profiles.html) — the defaults every REL-01 override is measured against
    ```
    Insert:
    ```
    - [Cargo Book — `build.warnings`](https://doc.rust-lang.org/cargo/reference/config.html#buildwarnings) — the Cargo 1.97 denial switch LINT-02 and LINT-15 scope
    - [Rust 1.100.0 announcement](https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/) — the publish-age cooldown behind CI-13 and the `cargo::unused_dependencies` lint TOOL-05 names
    - [GitHub — workflow lockfiles GA](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available) — the transitive-action coverage CI-02 cites
    ```

13. `skills/rust-cargo-reference/gates.md` (insertion)
    Anchor (insert after this line):
    ```
    git ls-files -z --cached --others --exclude-standard -- ':(glob).github/**' ':(glob).cargo/**' ':(glob)taskfiles/**' | xargs -0 -r grep -H -n -E -e 'RUSTFLAGS' --
    ```
    Insert:
    ```
    # LINT-02 (2)
    git ls-files -z --cached --others --exclude-standard -- ':(glob).cargo/**' | xargs -0 -r grep -H -n -E -e '^[[:space:]]*(build\.)?warnings[[:space:]]*=[[:space:]]*"deny"' --
    ```

14. `skills/rust-cargo-reference/gates.md` (insertion)
    Anchor (insert after this line):
    ```
    git ls-files -z --cached --others --exclude-standard -- ':(glob).github/**' ':(glob)taskfiles/**' | xargs -0 -r grep -H -n -E -e '^[[:space:]]*(- )?(run: )?cargo [bctn][a-z]+' -- | grep -v -E -e '^[^:]+:[0-9]+:.*--locked'
    ```
    Insert:
    ```
    # CI-13
    git ls-files -z --cached --others --exclude-standard -- ':(glob).github/**' ':(glob)taskfiles/**' | xargs -0 -r grep -H -n -E -e 'CARGO_RESOLVER_INCOMPATIBLE_PUBLISH_AGE' --
    # CI-14
    git ls-files -z --cached --others --exclude-standard -- ':(glob).github/workflows/**' | xargs -0 -r grep -H -n -E -e 'allow-unsafe-pr-checkout:[[:space:]]*true' --
    # CI-14 (2)
    git ls-files -z --cached --others --exclude-standard -- ':(glob).github/workflows/**' | xargs -0 -r grep -l -E -e 'pull_request_target|workflow_run' -- | tr '\n' '\0' | xargs -0 -r grep -H -n -E -e 'ref:.*(github\.event\.(pull_request\.head|workflow_run\.head)|github\.head_ref)' --
    ```

15. `skills/rust-cargo-reference/crates-of-record.md`
    Find:
    ```
    not a date and not "revisit later". |
    ```
    Replace:
    ```
    not a date and not "revisit later". cargo-deny 0.21's per-entry `expiry` may back the comment up, never replace it: a date says nothing about whether the condition is met. |
    ```

16. `skills/rust-cargo-reference/crates-of-record.md`
    Find:
    ```
    `anstream`/`anstyle` arrive transitively via `clap_builder` — check before "adding" them |
    ```
    Replace:
    ```
    `anstyle` always, and `anstream` under clap's default `color` feature, arrive transitively via `clap_builder` — check before "adding" them |
    ```

17. `skills/rust-cargo-reference/crates-of-record.md`
    Find:
    ```
    | Colour resolution | an explicit `NO_COLOR`/`CLICOLOR_FORCE`/`CLICOLOR`/`TERM=dumb` chain, resolved once | assuming the styling crate reads the environment | `console` 0.16 has an independent global switch and reads none of those variables. The application wires them |
    ```
    Replace:
    ```
    | Colour resolution | an explicit `NO_COLOR`/`CLICOLOR_FORCE`/`CLICOLOR`/`TERM=dumb` chain, resolved once | trusting the styling crate's own environment reading | `console` 0.16 reads all four itself, in its own precedence: `CLICOLOR_FORCE` overrides `NO_COLOR`, and an empty `NO_COLOR` disables colour, which the NO_COLOR spec says it must not. The application resolves the chain once and calls `set_colors_enabled`, which overrides those defaults |
    ```

18. `skills/rust-cargo-reference/crates-of-record.md`
    Find:
    ```
    hyper 1.0 (2025-01) removed
    ```
    Replace:
    ```
    hyper 1.0 (2023-11) removed
    ```

19. `skills/rust-cargo-reference/crates-of-record.md`
    Find:
    ```
    | OS keychain | `keyring-core` 1.0 plus a per-platform backend crate |
    ```
    Replace:
    ```
    | OS keychain | `keyring-core` 1.x plus a per-platform backend crate |
    ```

20. `skills/rust-cargo-reference/crates-of-record.md`
    Find:
    ```
    | Base directories | one of `dirs` / `directories`, chosen once | picking per call site | Both are maintained by the same org; the failure is inconsistency, not the choice |
    ```
    Replace:
    ```
    | Base directories | one of `dirs` / `directories`, chosen once | picking per call site | Both come from the same author, now developed on Codeberg (the GitHub `dirs-dev/dirs-rs` repository is archived). `dirs` 7.0 (2026-09-05) moved Windows `preference_dir` from LocalAppData to RoamingAppData, so an upgrade changes where existing preference files are looked up. The failure is inconsistency, not the choice |
    ```

21. `skills/rust-cargo-reference/crates-of-record.md`
    Find:
    ```
    | zip | `zip` 8.x with an explicit extraction loop | `ZipArchive::extract()` | `RUSTSEC-2025-0168` (CVSS 7.3): symlink zip-slip that `enclosed_name()` alone did not stop. The convenience method looks like the obviously right answer |
    ```
    Replace:
    ```
    | zip | `zip` ≥ 9.0.5 with an explicit extraction loop | `ZipArchive::extract()`, `zip` 8.x | `RUSTSEC-2025-0168` (CVSS 7.3): symlink zip-slip that `enclosed_name()` alone did not stop. October 2026 added eight more, patched only in 9.x: `RUSTSEC-2026-0367`, `-0368`, `-0369`, `-0429`, `-0545`, `-0546`, `-0547`, and `-0548` (patched 9.0.5); four sit in `extract()` itself or its symlink path. The convenience method looks like the obviously right answer |
    ```

22. `skills/rust-cargo-reference/crates-of-record.md`
    Find:
    ```
    | Date and time | `chrono` | `jiff` | jiff is the direction of travel for calendar arithmetic, not a migration mandate. One datetime crate per graph either way |
    ```
    Replace:
    ```
    | Date and time | `jiff` 1.x | `chrono` | `RUSTSEC-2026-0543` (2026-09-14) flags chrono unmaintained with no patched version, and its maintainer points to jiff, which reached 1.0 on 2026-11-15 with a commitment to 1.x. Moving existing chrono code is a tracked migration under a DEP-08 ignore, not a reflex rewrite; `chrono-tz` no longer tracks tz database updates. One datetime crate per graph either way |
    ```

23. `skills/rust-cargo-reference/crates-of-record.md`
    Find:
    ```
    — `RUSTSEC-2025-0141` (bincode), `RUSTSEC-2025-0168` (zip), `RUSTSEC-2026-0067` (tar)
    ```
    Replace:
    ```
    — `RUSTSEC-2025-0141` (bincode), `RUSTSEC-2025-0168` and the October 2026 set (zip), `RUSTSEC-2026-0067` (tar), `RUSTSEC-2026-0543` (chrono)
    ```

24. `skills/rust-cargo-reference/crates-of-record.md`
    Find:
    ```
    - Full evidence and the per-crate reasoning: [`.agents/research/rust-ecosystem.md`](../../.agents/research/rust-ecosystem.md). That file carries its own 54-rule `ECO-*` set — a **separate namespace** from the `DEP-*` rules above, which is why these were renumbered rather than kept as `ECO-*`. An `ECO-nn` citation always means the research file; a `DEP-nn` citation always means this one.
    ```
    Replace:
    ```
    - The full evidence and per-crate reasoning live in the family's research corpus, which carries its own 54-rule `ECO-*` set — a **separate namespace** from the `DEP-*` rules above, which is why these were renumbered rather than kept as `ECO-*`. An `ECO-nn` citation always means the research corpus; a `DEP-nn` citation always means this file.
    ```

After applying the edits, check the following. `rules/rust-cargo.md` stays under 200 body lines: about 193, against 188 before. No published file contains `/home/mherwig` or `.agents/research`. `SKILL.md` needs no edit, because DEP-01 to DEP-08 is unchanged.

## Spillover round

This round decides the eleven items the rust-quality pipeline addressed to this pair, as checked in the rust-cargo spillover check. Every item was confirmed by a primary source, at least in part, and every item reported that no target sentence is false. So the question for each item was whether its optional addition closes a real gap that a competent model would not close unaided. The items were rated against the current text, which already carries the first round's changes.

### Verdict

- One change. REL-04 promises that release artifacts carry embedded dependency data, and it verifies this only through the dist config key. cargo-auditable 0.7.8 (2026-11-25) fixed a bug where, on Rust 1.100 or later, audit data was not embedded on Windows in large projects, because Cargo passed the arguments as an argfile. On such a build the config check passes while the artifact carries no data. REL-04 now names the 0.7.8 floor for Windows artifacts on a 1.100+ pin, and its verification reads the data back from each Windows artifact with `rust-audit-info`, the extractor the cargo-auditable README lists.
- No new rules, and no new IDs.
- The other ten items leave the target unchanged. They make no sentence false, they duplicate a diagnostic Cargo already emits, or they touch only text that the first round already decided.
- Bumps: rule patch (one rule changed in place, no new rule). Reference skill none (no file under `skills/rust-cargo-reference/` changes).
- After the edit, `rules/rust-cargo.md` stays at 193 body lines, because the change lengthens one table row and adds no line.

### Changed rules

| ID | Old text | New text | Source |
|---|---|---|---|
| REL-04 | Rule text ends: "The first two answer "what is in this binary", the third "did it come from this repo"." The verification ends with "(the three the `actions/attest` README lists)". | Rule text appends: "On a Rust 1.100+ pin, Windows artifacts need cargo-auditable 0.7.8 or later: older versions skip the embedding in large projects, where Cargo passes the arguments as an argfile." The verification appends: "; on a 1.100+ pin, `rust-audit-info` prints the dependency JSON for each Windows artifact". | [cargo-auditable CHANGELOG](https://github.com/rust-secure-code/cargo-auditable/blob/master/cargo-auditable/CHANGELOG.md) (0.7.8, 2026-11-25: "Fixed audit data not being embedded on Windows on Rust 1.100 or later in large projects due to Cargo running into command-line argument length limit and passing arguments as an argfile."), [cargo-auditable README](https://github.com/rust-secure-code/cargo-auditable/blob/master/README.md) ("rust-audit-info" recovers the dependency list and prints it as JSON) |

### New rules

None.

### Declined

| Item | Why declined |
|---|---|
| 1. `cargo install` uses the packaged lockfile and `--locked` is a no-op (Cargo 1.100) | Confirmed, but no sentence is false. `--locked` stays harmless on `cargo install`, and it is still needed when TOOL-01 pins a toolchain below 1.100. Block CI-04 does not match `cargo install`. The first round already recorded this under Confirmed unchanged. |
| 2. `[lints.cargo]`, `cargo::missing_lints_inheritance`, `cargo::unused_dependencies` (Cargo 1.100) | Already correct: LINT-01 and TOOL-05 carry the first round's text. `missing_lints_inheritance` is a warn-by-default Cargo diagnostic for the omission LINT-01 already forbids, so naming it changes no behaviour. |
| 3. `registry.global-min-publish-age` (Cargo 1.100) | Already correct: CI-13, with its source in the rule's Sources list. |
| 4. Incremental compilation off by default when `CI` is set (Cargo 1.99) | Confirmed. No sentence is false, and the first round already used this fact to reword LINT-02. The proposed "do not set `CARGO_INCREMENTAL=1`" is the pipeline's inference, not a source statement. |
| 5. Built-in `debug` profile, edition-2024 `default-features` override (Cargo 1.99) | Confirmed. No rule covers the `dev` profile, and `debug` is identical to `dev` today, so the "dev loses debuginfo" concern is an inference with no date. The override applies to inherited workspace dependencies, not to the transitive feature union that the gzip row warns about. |
| 6. Hyphenated lint names warn (Cargo 1.99) | Confirmed. The first round already declined it: the stanza uses underscores, and Cargo warns. The virtual-workspace half is a suggestion on an existing diagnostic, not a new warning. |
| 7. The build-dir layout is not a stable interface (Cargo 1.100) | Confirmed. No rule or gate hard-codes a path under `target/` or the build directory, so no sentence is affected. The cache-key extension is the pipeline's inference. |
| 8. cargo-deny 0.21.0, 0.22.0 and 0.22.1 | Confirmed. DEP-08 already carries 0.21's `expiry`. No target sentence states the scope of `advisories.unmaintained`, so the 0.22.0 narrowing to `workspace` makes nothing false. A direct `chrono` dependency still fires RUSTSEC-2026-0543 under that scope. Whether to set `all` is an owner policy decision, not a correction. `git-fetch-with-cli` was already inert. |
| 9a. cargo-audit 0.23.0 (`update-db`, the lock file name) | Confirmed, but the target names no cargo-audit version and runs no cargo-audit command. |
| 9b. `actions/attest` permissions | Already correct: REL-04 lists the README's main set. The item's `contents: read` set comes from a secondary example in that README. |
| 10. Target tier changes (`i686-pc-windows-gnu`, `windows-gnullvm`, `riscv64-unknown-linux-musl`) | Confirmed. The target names no tier and no Windows or riscv64 target, so no sentence is affected. |
| 11. rust-ecosystem.md copies of SEC, PLAT and PERF IDs | Nothing in the rust-cargo files cites those IDs. The research file is outside this pair's write scope. |

### Edit list (spillover round)

Apply the edits in order. Each "Find" string is verbatim and unique in its file. Paths are relative to the repository root.

1. `rules/rust-cargo.md`
   Find:
   ```
   the third "did it come from this repo". | `cargo-auditable = true` and `cargo-cyclonedx = true` in the dist config; the release workflow runs an attestation step whose job grants `id-token: write`, `attestations: write` and `artifact-metadata: write` (the three the `actions/attest` README lists) | MUST |
   ```
   Replace:
   ```
   the third "did it come from this repo". On a Rust 1.100+ pin, Windows artifacts need cargo-auditable 0.7.8 or later: older versions skip the embedding in large projects, where Cargo passes the arguments as an argfile. | `cargo-auditable = true` and `cargo-cyclonedx = true` in the dist config; the release workflow runs an attestation step whose job grants `id-token: write`, `attestations: write` and `artifact-metadata: write` (the three the `actions/attest` README lists); on a 1.100+ pin, `rust-audit-info` prints the dependency JSON for each Windows artifact | MUST |
   ```

After applying the edit, `rules/rust-cargo.md` keeps 193 body lines, and no published file contains `/home/mherwig` or `.agents/research`.
