---
title: Spillover check, rust-quality findings addressed to rust-cargo
target: rust-cargo
date_researched: 2026-11-27
model: sonnet
sources_fetched: 14
---

# Spillover check for rust-cargo

Eleven items came from the rust-quality pipeline (decision file `.agents/research/refresh-2026-11/rust-quality.md`, artifacts under `.agents/research/refresh-2026-11/rust-quality/`). Target files read: `rules/rust-cargo.md` and `skills/rust-cargo-reference/` (SKILL.md, gates.md, crates-of-record.md, checks/). The target is already partly refreshed: it names Cargo 1.100, `[workspace.lints.cargo]`, `cargo::unused_dependencies` and the publish-age cooldown.

Primary sources used (all fetched on 2026-11-27):
- Cargo changelog, https://doc.rust-lang.org/cargo/CHANGELOG.html (Cargo 1.99 dated 2026-10-01, Cargo 1.100 dated 2026-11-12)
- Rust RELEASES.md, https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md (Version 1.99.0 2026-10-01, Version 1.100.0 2026-11-12)
- Rust 1.100.0 announcement, https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/ (2026-11-12)
- cargo-install manual, https://doc.rust-lang.org/cargo/commands/cargo-install.html
- Cargo lints reference, https://doc.rust-lang.org/cargo/reference/lints.html
- cargo-deny CHANGELOG, https://github.com/EmbarkStudios/cargo-deny/blob/main/CHANGELOG.md
- cargo-auditable CHANGELOG, https://github.com/rust-secure-code/cargo-auditable/blob/master/cargo-auditable/CHANGELOG.md
- cargo-audit 0.23.0 release page, https://github.com/rustsec/rustsec/releases/tag/cargo-audit%2Fv0.23.0
- actions/attest README, https://github.com/actions/attest/blob/main/README.md

## 1. cargo install uses the packaged Cargo.lock; `--locked` is a no-op

Item: since Cargo 1.100 (2026-11-12) `cargo install` uses the packaged lockfile by default and `--locked` is a no-op; check any rust-cargo claim that install ignores the lockfile.

Verdict: confirmed by primary source. RELEASES.md Version 1.100.0 (2026-11-12), Cargo section: "cargo-install: now uses the existing lockfile in the `.crate` tarball by default. `--locked` in cargo install becomes a no-op." The cargo-install manual says the same ("By default, Cargo uses the Cargo.lock file included with the package if it is available ... The --locked flag does not currently change dependency resolution for cargo install."). The Cargo changelog page for 1.100 does not list it, so RELEASES.md is the source of record.

Target: no claim that install ignores the lockfile. The only `cargo install` statement is in CI-13 (`rules/rust-cargo.md`): "Upstream calls it no complete defence, and `cargo install` ignores it." That is about the publish-age cooldown, and the 1.100 announcement confirms it: "`cargo install` ignores the minimum publish age, for both the installed crate and its dependencies." CI-04 says: "Every `cargo` invocation in CI carries `--locked`. Without it CI resolves a dependency set the lockfile does not describe". That stays true for build, check, clippy, test and nextest. The gate in `skills/rust-cargo-reference/gates.md` (block CI-04) only matches `cargo [bctn][a-z]+`, so `cargo install` is not flagged.

Smallest change: none required. Optional, one clause appended to the CI-04 rule text: "(`cargo install` is exempt: since Cargo 1.100 it uses the packaged lockfile and `--locked` is a no-op.)"

## 2. Cargo's own linting: `[lints.cargo]`, `missing_lints_inheritance`, `unused_dependencies`

Item: Cargo 1.100 stabilized `[lints.cargo]`, `cargo::missing_lints_inheritance` (warn by default) and `unused_dependencies`.

Verdict: confirmed by primary source. RELEASES.md 1.100.0 Cargo section: "Introduced Cargo's own linting system: some Cargo warnings are now emitted as lints that users can control in the `[lints.cargo]` table. This includes a new built-in unused dependency check via the `cargo::unused_dependencies` lint." The Cargo lints reference lists `missing_lints_inheritance` and `unused_dependencies` under "Warn-by-default".

