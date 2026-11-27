---
title: Rust cargo, lint, CI and supply-chain shifts, 2026-08-14 to 2026-11-27
pair: rust-cargo
date_researched: 2026-11-27
window_start: 2026-08-14
model: sonnet
sources_fetched: 14
---

# Recent shifts for rust-cargo (delta update)

This is a delta against rules/rust-cargo.md and skills/rust-cargo-reference/. Everything upstream that did not change in the window stays as written. Dates are upstream publication dates.

## Summary

Five candidate shifts. The two strongest are Cargo 1.100 (2026-11-12) stabilising dependency cooldowns and Cargo lints, and the 2026-08-20 arrayref supply-chain compromise, which exposed a gap in the CI-04/REL-06 reasoning. Nothing found for: lockfile format bump, default resolver change, build-std stabilisation, `cargo publish --workspace`, `-Zpublic-dependency`, cargo-script stabilisation (still nightly `-Zscript`), a crates.io API rate-limit or User-Agent policy change, mandatory 2FA, and new deprecation metadata. Edition 2027 progress: nothing found in the window sources read (Inside Rust list had no edition post).

## Claims at risk

| Claim in pair | Status | Detail |
|---|---|---|
| TOOL-05: rustc `unused_crate_dependencies` fires falsely, use `cargo shear` | changed (partly) | Old: only `cargo shear`. New: Cargo 1.100 ships `cargo::unused_dependencies` at `warn` by default, stated to be the intended replacement for the rustc lint ([Rust 1.100.0 post](https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/), 2026-11-12). Limits: only warns when all targets that may use a dependency are built; dev-dependencies never flagged. `cargo shear` claim stays valid for dev-deps and partial builds. |
| CI-04: every cargo invocation carries `--locked` | unchanged, but note | 1.100: `cargo install` now uses the packaged lockfile by default and `--locked` is a no-op there ([Cargo changelog](https://doc.rust-lang.org/nightly/cargo/CHANGELOG.html), 2026-11-12). Still required for build/check/clippy/test. |
| REL-06: OIDC trusted publishing | unchanged | Trusted publishing expanded: seven more crates converted per the [Infra Q3 recap](https://blog.rust-lang.org/inside-rust/2026/10/12/infrastructure-team-q3-recap-and-q4-plan/) (2026-10-12). The 2026-01-21 changes (GitLab, owner-enforced trusted publishing, `pull_request_target`/`workflow_run` blocked) predate the window. |
| CI-02: SHA-pin every `uses:` | unchanged, supplemented | GitHub workflow lockfiles went GA 2026-10-28 (see shift 4). |
| DEP-01: crates.io API returns 403 without User-Agent | could not determine | No crates.io policy post in the window found; blog.crates.io did not resolve and the crates.io blog page returned no content. Infra recap mentions a Fastly WAF that "enforces rate limits" with no specifics (2026-10-12). |
| Clippy lint set / LINT-04, LINT-05 | could not determine | The Clippy changelog fetch returned only navigation; the 1.98 to 1.100 blog posts link there without detail. No Clippy change was verified. |
| Rust 1.98 / 1.99 releases | unchanged for this pair | No stable Cargo changes in 1.98; 1.99 changes are in shifts 3 and 5. |

## Candidate shifts

### 1. Dependency cooldowns: `registry.global-min-publish-age` (stable in Cargo 1.100)

Evidence: Cargo 1.100, released 2026-11-12, stabilised minimum publish age ([RFC 3923](https://rust-lang.github.io/rfcs/3923-cargo-min-publish-age.html), [Rust 1.100.0 post](https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/), [Cargo changelog](https://doc.rust-lang.org/nightly/cargo/CHANGELOG.html), [resolver docs](https://doc.rust-lang.org/nightly/cargo/reference/resolver.html#publish-age)). Setting `[registry] global-min-publish-age = "3 days"` in `.cargo/config.toml` makes the resolver skip versions newer than the window unless they are already in `Cargo.lock`. Versions with no `pubtime` in the index are never held back, `cargo install` ignores the age, and `CARGO_RESOLVER_INCOMPATIBLE_PUBLISH_AGE=allow` overrides it for one run. The release post itself says cooldowns are not a complete defence. The arrayref compromise (shift 2) was live for roughly one hour, which is the case a cooldown covers.

Proposal: new rule DEP-09 (crates-of-record.md) or CI-13 (rules/rust-cargo.md). Text: set `registry.global-min-publish-age` of at least 3 days in the workspace `.cargo/config.toml`; `Cargo.lock` updates are reviewed and the override variable is never set in CI. Material: SHOULD, with TOOL-01's pinned toolchain at 1.100 or later (else the key is ignored or errors; verify on the pinned version). Verification: `grep -n 'global-min-publish-age' .cargo/config.toml` is non-empty; `grep -rn 'INCOMPATIBLE_PUBLISH_AGE' .github` is empty. Caveat: exact value format beyond the post's `"3 days"` example was not confirmed in docs (the resolver page did not state it).

### 2. arrayref supply-chain compromise (2026-08-20) and the targeted-attack campaign (2026-09-17)

Evidence: On 2026-08-20 crates.io deleted malicious `proc-macro1` and related crates, and removed malicious versions of `arrayref` 0.3.10, `internment` 0.8.7 and `append-only-vec` 0.1.9; the author's account was locked ([Rust blog](https://blog.rust-lang.org/2026/08/20/supply-chain-attack-on-arrayref/), [JFrog](https://research.jfrog.com/post/arrayref-proc-macro1-crates-io/)). The attack added a typosquat dependency (`proc-macro1`) whose `build.rs` downloaded a payload, so it ran on `cargo build`/`check`, in CI and in rust-analyzer. The Rust blog says the author's machine or credentials were likely compromised. The follow-up [Be alert: targeted attacks on prominent Rustaceans](https://blog.rust-lang.org/2026/09/17/targeted-attacks/) (2026-09-17) describes a social-engineering campaign against crate owners, with a June 2026 precursor. The Hacker News article returned 403 and was not read; its claimed CVE (via a search snippet) is unverified and must not be cited.

Gap exposed: CI-04 (`--locked`) protects an existing lockfile but not the PR that refreshes it, and nothing in CI-01 to CI-12 treats a lockfile change as a review event or limits what a `build.rs` can reach. Proposal: new rule CI-13: a PR that changes `Cargo.lock` gets a diff review that lists new crates and new `build.rs`/proc-macro crates, plus an incident-response line in the pair: on a published compromise, grep `Cargo.lock` and `~/.cargo/registry/cache` for the named versions and rotate credentials of any runner that built them. Material: SHOULD for the lockfile-diff gate, CONSIDER for `cargo vet`-style or build-script allowlisting (no tool evidence read in the window, so do not name one). Verification: a CI step that fails or annotates when `git diff origin/main -- Cargo.lock` adds a `[[package]]` not already present; reading heuristic: reviewer checks each added package against crates.io `updated_at` and owners (DEP-01/DEP-02 already cover the liveness half).

### 3. Cargo lints `[lints.cargo]` stable, `cargo::unused_dependencies` on by default (Cargo 1.100)

Evidence: [Cargo changelog](https://doc.rust-lang.org/nightly/cargo/CHANGELOG.html) and [Rust 1.100.0 post](https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/), 2026-11-12. `[lints.cargo]` is configured like other lint tables and works with `[workspace.lints]` (1.99 also: adding `[lints]` to a virtual workspace suggests `[workspace.lints]`, and hyphenated lint names such as `unexpected-cfgs` in `[lints]` are deprecated in favour of underscores, 2026-10-01). `build.warnings = "deny"` now exists and the build summary reports the error count.

Proposal: extend LINT-01 (add `[workspace.lints.cargo]` to the stanza and use underscore names only) and TOOL-05 (Cargo lint is the first line, `cargo shear` stays for dev-dependencies and partial builds). Material: SHOULD for LINT-01 extension, CONSIDER to relax TOOL-05's wording. Do not adopt `build.warnings = "deny"` over LINT-02 without a decision: LINT-02 forbids RUSTFLAGS for denial and this is a different mechanism that was not evaluated. Verification: `grep -n 'unexpected-cfgs\|-' ` is too broad; use `grep -rEn '^[a-z]+-[a-z-]+ *=' Cargo.toml` inside `[workspace.lints*]` sections to find hyphenated lint names; `grep -n 'workspace.lints.cargo' Cargo.toml`.

### 4. GitHub Actions workflow lockfiles GA (2026-10-28) and `pull_request_target` blocked by default (from 2026-12-02)

Evidence: [InfoQ](https://infoq.com/news/2026/11/github-actions-lockfiles-ga) cites the GitHub changelog entries [2026-10-14 preview](https://github.blog/changelog/2026-10-14-github-actions-workflow-lockfiles-in-public-preview/), [2026-10-28 GA](https://github.blog/changelog/2026-10-28-github-actions-workflow-lockfiles-are-generally-available/) and [2026-11-02](https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2). The lockfile `.github/workflows/actions.lock`, maintained by `gh actions-lock`, pins direct and transitive (composite) action commits, has a verify mode usable as a CI gate, and Dependabot updates it. The GitHub changelog pages themselves were not fetched; this rests on InfoQ and should be re-checked before the rule text is written. Separately, the Rust project's Q3 recap says it runs 23 Zizmor audits through crabwatch across `rust-lang` workflows and uses Renovate ([Infra recap](https://blog.rust-lang.org/inside-rust/2026/10/12/infrastructure-team-q3-recap-and-q4-plan/), 2026-10-12).

Proposal: extend CI-02. SHA pinning remains MUST; add a CONSIDER that composite-action transitive dependencies are not covered by SHA pins and the lockfile covers them. Add a CONSIDER for a `zizmor` PR gate as new rule CI-14 (evidence of Rust-project adoption only; no incident tie). Verification: `gh actions-lock --verify` (exact flag unconfirmed) or `grep -rn 'pull_request_target' .github/workflows` is empty.

### 5. Incremental compilation off in CI by default; build-dir layout change (Cargo 1.99, 1.100)

Evidence: [Cargo changelog](https://doc.rust-lang.org/nightly/cargo/CHANGELOG.html). 1.99 (2026-10-01): incremental compilation is disabled by default when the `CI` environment variable is set. 1.100 (2026-11-12): intermediate artifacts use a new, explicitly unstable directory layout with the config hash in parent directories; tools must locate artifacts through Cargo JSON messages. The pair's CI-09 (rust-cache) and any release step that globs `target/` paths are exposed. Also 1.99: workspace members may override `default-features` on `workspace = true` dependencies on edition 2024 and later (RFC 3945).

Proposal: extend CI-09 (cache key and path assumptions; do not hardcode `target/<hash>` paths) and REL-01/REL-03 verification (locate binaries with `--message-format=json` or the fixed `target/<triple>/<profile>/<bin>` output, not intermediate paths). Material: SHOULD, low priority. Verification: `grep -rEn 'target/.*/(deps|build)/' .github taskfile* ` is empty. Remove any `CARGO_INCREMENTAL=0` workaround as redundant (CONSIDER).

## Checked, nothing found

- Lockfile format bump, default resolver change, build-std stabilisation, `cargo publish --workspace`, `-Zpublic-dependency`, cargo-script: none stabilised in 1.98 to 1.100 per the [Cargo changelog](https://doc.rust-lang.org/nightly/cargo/CHANGELOG.html). `-Zscript`, `-Zhint-msrv`, `-Zsbom` and `builtin-dependencies` (build-std source kind) remain nightly. Note for TOOL-04: `-Zsbom` is the nightly SBOM path, so REL-04 should keep a non-Cargo SBOM tool.
- Mandatory 2FA, new rate-limit or User-Agent policy, new deprecation metadata: nothing found. The July 2026 crates.io update (before the window) added RustSec-unmaintained banners ([2026-07-13](https://blog.rust-lang.org/2026/07/13/crates-io-development-update/)); relevant to DEP-03 only as a visible signal, not a new machine-readable field.
- Planned, not shipped: crates.io quarantine and automated suspicious-release detection ([Rust 1.100.0 post](https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/)). Worth watching.
- Edition 2027: nothing found for manifest, toolchain or `cargo fix --edition`. 1.100 changes never-type fallback to `!` in editions 2015, 2018 and 2021, which may add unreachable-code warnings and so trips LINT-02/TOOL-03 on bump; that is a language item for the rust-quality pair, mentioned here only for the TOOL-03 bump-commit workflow.
- Clippy 1.98 to 1.100 lint changes: could not determine (changelog not readable via fetch).

## Contested / evolving

Cooldowns are not a complete defence (post says so). GitHub lockfile status rests on a secondary source. The `cargo vet` and attestation-verification side of Rust supply chain had no window evidence read.

## Sources fetched

Rust releases index; 1.98, 1.99, 1.100 posts; Inside Rust index; Infra Q3 recap; Cargo changelog (first 100k chars covering 1.98 to 1.100); resolver docs; Rust blog arrayref post; targeted-attacks post; JFrog arrayref report; InfoQ lockfiles article; plus web searches for crates.io and GitHub changelog (snippets, not relied on except to locate URLs). Failed: blog.crates.io (no DNS), crates.io/blog (empty), The Hacker News (403), Clippy CHANGELOG (no content).
