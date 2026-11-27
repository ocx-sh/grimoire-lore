---
title: Release and cargo-subcommand tools delta, rust-cargo pair
pair: rust-cargo
date_researched: 2026-11-27
window_start: 2026-08-14
model: sonnet
sources_fetched: 17
---

# Release and cargo-subcommand tools delta (2026-08-14 to 2026-11-27)

This is a delta update of the existing research, not a re-creation. Anything not listed as "changed" below stays as written. Year inference note: several GitHub release pages print day and month only; years were inferred from page ordering and asset timestamps and are marked where relevant.

## Summary

- dist has three releases after 0.32.0: 0.33.0 (2026-09-10), 0.33.1 (2026-10-21), 0.34.0 (2026-11-01). None changes a REL rule. The baseline's 0.32.0 is stale; repos pinned to 0.31.0 are three minors behind.
- REL-04, REL-05: key names, default and values unchanged in the dist config reference.
- REL-06: the crates.io mechanism is unchanged and the action is still `@v1` (v1.0.6, 2026-10-21, dependency bumps only). Scope widened: GitLab.com CI is supported since the 2026-01-21 update, and a "Trusted Publishing Only Mode" exists. Optional addition below.
- Agents-Get-Wrong #14: unchanged. cross still has no glibc suffix; zigbuild README still documents the suffix.
- cargo-deny changed materially: 0.21.0 (2026-11-16), 0.22.0 (2026-11-19), 0.22.1 (2026-11-24). New `advisories.ignore-expiry` and per-ignore `expiry`, new `advisories.patched`, deprecation of `advisories.git-fetch-with-cli`, and `advisories.unmaintained` now defaults to `workspace` scope. No removed or newly required field for `licenses.allow`, `bans.deny` or `sources`.
- cargo-shear 1.13.5, 1.14.0, 1.14.1: no output-format or `--fix` break. New `keep-path-dependencies` setting. README now contrasts shear with Cargo's own `unused_dependencies` lint.
- cargo-machete reached v0.10.0 and v0.10.1 (Nov 2026); detection approach not stated in release notes. cargo-udeps has no release after 2026-08-14.
- nextest still `cargo nextest run`; 0.9.144 to 0.9.152 contain behaviour changes but no invocation change.

## Findings