Target already correct. LINT-01 (`rules/rust-cargo.md`): "(and `[workspace.lints.cargo]`, stable since Cargo 1.100)". TOOL-05: "Keep `cargo shear` beside Cargo 1.100's `cargo::unused_dependencies` lint, which never checks `[dev-dependencies]` and covers only the packages selected on the command line." The target does not name `missing_lints_inheritance`; LINT-01 requires `[lints] workspace = true` in every member, which is what that lint enforces.

Smallest change: none required. Optional, appended to LINT-01: "On Cargo 1.100+ the warn-by-default `cargo::missing_lints_inheritance` lint flags a member that omits `[lints] workspace = true`."

## 3. `registry.global-min-publish-age` (dependency cooldown)

Item: Cargo 1.100 adds `registry.global-min-publish-age`, relevant to dependency-gate policy.

Verdict: confirmed by primary source. RELEASES.md 1.100.0: "Introduced minimum publish age configurations, also known as dependency cooldowns. When the relevant config is set, the resolver ignores versions published more recently than that, unless they are already in `Cargo.lock`." The announcement names `global-min-publish-age` in `.cargo/config.toml`.

Target already correct. CI-13: "Once TOOL-01's pin is 1.100 or later, set `[registry] global-min-publish-age = "3 days"` (or longer) in the workspace `.cargo/config.toml` ...". Sources list cites the 1.100.0 announcement. No change.

## 4. Cargo 1.99 disables incremental compilation by default when `CI` is set

Item: Cargo 1.99 disables incremental compilation by default when CI is set; matters for CI job design and caching.

Verdict: confirmed by primary source. Cargo changelog 1.99 (2026-10-01): "Incremental compilation is now disabled by default when running in CI. CI is detected via the `CI` environment variable." Also in RELEASES.md 1.99.0 Compatibility Notes.

Target: says nothing about incremental compilation (no occurrence of "incremental" in `rules/rust-cargo.md` or the reference skill). The nearest text is CI-09: "Restrict `Swatinem/rust-cache` saves to trunk (`save-if: github.ref == 'refs/heads/main'`) — PR branches otherwise evict the shared cache under the per-repo size cap." The rule is not contradicted.

Smallest change: none required. Optional, appended to CI-09: "Cargo 1.99+ turns incremental compilation off when `CI` is set, so a CI cache holds no incremental state; do not set `CARGO_INCREMENTAL=1` to compensate."

## 5. Cargo 1.99 built-in `debug` profile and edition-2024 `default-features` override

Item: Cargo 1.99 adds a built-in `debug` profile (identical to `dev` today) and lets edition-2024 workspaces override inherited `default-features`; the release-profile text should watch for `dev` losing debuginfo.

Verdict: confirmed by primary source. Cargo changelog 1.99: "Add a new built-in profile `debug`. This is a preparation for transitioning the `dev` profile away from debugging to give a saner default for faster development iterations. Currently there is no difference between `dev` and `debug` profiles." And: "Workspace members on edition 2024 or later can now override an inherited workspace dependency's `default-features` field ... On earlier editions, `default-features = false` is ignored with a warning." The "watch for dev losing debuginfo" part is the pipeline's inference from "transitioning the `dev` profile away from debugging"; it is not a dated commitment.

Target: says nothing on either. REL-01 covers only `[profile.dist]`: "Ship from an explicit named profile (`[profile.dist]`), never Cargo's `release` defaults". No rule touches `dev`. `skills/rust-cargo-reference/crates-of-record.md` line 69 says "The regression to watch is a transitive default-features union pulling the C backend back in", which stays correct.

Smallest change: none required. Optional, one sentence in the crates-of-record gzip row or a DEP rule: "On edition 2024 a member may write `dep = { workspace = true, default-features = false }` to turn off features the workspace enables; on older editions Cargo ignores it with a warning."

## 6. Cargo 1.99 warns on hyphenated lint names and on `[lints]` in a virtual workspace

Item: Cargo 1.99 warns on hyphenated lint names in `[lints]` (`unexpected-cfgs` must be `unexpected_cfgs`) and on `[lints]` in a virtual workspace.

Verdict: confirmed by primary source, with one correction. Cargo changelog 1.99: "Cargo now warns on hyphenated lint names in the `[lints]` table, e.g. `unexpected-cfgs` is deprecated in favor of `unexpected_cfgs`. Hyphenated names will not work in a future edition." For the virtual workspace the changelog says "Add a suggestion when adding `[lints]` to a virtual workspace to use `[workspace.lints]` instead", which is a suggestion on an existing diagnostic, not a new warning. The item overstates that half.

Target: LINT-01 already says "`[workspace.lints.rust]` / `[workspace.lints.clippy]`" and requires members to carry `[lints] workspace = true`; the Lints Stanza uses underscore names. No hyphenated lint names appear in the target's examples.

Smallest change: none required. Optional, appended to LINT-01: "Lint names use underscores (`unexpected_cfgs`); Cargo 1.99+ warns on the hyphenated form."

## 7. Build-dir layout is not a stable interface

Item: the Cargo 1.100 build-dir layout is declared not a stable interface; CI cache keys and artifact paths should use Cargo JSON messages, not directory names.

Verdict: confirmed by primary source. Cargo changelog 1.100 (2026-11-12): "Cargo now uses a new directory layout for intermediate build artifacts ... Tools that inspect the build directory may need to use Cargo's JSON messages to locate build artifacts instead of relying on the build directory layout. The layout is not a stable interface and is subject to change." The "CI cache keys" extension is the pipeline's inference. The 1.100 announcement adds "The `build-dir` now consistently applies the build-configuration hash to all content."

Target: says nothing on the build-dir layout. CI-09 and the `Swatinem/rust-cache` references use no directory paths. No rule in `rules/rust-cargo.md` or `gates.md` hard-codes `target/` subdirectories.

Smallest change: none required. Optional, one sentence in CI-09: "Locate build outputs through Cargo's JSON messages, never by a path under `target/` or the build directory; the 1.100 layout is not a stable interface."

## 8. cargo-deny 0.21.0, 0.22.0, 0.22.1 changes

Item: the 0.22.0 default for `unmaintained` is now `workspace`; 0.21.0 added `ignore-expiry`, per-entry `expiry` and `ignore.allow`; 0.22.1 added `patched`; `git-fetch-with-cli` is deprecated; config is also searched under `.config`.

Verdict: confirmed by primary source, with one nuance. cargo-deny CHANGELOG: 0.22.1 (2026-11-24) "added the `patched` diagnostic and `advisories.patched` configuration"; 0.22.0 (2026-11-19) "changing `advisories.unmaintained` to default to `workspace` scope instead of `all`"; 0.21.0 (2026-11-16) added `advisories.ignore-expiry`, `advisories.ignore.expiry`, `advisories.ignore.allow`, and "searching for configuration in `.config` as well", and deprecated `advisories.git-fetch-with-cli` "which has done nothing since PR#830". So the deprecated key was already inert.

Target: names none of these. Relevant text, CI-07: "Split `cargo deny`: `check bans licenses sources` blocks the PR; `check advisories` is non-blocking on PRs and blocking on a schedule." CI-08: "Every `[advisories].ignore` entry and every non-default `[licenses].allow` entry carries an inline comment stating the machine-checkable condition for its removal." `skills/rust-cargo-reference/crates-of-record.md` DEP-08 already says: "cargo-deny 0.21's per-entry `expiry` may back the comment ..." (target is already correct on 0.21 expiry). No `unmaintained` scope statement exists, so the 0.22.0 default change affects no sentence. The pipeline's SEC-25 floor (cargo-deny 0.22.1) has no counterpart in the target.

Smallest change: none required. Optional, one sentence appended to CI-08: "cargo-deny 0.22.0 narrowed the default `advisories.unmaintained` scope to `workspace`, so a transitive unmaintained crate no longer fails the check unless `all` is set; 0.22.1's `advisories.patched` warns when an ignored advisory has a compatible patch."

## 9. cargo-audit 0.23.0, cargo-auditable 0.7.8, actions/attest permissions