### 1. REL-04 key names and attestations: unchanged
- `cargo-auditable` (default `false`, since 0.26.0) and `cargo-cyclonedx` (default `false`, since 0.26.0) are current in the config reference. Source: [dist config reference](https://axodotdev.github.io/cargo-dist/book/reference/config.html).
- Attestation key is `github-attestations` (global, experimental, default `false`, since 0.16.0), same page. The 0.33.0 release only fixes generated `gh attestation` commands to include `--repo`; no key change. Source: [dist releases](https://github.com/axodotdev/cargo-dist/releases), 2026-09-10.
- Side effect: cargo-cyclonedx 0.5.10 (2026-11-06) adds `--spec-version 1.6` and `1.7` and raises its MSRV to 1.86; no flag removed. Source: [cyclonedx-rust-cargo releases](https://github.com/CycloneDX/cyclonedx-rust-cargo/releases). cargo-auditable has releases v0.7.6 (2026-09-13, year inferred), v0.7.7 (2026-10-02), v0.7.8 (2026-11-25) with no notes visible on the page: could not determine content. Source: [cargo-auditable releases](https://github.com/rust-secure-code/cargo-auditable/releases). Neither affects the dist key names.

### 2. REL-05 `pr-run-mode = "plan"`: unchanged
The config reference lists values `skip`, `plan`, `upload`; "plan" is "recommended, also the default" (since 0.3.0, global-only). Source: [dist config reference](https://axodotdev.github.io/cargo-dist/book/reference/config.html). Consequence unchanged: the key is valid, and the default already equals "plan", so the check is satisfied by omission as well as by explicit setting. The rule's verification grep for the literal key can false-negative on a repo relying on the default; this is a pre-existing nuance, not a window change.

### 3. dist releases after 0.32.0
| Version | Date | Relevant change | Alters a REL rule? |
|---|---|---|---|
| 0.33.0 | 2026-09-10 | Azure Artifact Signing for Windows (x86_64 only); installer `env` helper relocation; `gh attestation` gets `--repo` | No |
| 0.33.1 | 2026-10-21 | Dependency and certificate-list updates | No |
| 0.34.0 | 2026-11-01 | aarch64-apple-darwin default runner moves to a newer macOS (notes say macos-14 and "default Apple Silicon builds to macos-15"; the page is internally inconsistent) | No rule; matters only to repos that pin a runner |

Source: [dist releases](https://github.com/axodotdev/cargo-dist/releases). Latest is 0.34.0. Candidate follow-up for the owner outside this pair: repos pinned to 0.31.0 should consider bumping.

### 4. REL-06 OIDC trusted publishing: unchanged mechanism, widened scope
- [crates-io-auth-action](https://github.com/rust-lang/crates-io-auth-action/releases): latest v1.0.6 (2026-10-21), dependency updates only; README example still uses `@v1`. No v2.
- [crates.io development update 2026-01-21](https://blog.rust-lang.org/2026/01/21/crates-io-development-update): GitLab CI/CD (GitLab.com only) now supported; `pull_request_target` and `workflow_run` GitHub triggers are blocked from trusted publishing; owners may enable "Trusted Publishing Only Mode", which disables token publishing. This predates the window but postdates nothing in the baseline wording; it is a gap in the existing text, not a break.
- crates.io's own docs page (crates.io/docs/trusted-publishing) rendered as an empty shell and could not be read; the blog post and action README stand in. Could not determine anything the docs page adds.
- The rule's grep (`CARGO_REGISTRY_TOKEN`, `_TOKEN: ${{ secrets`) stays valid. Note a legitimate OIDC workflow assigns `CARGO_REGISTRY_TOKEN: ${{ steps.auth.outputs.token }}`, which the first alternative matches; this was already true before the window.

### 5. Agents-Get-Wrong #14: unchanged
- [cargo-zigbuild README](https://raw.githubusercontent.com/rust-cross/cargo-zigbuild/main/README.md): `cargo zigbuild --target aarch64-unknown-linux-gnu.2.17`. Syntax unchanged. Releases v0.23.2 (2026-08-24), v0.23.3 (08-27), v0.23.4 (09-02), v0.24.0 (10-21), v0.24.1 (2026-11-04, years inferred); release page shows no note on suffix syntax. Source: [zigbuild releases](https://github.com/rust-cross/cargo-zigbuild/releases).
- cross: no release after 2026-08-14 (newest listed v0.2.5, 2023-02-04 in the changelog); the only glibc 2.17 entry (#501) was reverted by #764. Sources: [cross releases](https://github.com/cross-rs/cross/releases), [cross CHANGELOG](https://raw.githubusercontent.com/cross-rs/cross/main/CHANGELOG.md). The claim holds.

### 6. cargo-deny (CI-07, CI-08, DEP-06, DEP-08): changed, additive
Source for all: [cargo-deny CHANGELOG](https://github.com/EmbarkStudios/cargo-deny/blob/main/CHANGELOG.md). No release 2026-08 to 2026-10; releases 0.21.0, 0.22.0, 0.22.1 in November.
- 0.21.0 (2026-11-16): `advisories.git-fetch-with-cli` deprecated (no-op); new `advisories.ignore-expiry` (default duration after publication, or absolute date), per-entry `advisories.ignore.expiry`, `advisories.ignore.allow` (PackageSpecs permitted to depend on the affected crate); config also searched in `.config`; new bans diagnostics `unmatched-allow-build-script`, `allowed-crate-without-build-script`.
- 0.22.0 (2026-11-19): `advisory-withdrawn` diagnostic replaces `advisory-not-detected` for withdrawn ignored advisories; `advisories.unmaintained` default scope changes from `all` to `workspace`.
- 0.22.1 (2026-11-24): `advisories.patched` setting and `patched` diagnostic warns or errors when an ignored advisory has a patch semver-compatible with all workspace dependents; exit codes made consistent across output formats.
- Not changed: `[licenses].allow`, `bans.deny`, `sources`, and the `check bans licenses sources` / `check advisories` CLI. No new required version field. The existing `ignore` entry forms (string id, or table with `id` and `reason`) are not stated as changed; the new fields are additive.
- Impact on CI-08: the repo's prose convention ("`REMOVE when` comment") now has a native machine mechanism, `expiry`, but that is date-based while CI-08 wants a command-based condition. They complement; `patched` is a native check that fires when the condition becomes true for patched advisories. Neither replaces the comment rule.
- Impact on CI-07: `advisories.unmaintained` scope default now `workspace`, so fewer transitive unmaintained warnings on a scheduled advisories leg. Pin cargo-deny to a version when copying `deny.toml` examples written for 0.19 or earlier; a 0.22 binary may report new diagnostics in a previously green leg.

### 7. cargo-shear, machete, udeps (TOOL-05, DEP-07)
- cargo-shear 1.13.5 (2026-09-21, single-member workspace fix), 1.14.0 (2026-09-22, `keep-path-dependencies`), 1.14.1 (2026-11-13, `#[path]` fix, docs). Source: [shear releases](https://github.com/Boshen/cargo-shear/releases). Date years inferred from the 1.13.4 (2026-08-11) baseline ordering.
- README: `--fix`, `--deny-warnings`, `--format=json` (findings with `code` like `shear/unused_dependency`, `fixable`), exit codes 0/1/2, ignore metadata at `package.metadata.cargo-shear` and `workspace.metadata.cargo-shear` with `ignored` and `ignored-paths`. Source: [shear README](https://raw.githubusercontent.com/Boshen/cargo-shear/main/README.md). The README states machete "uses regex matching" and cargo-udeps "reportedly no longer works with recent Cargo versions and doesn't support workspaces", consistent with TOOL-05. It also now compares to Cargo's own `unused_dependencies` lint (compiler-based, skips dev-dependencies). That is a new alternative; TOOL-05's rustc `unused_crate_dependencies` clause refers to a different, older lint and stays correct.
- machete: v0.10.0 (2026-11-14) and v0.10.1 (11-15) per page ordering; release notes concern path walking, `--skip`, `renamed` table, metadata caching. Nothing states a switch away from regex matching. Verdict: gap not shown closed; could not determine the detection approach from release notes. Source: [machete releases](https://github.com/bnjbvr/cargo-machete/releases).
- udeps: no release after 2026-08-14 (newest v0.1.61, 29 Apr); nightly requirement not stated on the page, so "still nightly" is could-not-determine from this source, but nothing shows it closed. Source: [udeps releases](https://github.com/est31/cargo-udeps/releases).

### 8. nextest (crates-of-record Test runner row): unchanged invocation
Releases 0.9.144 (2026-09-10) to 0.9.152 (2026-11-13). `cargo nextest run` remains the command. Behaviour notes worth knowing: 0.9.145 profiles inherit `default-filter` from nearest ancestor; 0.9.148 setup-script `slow-timeout` no longer accepts `on-timeout = "pass"` and stress/fail-fast counting changed; 0.9.150 recording store format 3.0 and a security fix (GHSA-vc25-qg58-w57c) for `--rerun` with a malicious portable recording, with advice to set `nextest-version = "0.9.150"`. Source: [nextest changelog](https://nexte.st/changelog/) (first 100000 of 188813 characters read; later content is older releases), [nextest releases](https://github.com/nextest-rs/nextest/releases).

## Per-claim verdicts

| Claim | Verdict | Evidence | Date of change |
|---|---|---|---|
| REL-04 key names | unchanged | [dist config](https://axodotdev.github.io/cargo-dist/book/reference/config.html) | none |
| REL-04 attestation generation | unchanged (only `--repo` fix in generated commands) | [dist releases](https://github.com/axodotdev/cargo-dist/releases) | 2026-09-10 |
| REL-05 `pr-run-mode = "plan"` valid and default | unchanged | dist config | none |
| REL-06 OIDC crates.io, action `@v1` | unchanged; scope widened (GitLab.com, Only Mode) | [action releases](https://github.com/rust-lang/crates-io-auth-action/releases), [blog](https://blog.rust-lang.org/2026/01/21/crates-io-development-update) | 2026-01-21 (pre-window) |
| #14 `.2.17` zigbuild-only | unchanged | [zigbuild README](https://raw.githubusercontent.com/rust-cross/cargo-zigbuild/main/README.md), [cross CHANGELOG](https://raw.githubusercontent.com/cross-rs/cross/main/CHANGELOG.md) | none |
| CI-07, DEP-06 deny schema | unchanged for `licenses`, `bans`, `sources`; `advisories` gained fields and a default change | [cargo-deny CHANGELOG](https://github.com/EmbarkStudios/cargo-deny/blob/main/CHANGELOG.md) | 2026-11-16 to 2026-11-24 |
| CI-08, DEP-08 ignore format | unchanged and still valid; additive `expiry`, `allow` | same | 2026-11-16 |
| TOOL-05, DEP-07 shear vs machete/udeps | unchanged | shear README; machete and udeps release pages | none |
| Test runner `cargo nextest run` | unchanged | nextest changelog | none |

## Normative guidance candidates

All are optional; none is required by a broken claim.

1. Rule (CI-08 addendum): "`[advisories].ignore` entries may additionally set `expiry` as a backstop; the `REMOVE when` comment remains mandatory because it names a command, not a date." Rationale: cargo-deny 0.21.0 adds native expiry. Verification: `grep -n -E 'expiry' -- deny.toml` and every `ignore` still preceded by `REMOVE when`.
2. Rule (CI-07 addendum): "Pin the cargo-deny version in CI; read its CHANGELOG on each minor bump." Rationale: 0.21 to 0.22 changed default scope and added diagnostics within eight days. Verification: the workflow installs `cargo-deny` with an explicit version (`grep -n -E 'cargo-deny@[0-9]|cargo-deny.*--version|taiki-e/install-action' .github/workflows/*`).
3. Rule (REL-06 addendum, CONSIDER): "After the first manual publish, enable crates.io 'Trusted Publishing Only Mode' for the crate." Rationale: it makes REL-06 enforced by the registry rather than by grep. Verification: reading the crate settings page; no grep.
4. Rule (dist version): bump dist from 0.31.0 to 0.34.0 and regenerate the release workflow with `dist generate`. Rationale: baseline pin is three minors stale. Verification: `dist --version` and `git diff --exit-code` after `dist generate --mode ci`.

## AI-agent angle

- An agent copying a pre-0.21 `deny.toml` may set `git-fetch-with-cli`; it is now deprecated and a no-op. Check: `grep -n 'git-fetch-with-cli' deny.toml` is empty.
- An agent may invent a `pr-run-mode` value such as "check"; valid values are only `skip`, `plan`, `upload`. Check: grep the value against that list.
- An agent may emit `crates-io-auth-action@v2`; the current major is v1.

## Contested / evolving

- Cargo's built-in `unused_dependencies` lint (compiler-based) is emerging as a rival to shear; shear's README says it skips dev-dependencies. Trend: watch, do not change TOOL-05 yet. As of 2026-11-27.
- cargo-deny moved three minors in November after a four-month gap; expect further churn in `advisories`.

## Sources

| URL | What | Date/era | Why |
|---|---|---|---|
| https://github.com/axodotdev/cargo-dist/releases | dist releases | 2026-09 to 2026-11 | version delta |
| https://axodotdev.github.io/cargo-dist/book/reference/config.html | dist config reference | current | key names, defaults |
| https://github.com/EmbarkStudios/cargo-deny/blob/main/CHANGELOG.md | cargo-deny changelog | to 2026-11-24 | schema changes |
| https://github.com/Boshen/cargo-shear/releases | shear releases | 2026-09 to 2026-11 | behaviour |
| https://raw.githubusercontent.com/Boshen/cargo-shear/main/README.md | shear README | current | flags, comparison |
| https://github.com/rust-cross/cargo-zigbuild/releases | zigbuild releases | 2026-08 to 2026-11 | version list |
| https://raw.githubusercontent.com/rust-cross/cargo-zigbuild/main/README.md | zigbuild README | current | suffix syntax |
| https://github.com/cross-rs/cross/releases | cross releases | stale since 2023 | no suffix support |
| https://raw.githubusercontent.com/cross-rs/cross/main/CHANGELOG.md | cross changelog | current | #501 reverted |
| https://github.com/rust-lang/crates-io-auth-action/releases | action releases | v1.0.6 2026-10-21 | major unchanged |
| https://raw.githubusercontent.com/rust-lang/crates-io-auth-action/main/README.md | action README | current | `@v1` usage |
| https://blog.rust-lang.org/2026/01/21/crates-io-development-update | crates.io update | 2026-01-21 | GitLab, Only Mode |
| https://github.com/rust-secure-code/cargo-auditable/releases | auditable releases | 2026-09 to 2026-11 | no notes visible |
| https://github.com/CycloneDX/cyclonedx-rust-cargo/releases | cyclonedx releases | 2026-11 | spec versions |
| https://nexte.st/changelog/ | nextest changelog | to 2026-11-13 | invocation unchanged |
| https://github.com/bnjbvr/cargo-machete/releases | machete releases | 2026-11 | detection unclear |
| https://github.com/est31/cargo-udeps/releases | udeps releases | none in window | no activity |

Not fetched successfully: crates.io/docs/trusted-publishing (JavaScript shell, empty), raw crates.io docs path (404), nexte.st/docs/changelog (404), doc.rust-lang.org registry-authentication (no OIDC content).