Item: cargo-audit 0.23.0 adds `update-db` and fixes the advisory-db lock file name; cargo-auditable 0.7.8 is needed for Windows builds on Rust 1.100+; GitHub attestations now use `actions/attest@v4` with `id-token: write`, `contents: read` and `attestations: write`.

Verdict: confirmed by primary source for the first two parts; the third part is partly wrong. 
- cargo-audit 0.23.0, release page (published "10 Nov", the page text does not state the year; the pipeline records 2026-11-10): "audit: add update-db subcommand" and "fix(cargo-audit)!: Remove extra dot in `advisory-db..lock`".
- cargo-auditable 0.7.8 (2026-11-25): "Fixed audit data not being embedded on Windows on Rust 1.100 or later in large projects due to Cargo running into command-line argument length limit and passing arguments as an argfile." This is a fix for large projects, so "needed for Windows builds on Rust 1.100+" is broader than the source.
- actions/attest README: the main instructions list `id-token: write`, `attestations: write` and `artifact-metadata: write`. A second, later example lists `id-token: write`, `contents: read`, `attestations: write`. The examples use `actions/attest@v4`.

Target: REL-04 already states the README's main list: "the release workflow runs an attestation step whose job grants `id-token: write`, `attestations: write` and `artifact-metadata: write` (the three the `actions/attest` README lists)". It names no cargo-audit or cargo-auditable version.

Verdict for the third part: target already correct. Smallest change for the first two: none required. Optional, appended to REL-04: "Use cargo-auditable 0.7.8 or later when building Windows artifacts on Rust 1.100+, so audit data is embedded for large dependency graphs."

## 10. Release matrix: target tier changes

Item: 1.100 target tiers changed: `i686-pc-windows-gnu` is Tier 2 without host tools, `windows-gnullvm` links libunwind statically, and `riscv64-unknown-linux-musl` is Tier 2 with host tools (1.99).

Verdict: confirmed by primary source. RELEASES.md 1.100.0 (2026-11-12) Platform Support: "`i686-pc-windows-gnu` is now a tier 2 without host tools target". Compatibility Notes: "windows-gnullvm: always link libunwind statically". RELEASES.md 1.99.0 (2026-10-01) Platform Support: "Promote `riscv64-unknown-linux-musl` to Tier 2 with host tools". The 1.100 and 1.99 blog posts do not mention these; RELEASES.md does.

Target: names no tier and no Windows or riscv64 target. Closest: REL-03, "Every Linux artifact is static-musl or has a documented glibc floor." and CI-10, "Unit tests run natively on **every** OS that is a release target". Neither is contradicted.

Smallest change: none required. Optional, a sentence in REL-03: "`riscv64-unknown-linux-musl` is Tier 2 with host tools since Rust 1.99, so it can be built and tested natively rather than cross-only."

## 11. rust-ecosystem.md consolidation cites SEC-07, SEC-25, SEC-26, SEC-29, SEC-36, PLAT-30, PERF-18, PERF-25

Item: rust-ecosystem.md cites these rule IDs, which the rust-quality delta changes, so its copies need the same corrections.

Verdict: target already correct (nothing to change in the rust-cargo files). `rust-ecosystem.md` is `.agents/research/rust-ecosystem.md`, a research file, and is not part of the rust-cargo pair. Neither `rules/rust-cargo.md` nor any file under `skills/rust-cargo-reference/` cites SEC-07, SEC-25, SEC-26, SEC-29, SEC-36, PLAT-30, PERF-18 or PERF-25 as rule IDs. The only matches for SEC/PLAT/PERF in the target are inside RUSTSEC advisory identifiers in `crates-of-record.md`. The rust-ecosystem copy does cite them, for example line 427, "`--locked` on every cargo invocation in CI, scripts and docs | **CI-04**, **SEC-26**", line 412 "`tar >= 0.4.45`, `zip >= 2.3.0` version floors | **SEC-07**", and line 416 "**REL-04**, **SEC-29**". Correcting that file belongs to whoever owns rust-ecosystem.md, outside this check's write scope.

Smallest change: none in the rust-cargo target. In `.agents/research/rust-ecosystem.md`, the SEC-26 row (line 427) should note that `cargo install` is exempt from `--locked` since Cargo 1.100.
