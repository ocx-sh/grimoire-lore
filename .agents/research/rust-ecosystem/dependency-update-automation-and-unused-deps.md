---
title: Dependency Update Automation and Unused-Dependency Gate
topic: Renovate configuration and the unused-dependency gate for grim/ocx/ocx-mirror
agent: rust-ecosystem-researcher
model: sonnet
date_researched: "2026-08"
sources_count: 20
scope: >
  Renovate's cargo manager (rangeStrategy selection, Cargo.lock handling,
  path/git dependency visibility, submodule-forked patch crates), a
  renovate.json baseline for grimoire derived from ocx/ocx-mirror, the choice
  between cargo-shear and cargo-machete (cargo-udeps ruled out for CI), the
  false-positive trap and its mechanical pre-removal check, and go/no-go on
  typos-cli, .editorconfig, and taplo.toml.
---

## Table of contents

1. [Renovate's cargo manager](#1-renovates-cargo-manager)
2. [Path/git dependencies and the vendored-fork submodules](#2-pathgit-dependencies-and-the-vendored-fork-submodules)
3. [ocx vs ocx-mirror renovate.json diff](#3-ocx-vs-ocx-mirror-renovatejson-diff)
4. [Automerge posture and MSRV-awareness](#4-automerge-posture-and-msrv-awareness)
5. [cargo-shear vs cargo-machete vs cargo-udeps](#5-cargo-shear-vs-cargo-machete-vs-cargo-udeps)
6. [The false-positive trap — empirical run against ocx](#6-the-false-positive-trap--empirical-run-against-ocx)
7. [typos-cli — empirical run against grimoire](#7-typos-cli--empirical-run-against-grimoire)
8. [.editorconfig](#8-editorconfig)
9. [taplo.toml](#9-taplotoml)
10. [The grimoire renovate.json](#10-the-grimoire-renovatejson)

## Summary

1. Renovate's cargo manager default is `rangeStrategy=auto`, which resolves to `widen` if the existing constraint contains a "less than" bound (e.g. `<2`), else `update-lockfile` — so ordinary caret/tilde ranges get lockfile-only bumps, not `Cargo.toml` edits.
2. `update-lockfile` means most upgrades touch only `Cargo.lock`, which is exactly right for a project that commits and ships its lockfile (grimoire does — reproducible builds depend on it).
3. Renovate's cargo manager explicitly marks any dependency with a `path = "..."` key `skipReason: 'path-dependency'` at extraction time — it never proposes an update for it, full stop. A `[patch.crates-io]` path-patched fork is invisible to this manager by construction, not by oversight.
4. The only way Renovate sees grimoire's two forked submodules (`external/docker_credential`, `external/rust-oci-client`) is the separate, opt-in `git-submodules` manager, which tracks the `.gitmodules` branch ref and bumps the pinned commit SHA — completely decoupled from the cargo manager's dependency graph. A crates.io-style "update oci-client" PR will never appear; only a submodule-bump PR will.
5. Because both submodules use branch tracking (not tags) in `.gitmodules`, Renovate's git versioning (which follows the tracked branch's latest commit) matches native `git submodule update --remote` semantics — no disruption risk from tag-vs-branch mismatch.
6. ocx-mirror's `renovate.json` is the better baseline: it's the only one of the two existing configs that enables `git-submodules`, and it already groups/labels the fork bump distinctly from routine cargo bumps. ocx's config, despite having the identical two submodules, does not enable the manager at all — a real gap, not a deliberate simplification (nothing in ocx's config explains the omission).
7. Neither ocx nor ocx-mirror sets `automerge` or `minimumReleaseAge` anywhere in `renovate.json`; the safe default (all PRs require human merge) is achieved by omission, not by an explicit `automerge: false`. grimoire should follow this precedent rather than invent new automerge policy.
8. Renovate's own guidance is that automerge is safe for lockfile-only maintenance and low-risk dev tooling, and should stay disabled where you want to read the changelog first — production dependencies "can work... but your project should have good test coverage." An OCI registry client handling auth tokens and TLS trust is not a place to automerge crate bumps.
9. `rust-toolchain.toml` is picked up by Renovate's separate `rust-toolchain` manager (datasource `rust-version`), enabled by default the moment the file is present — nothing in `config:recommended` disables it. Left unconfigured, Renovate will propose MSRV-channel bumps for grimoire's `1.95.0` pin without being asked.
10. Neither ocx, ocx-mirror, nor grimoire declares `rust-version` in `Cargo.toml`, so Renovate's cargo manager has zero MSRV signal to reason about compatibility from — MSRV-awareness in this family lives entirely in the `rust-toolchain` manager plus manual review, never automatically.
11. cargo-shear is the correct unused-dependency gate for this family: v1.13.4 shipped 2026-08-11 (three days before this research), cadence is roughly biweekly, and it autofixes (`--fix`) and offers `--format=github` for CI annotations. cargo-machete's last publish was 2026-04-15 (v0.9.2, four months stale relative to shear).
12. cargo-machete still has ~4x cargo-shear's cumulative crates.io downloads (2.66M vs 466K) — wider install-base familiarity is real but is an adoption-lag artifact, not a signal that shear is less correct; do not treat it as a tiebreaker.
13. cargo-shear's MSRV floor is rustc 1.95 (verified by a failed install attempt on 1.93.1) — this happens to match grimoire/ocx/ocx-mirror's pinned toolchain (`1.95.0`) exactly, so there is no toolchain conflict for this family specifically, but it is a live constraint worth re-checking on every toolchain bump.
14. cargo-udeps is correctly ruled out for CI: it requires nightly to *run* (compiles on stable, but execution needs nightly), and forking the pinned stable 1.95.0 toolchain for one gate is not worth the CI-matrix cost — confirmed directly from its README.
15. Run empirically against ocx today, cargo-shear flags 9 issues: `liblzma` (linked as a static C library at build time via a Cargo feature, never `use`d in Rust source) and the `starlark_syntax`/`starlark_map`/`starlark_derive` trio (pinned only to force lockfile version-consistency with `starlark`'s sealed-trait requirement, never imported directly by ocx's own code) — all four are real false positives, and ocx's own source comments say so ("ignored by cargo-machete below") even though no actual `[package.metadata.cargo-machete]` ignore table exists in the tree today.
16. The `starlark_*` false positive has a second, independent confirmation already baked into ocx: a `#[cfg(test)]` structural "engine-isolation firewall" test in `crates/ocx_lib/src/script.rs` asserts these three crate names appear nowhere in source outside one directory — proving by construction that they are legitimately absent from `use` statements yet legitimately required in `Cargo.toml`.
17. The mechanical pre-removal check for any flagged dependency is a single `rg` sweep across `**/*.rs` (not just non-test code) for the crate's use-name, its macro invocation form, and its `#[cfg(...)]`-gated occurrences, plus one more source that neither `rg` on `.rs` files nor either tool inspects: whether the dependency exists purely to pin a transitive version (visible only as a comment/rationale in `Cargo.toml`, never as code).
18. cargo-shear's allowlist mechanism is `[package.metadata.cargo-shear] ignored = ["crate-name"]` (or `[workspace.metadata.cargo-shear]`); cargo-machete's equivalent is `[package.metadata.cargo-machete] ignored = [...]` under `[package.metadata]` or `[workspace.metadata]`, plus a `renamed` sub-table for import-name mismatches.
19. typos-cli run against grimoire today (`typos --exclude target --exclude .cache --exclude external`) produces 199 findings, but the signal is dominated by one vendored, unmodifiable minified JS file (`docs/src/asciinema-player.min.js`, 53/199 hits) and one repo-wide legitimate spelling choice (`unparseable`, 58/199 hits) — neither `ocx`, `grim`, `ghcr`, nor `oci` triggers a false positive in the default dictionary, contrary to the assumption that those terms need an allowlist.
20. taplo-cli (the CLI crate, distinct from the `taplo` library crate that powers it) last published to crates.io 2025-05-23 (v0.10.0) — 15 months stale as of this research — but `ocx` already added its own `taplo.toml` in a recent, currently-uncommitted-to-history-summary commit (`0b154ee6`, "add JSON Schema generation and taplo auto-completion"), so the premise that ocx lacks one is now stale; the real open question is whether to keep depending on a dormant CLI crate at all, not whether ocx should adopt the config file.

## Findings

### 1. Renovate's cargo manager

Renovate's own readme for the manager states the rangeStrategy selection logic verbatim:

> "When using the default rangeStrategy=auto: If a 'less than' instruction is found (e.g. `<2`) then `rangeStrategy=widen` will be selected, Otherwise, `rangeStrategy=update-lockfile` will be selected. The `update-lockfile` default means that most upgrades will update `Cargo.lock` files without the need to change the value in `Cargo.toml`." — [readme.md, renovatebot/renovate](https://github.com/renovatebot/renovate/blob/main/lib/modules/manager/cargo/readme.md)

Concretely: grimoire's `Cargo.toml` uses ranges like `clap = { version = ">=4.5.57, <5", ... }` and bare `tokio = "1"`. The `clap` constraint contains an explicit `<5` bound, so Renovate widens it (edits `Cargo.toml`, e.g. `<5` → `<6` on a major bump) rather than touching only the lockfile; a bare `"1"` constraint has no upper bound token, so ordinary minor/patch bumps land as lockfile-only PRs with `Cargo.toml` untouched. This matters for a project that ships prebuilt binaries built against a committed lockfile: lockfile-only PRs are lower-risk (no public API surface change to the manifest) and are the right default for the bulk of the update volume.

The manager also handles private-registry auth by exporting `git insteadOf` directives from Renovate `hostRules` before running `cargo` commands to refresh the lockfile — not relevant to this family (crates.io only, no private registry), but confirms the manager does shell out to a real `cargo` binary rather than simulating resolution.

### 2. Path/git dependencies and the vendored-fork submodules

Reading the manager's extraction source directly (not the rendered docs, which omit this) settles the question precisely. `schema.ts` transforms every dependency table entry and assigns a `skipReason` before the dependency ever reaches the update pipeline:

```ts
if (path) {
  skipReason = 'path-dependency';
} else if (workspace) {
  skipReason = 'inherited-dependency';
} else if (git) {
  applyGitSource(dep, git, rev, tag, branch);
} else if (!version) {
  skipReason = 'invalid-dependency-specification';
}
```
— [`schema.ts`, renovatebot/renovate](https://github.com/renovatebot/renovate/blob/main/lib/modules/manager/cargo/schema.ts)

grimoire's own `[patch.crates-io]` block is exactly this shape:

```toml
[patch.crates-io]
docker_credential = { path = "external/docker_credential" }
oci-client = { path = "external/rust-oci-client" }
```

Both entries get `skipReason: 'path-dependency'` — Renovate's cargo manager extracts them (so they appear in its internal dependency list for debugging/dashboard purposes) but will never open a PR against either. This is a hard architectural fact of the manager, not a configuration gap: there is no `packageRule` that turns this back on, because the manager never assigns these a datasource-resolvable version in the first place — a `path` dependency has no registry version to compare against.

Note also the `git` branch of the same code (`applyGitSource`): if a Cargo.toml dependency were declared as `{ git = "https://...", branch = "..." }` directly (not via a submodule + path-patch), Renovate's cargo manager *would* track and bump it via a `git-refs` style comparison. grimoire's family deliberately does not use that form — it vendors the fork as a git submodule and patches to a local `path`, specifically (per the code comments in `Cargo.toml`) so the fork's own Cargo workspace stays buildable in isolation. That choice has the side effect of moving the entire update mechanism out of the cargo manager and into the git-submodules manager.

### 3. ocx vs ocx-mirror renovate.json diff

Both configs share the same `config:recommended` + `schedule:weekly` base, `semanticCommits: enabled`, and near-identical `packageRules` for `github-actions` and `cargo` (group, SHA-pin actions, `chore(deps)`/`ci(deps)` scoping). The material differences, read directly from the files in this tree:

| | ocx | ocx-mirror |
|---|---|---|
| `git-submodules.enabled` | absent (not enabled) | `true` |
| Submodule packageRule | n/a | present — `chore(deps)` scoped, separate from `actions`/`rust-deps` groups |
| `customManagers` (regex) | none | two — bump SHA-pinned actions baked into Rust-generated CI templates, and a `const OCX_CONTAINER_CLI_TAG` string constant |
| release.yml exclusion | explicit `enabled: false` rule for the cargo-dist-generated workflow | absent |
| npm | `managerFilePatterns` scoped to `website/` and a setup action | absent (no npm surface) |

ocx-mirror's `git-submodules` enablement is the one gap that matters for grimoire, since grimoire carries the identical two submodules ocx and ocx-mirror both vendor. ocx's omission looks like an oversight rather than a decision — there's no comment in ocx's `renovate.json` explaining why submodule tracking is off, and ocx has exactly the same forked-dependency shape that ocx-mirror already tracks. grimoire should copy ocx-mirror's `git-submodules` block, not ocx's silence on it.

grimoire needs neither of ocx-mirror's `customManagers` (both exist to patch Rust-source-embedded CI templates specific to ocx's pipeline-generator command, which grimoire doesn't have) nor ocx's `npm` scoping (grimoire's docs are mdBook, not an npm site — confirmed: `docs/book.toml` exists, no `package.json` anywhere outside `node_modules`/worktree scratch dirs). grimoire does need ocx's `release.yml` exclusion rule — its own `.github/workflows/release.yml` carries the identical `# This file was autogenerated by dist: https://axodotdev.github.io/cargo-dist` header, so the same floating-actions rationale applies verbatim.

### 4. Automerge posture and MSRV-awareness

Renovate's own guidance on automerge, read from the source:

> "Automerge often works well for `devDependencies`." ... "[lockfile maintenance is] probably the lowest risk type of update to automerge" ... "[automerge] can work for production `dependencies` too, but your project should have good test coverage." ... "Keep automerge disabled for updates where you want to read the changelogs or code before the merge." — [Automerge, docs.renovatebot.com](https://docs.renovatebot.com/key-concepts/automerge/)

Neither ocx nor ocx-mirror sets `automerge` anywhere — every PR requires a human merge today. grimoire and ocx are OCI registry clients handling credential storage, TLS trust configuration, and untrusted-server manifest parsing; that is precisely the "read the changelog first" category the docs describe, not the "tests will catch it" category. Recommendation: match the existing precedent (no automerge block at all) rather than introduce a new posture that diverges from the sibling repos for no stated reason. If a future maintainer wants staged trust, `minimumReleaseAge` (formerly `stabilityDays`) is the documented lever — "Suppress branch/PR creation for X days" after a release publishes, used to avoid landing a crate before the ecosystem has had time to flag a bad release — but it is not currently used anywhere in this family and shouldn't be introduced unilaterally for grimoire alone. [minimumReleaseAge, docs.renovatebot.com](https://docs.renovatebot.com/configuration-options/#minimumreleaseage)

On MSRV: Renovate ships a distinct `rust-toolchain` manager (datasource `rust-version`) that reads `rust-toolchain.toml`/`rust-toolchain` files and is enabled the moment the file is present — nothing in `config:recommended` opts it out. [rust-toolchain manager, docs.renovatebot.com](https://docs.renovatebot.com/modules/manager/rust-toolchain/) That means grimoire's `rust-toolchain.toml` (`channel = "1.95.0"`) is already a live update target the moment `renovate.json` extends `config:recommended` — with no explicit `packageRule` for it, a channel-bump PR will appear ungrouped, unscoped, and unlabeled next to routine crate bumps. Separately, none of grimoire/ocx/ocx-mirror declares `rust-version` in `[package]` or `[workspace.package]`, so the *cargo* manager itself has no MSRV floor to reason about at all — it will happily propose a crate bump that requires a newer rustc than the pinned toolchain, with nothing to stop it. MSRV-awareness in this family is therefore entirely manual + the `rust-toolchain` manager's own PR, never automatic cross-checking between the two.

### 5. cargo-shear vs cargo-machete vs cargo-udeps

| | cargo-shear | cargo-machete | cargo-udeps |
|---|---|---|---|
| Latest version (this research) | v1.13.4 | v0.9.2 | — |
| Last publish | 2026-08-11 | 2026-04-15 | — |
| crates.io downloads (cumulative) | 466,554 | 2,656,871 | — |
| Requires nightly to run | No (only `--expand`) | No | **Yes** |
| Autofix | `cargo shear --fix` | not in README (issue-only in the fetched content) | n/a |
| CI-friendly output | `--format=json`\|`github` | `--json` | n/a |
| Allowlist mechanism | `[package.metadata.cargo-shear] ignored = [...]` | `[package.metadata.cargo-machete] ignored = [...]` (+ `renamed` sub-table) | `[package.metadata.cargo-udeps.ignore] normal = [...]` |
| MSRV floor observed | rustc 1.95+ (confirmed by a failed `cargo install` on 1.93.1) | none declared in fetched README | n/a |

Sources: [cargo-shear README](https://github.com/Boshen/cargo-shear), [cargo-machete README](https://github.com/bnjbvr/cargo-machete), [cargo-udeps README](https://github.com/est31/cargo-udeps), release/commit dates via `gh api repos/{Boshen/cargo-shear,bnjbvr/cargo-machete}/releases`, download counts via `crates.io/api/v1/crates/{name}`.

**Choice: cargo-shear.** The release cadence gap is not cosmetic — cargo-machete's last publish predates this research by four months, while cargo-shear shipped three days prior; for a fast heuristic tool whose entire value is keeping pace with the crates.io ecosystem's macro/feature patterns, that recency gap compounds. cargo-shear's `--fix` and `--check-test-targets` also directly serve the "autonomous agent" use case this research feeds: an agent can run `cargo shear --fix` and get a minimal, mechanical diff rather than hand-editing `Cargo.toml`. cargo-machete's larger download count reflects longer market presence (created 2021 vs cargo-shear's 2024), not higher precision — and this research's own empirical run (§6) shows cargo-shear correctly flags real false-positive-shaped dependencies rather than staying silent, which is the behavior that matters for the agent-facing check in §6, regardless of which tool produced it. cargo-udeps is excluded per the task's own framing, confirmed directly from its README: "it needs Rust nightly to actually run" — forking the pinned stable 1.95.0 toolchain in CI for one gate is not worth it when grimoire already runs cargo-shear/clippy/tests against a single pinned stable toolchain.

**CI invocation** (mirrors the existing `rust:format:check` / `rust:clippy:check` Taskfile convention in `grimoire/taskfile.yml`):

```yaml
rust:shear:check:
  cmd: cargo shear --deny-warnings
```

wired into the existing `checkpoint` task alongside format/clippy/check. Local/agent autofix path: `cargo shear --fix`.

### 6. The false-positive trap — empirical run against ocx

Run today (`rustup run 1.95.0 cargo shear`, ocx workspace root):

```
shear/unused_dependency    liblzma           crates/ocx_lib/Cargo.toml:98
shear/unused_dependency    starlark_derive   crates/ocx_lib/Cargo.toml:106
shear/unused_dependency    starlark_map      crates/ocx_lib/Cargo.toml:105
shear/unused_dependency    starlark_syntax   crates/ocx_lib/Cargo.toml:104
shear/unused_workspace_dependency  glob              Cargo.toml:152
shear/unused_workspace_dependency  liblzma           Cargo.toml:139
shear/unused_workspace_dependency  starlark_derive   Cargo.toml:203
shear/unused_workspace_dependency  starlark_map      Cargo.toml:202
shear/unused_workspace_dependency  starlark_syntax   Cargo.toml:201
```
9 flagged; exit code 1. grimoire itself: **0 issues** (`cargo shear` exit 0) — grimoire's single-crate structure has no equivalent latent false positive today.

Grepping ocx's own source for the flagged crates confirms two distinct false-positive shapes, neither caught by a naive "does `cargo shear` say unused" read:

- **`liblzma`**: not `use`d in any `.rs` file (`grep -rln liblzma --include=*.rs`, excluding the vendored registry cache, returns only test files that reference the *feature*, not the crate path) — it's linked as a static C library via a Cargo `features = ["static"]` stanza and consumed at the FFI/link boundary, invisible to any source-grep-based tool.
- **`starlark_syntax`/`starlark_map`/`starlark_derive`**: never `use`d directly in ocx's own code at all — confirmed by ocx's *own* `#[cfg(test)]` "engine-isolation firewall" test in `crates/ocx_lib/src/script.rs`, which asserts these exact three token strings appear nowhere in source outside one directory. The Cargo.toml comment states the real reason: `allocative::Allocative` is a sealed supertrait bound that `starlark`'s `StarlarkValue` requires, and the whole `starlark_*` family must be pinned to the *same* exact version starlark itself links from crates.io — so the entries exist purely to force Cargo's resolver to a specific version, not because ocx code imports them.

This second shape is the more dangerous one for an autonomous agent: a plain `rg` for the crate name across `.rs` files (including macro bodies and `#[cfg(...)]`-gated code) will correctly report **zero hits** — because there genuinely are zero hits — and an agent that treats "no source references" as proof of dead weight will delete a version-pinning dependency that is silently load-bearing for resolver correctness. The mechanical pre-removal check must therefore be two-part, not one:

1. `rg -n --type rust '\b<crate_ident>\b' -- '**/*.rs'` across the *whole* tree including test modules and `#[cfg(...)]`-gated blocks (a plain grep across `.rs` files already covers cfg-gated code — cfg blocks are still valid Rust source, not stripped before grep sees them; the miss mode is macro-generated *identifiers* that never appear as source text, e.g. `#[derive(Foo)]` pulling in a proc-macro crate with no explicit `use`).
2. Read the surrounding comment block in `Cargo.toml` for the flagged entry. If it explains a version-pinning, sealed-trait, or build-time-link rationale (as ocx's does for all four hits here), the dependency is a deliberate phantom pin, not dead weight — allowlist it via `[package.metadata.cargo-shear] ignored = [...]`, do not delete it.

ocx's tree already carries the reasoning for this in prose (`// ignored by cargo-machete below` next to `liblzma.workspace = true`) but — checked directly — **no such `[package.metadata.cargo-machete]` or `[package.metadata.cargo-shear]` table exists anywhere in ocx's `Cargo.toml` today**. The comment describes an intention that was never wired up; ocx currently runs no unused-dependency gate at all (matches the task's stated ground truth), so this gap has never been exercised. Adopting cargo-shear in CI without first adding the `ignored` allowlist would immediately red the pipeline on day one.

### 7. typos-cli — empirical run against grimoire

Run today (`typos --exclude target --exclude .cache --exclude external --exclude '*.lock'`, grimoire root, typos-cli v1.49.0): **199 findings**, top offenders by frequency:

| word flagged | count | verdict |
|---|---|---|
| `unparseable` | 58 | not a typo — deliberate spelling used consistently across `src/error.rs`, `src/catalog/registry_catalog.rs`, `src/resolve/resolver.rs`, docs; typos-cli's dictionary prefers `unparsable` |
| `mis` | 38 | false positive from hyphenated compounds (`mis-aimed`) tokenizing as a bare fragment |
| `BA` | 29 | inside vendored `docs/src/asciinema-player.min.js` |
| `UNPARSEABLE`/`Unparseable` | 11 | same root word, different case |
| `modle`/`optins`/`redme`/`efort`/`alwyas`/`temprature`/`sumary`/`splitted`/`revew`/`optin`/`gae`/`entrys`/`ands`/`Ded`/`Ue`/`ue`/`Ot`/`ot`/`alis`/`seeked` | ~40 combined | mostly inside `docs/src/asciinema-player.min.js` minified tokens; a handful (`revew`, `ands`, `Ded`) are inside `src/catalog/search_match.rs` test strings deliberately exercising fuzzy-match/typo-tolerance behavior |
| `kuberentes` | 5 | **deliberate** — a doc-comment and test both construct this exact misspelling to demonstrate the search matcher's fuzzy-match *boundary* (substitutions/transpositions not tolerated) |

53 of 199 hits (27%) come from one file: `docs/src/asciinema-player.min.js`, a vendored, unmodifiable third-party asset. Excluding it via `[files] extend-exclude` removes over a quarter of the noise with zero risk.

Contrary to the task's premise, **none of `ocx`, `grim`, `ghcr`, or `oci` appears anywhere in the 199 findings** — typos-cli's default dictionary does not misfire on any of them. The allowlist grimoire actually needs is for the words the real run flagged, not the domain-jargon list assumed up front.

Recommended `_typos.toml` for grimoire:

```toml
[files]
extend-exclude = [
  "docs/src/asciinema-player.min.js",
]

[default.extend-words]
# Deliberate spelling choice, used consistently across src/ and docs/ —
# typos-cli's dictionary prefers "unparsable".
unparseable = "unparseable"
# Fragment of hyphenated "mis-aimed"/"mis-aimed-pattern" compounds; typos-cli
# tokenizes across the hyphen and flags the bare prefix.
mis = "mis"
# Deliberately misspelled test fixture: src/catalog/search_match.rs asserts
# fuzzy search does NOT tolerate this transposition. Keep the misspelling.
kuberentes = "kuberentes"
```
Config keys per [crate-ci/typos reference docs](https://raw.githubusercontent.com/crate-ci/typos/master/docs/reference.md) (`[default.extend-words]`, `[files] extend-exclude`, gitignore-syntax globs).

### 8. .editorconfig

No `.editorconfig` exists in any of grimoire/ocx/ocx-mirror today. The format itself is a stable, single-file, zero-dependency, universally-supported spec — [editorconfig.org](https://editorconfig.org/) documents `indent_style`, `indent_size`, `end_of_line`, `charset`, `trim_trailing_whitespace`, `insert_final_newline` as the core properties, with `root = true` optional (stops upward search). Rust source formatting is already fully owned by `rustfmt` (invoked via the existing `rust:format:check` task), so `.editorconfig`'s marginal value here is entirely for the *non-Rust* surface: Markdown docs, YAML workflows/Taskfiles, TOML configs, and the mdBook site — files no other committed tool currently normalizes for trailing whitespace or final-newline consistency.

### 9. taplo.toml

Ground-truth premise ("taplo.toml exists in grimoire and ocx-mirror but not ocx") does not hold against the tree as it stands today: `ocx/taplo.toml` is tracked in git (`git ls-files taplo.toml` returns it) and was added by a recent commit, `0b154ee6` ("feat(config): add JSON Schema generation and taplo auto-completion..."). All three repos now carry a `taplo.toml`, each wiring `[schema]` rules that point at `https://ocx.sh/schemas/{config,project,project-lock}/*.json` for `ocx.toml`/`ocx.lock`/config file completion in editors — a legitimate, still-current use independent of whether the `taplo-cli` binary crate itself is actively maintained. taplo.toml is consumed by the `taplo` **library** (via editor LSP integrations and the `taplo-cli` binary for CI formatting checks) — those are two different crates on crates.io. Checked directly: `taplo-cli` last published 2025-05-23 (v0.10.0, 15 months stale as of this research), but the schema-association files themselves have no expiry and cost nothing to keep. The open question is narrower than the task framed it: not "should `taplo.toml` exist," but "should CI depend on invoking the `taplo-cli` binary for `toml fmt`/`toml lint` checks" — none of the three repos' Taskfiles currently do (unverified whether any CI job calls `taplo` directly; out of scope for this research pass to audit every workflow file). No action needed on the config file itself; a `taplo-cli` staleness flag is worth a one-line note if/when someone wires a `taplo lint`/`taplo fmt --check` CI step.

## Normative guidance candidates

1. **Adopt the renovate.json in §10 for grimoire, extending `config:recommended` + `schedule:weekly`, matching ocx/ocx-mirror's existing baseline.** Rationale: consistency across the three sibling repos beats a bespoke config, and `config:recommended` already ships sane grouping/dashboard defaults. VERIFICATION: `cat grimoire/renovate.json | python3 -m json.tool` succeeds (valid JSON) and a Renovate dry-run (`renovate --dry-run=full grimoire-rs/grimoire` or the hosted GitHub App's next scheduled run) produces a Dependency Dashboard issue listing grouped `rust-deps`/`actions`/submodule PRs.
2. **Enable `git-submodules: { enabled: true }`, matching ocx-mirror not ocx.** Rationale: grimoire vendors the same two forked, patched submodules ocx-mirror already tracks; without this, `docker_credential`/`rust-oci-client` fork updates require a human to remember to check them manually. VERIFICATION: after enabling, a forced Renovate run against a repo with a stale submodule commit produces a `chore(deps): update <submodule>` PR bumping the pinned SHA in `.gitmodules`-referenced commit, not a crates.io version bump.
3. **Never automerge, and never group, the submodule packageRule with `rust-deps`.** Rationale: `oci-client`'s fork carries a security-relevant TLS trust-store fix (per grimoire's own `Cargo.toml` comment) — a fork bump must never land silently inside a batched routine-crate PR. VERIFICATION: `packageRules` entry for `matchManagers: ["git-submodules"]` has no `groupName` shared with the `rust-deps` cargo rule and sets no `automerge: true` anywhere in the file.
4. **Keep the cargo-dist `release.yml` exclusion rule** (`enabled: false` scoped to `.github/workflows/release.yml` under `github-actions`), copied verbatim from ocx. Rationale: grimoire's `release.yml` carries the identical `# autogenerated by dist` header and floats by cargo-dist's own regeneration, so Renovate bumping pinned action SHAs there is pure churn that a future `dist regenerate` will re-clobber anyway. VERIFICATION: `grep -q "autogenerated by dist" grimoire/.github/workflows/release.yml` (true today) and the packageRule's `matchFileNames` targets exactly that path.
5. **Adopt cargo-shear, not cargo-machete, as the unused-dependency gate, invoked as `cargo shear --deny-warnings` in CI and `cargo shear --fix` for local/agent remediation.** Rationale: three-day-old release vs. four-month-stale sibling tool, `--fix` autofix, `--format=github` CI annotations, and empirically-confirmed real signal against ocx today (§6). VERIFICATION: `cargo shear` exits 0 on grimoire today (confirmed) and the CI task fails (non-zero) if a new unused dependency is introduced without a `[package.metadata.cargo-shear] ignored` entry.
6. **Before any agent (or human) acts on a cargo-shear finding, require the two-part check from §6: an `.rs`-wide `rg` for the crate identifier, then a read of the `Cargo.toml` comment block for a version-pinning/link-time rationale.** Rationale: ocx's own tree proves both false-positive shapes exist today (`liblzma` link-time, `starlark_*` phantom version pin) and a source-grep-only check would greenlight deleting all four. VERIFICATION: running the check against ocx's current `liblzma`/`starlark_*` findings correctly recommends "allowlist, don't delete" for all four (reproducible via the commands in §6).
7. **Do not adopt cargo-udeps in CI.** Rationale: nightly-only execution against a project that pins a single stable toolchain everywhere else is a maintenance cost with no offsetting precision gain over cargo-shear for this codebase's scale. VERIFICATION: no `+nightly` invocation appears in any Taskfile or CI workflow across grimoire/ocx/ocx-mirror after this change.
8. **Add `typos-cli` as a CI gate with the `_typos.toml` from §7 (exclude the vendored minified JS, allowlist `unparseable`/`mis`/`kuberentes`).** Rationale: the empirical run shows a manageable, mostly-noise-free true-positive rate once the one vendored asset is excluded; catching real typos in a CLI tool's help text and docs is cheap and high-value. VERIFICATION: `typos` exits 0 on grimoire's tree after adding the config (currently exits non-zero with 199 findings; re-run after the config lands to confirm 0 or an explicitly-triaged residual).
9. **Add a minimal `.editorconfig` at each repo root** (`indent_style=space`, `indent_size=2` for YAML/TOML/JSON/MD, `end_of_line=lf`, `charset=utf-8`, `insert_final_newline=true`, `trim_trailing_whitespace=true`). Rationale: covers the non-Rust surface rustfmt doesn't touch, at zero maintenance cost (static file, no tool version to track). VERIFICATION: file parses under any EditorConfig-compliant editor/plugin; no CI enforcement needed (this is an editor-hint file, not a linter) unless `editorconfig-checker` is separately adopted (not recommended here — out of scope, no evidence of need).
10. **Leave `taplo.toml` as-is in all three repos; do not add a `taplo-cli` CI-enforced formatting gate.** Rationale: the schema-association use case is still current and cost-free, but the `taplo-cli` binary itself is 15 months stale — adding a CI dependency on a dormant tool for formatting enforcement (as opposed to editor schema hints) trades a real maintenance risk for marginal benefit `rustfmt`-equivalent tooling doesn't already cover. VERIFICATION: none needed — this is a "do nothing new" recommendation; revisit only if `taplo-cli` resumes publishing or a concrete TOML-formatting incident occurs.

## AI-agent angle

An agent handed a bare `cargo shear` (or `cargo machete`) failure will reach for the fastest fix: delete the flagged line from `Cargo.toml`. Two distinct failure modes follow from that reflex, both reproduced empirically in §6 against ocx today:

1. **Macro/derive/link-time usage with no `use` statement.** `liblzma` is never `use`d — it's linked as a static library via a Cargo feature flag consumed at build time, invisible to any source-text scan. The smallest mechanical check that catches this: search for the crate's *feature flags and build-script/link directives*, not just `use` statements — `grep -rn '"liblzma"\|liblzma::' --include=Cargo.toml --include=build.rs` in addition to the `.rs` sweep, since the load-bearing reference may live in a Cargo manifest feature list or a `build.rs`, not in application code at all.
2. **Version-pinning phantom dependencies.** `starlark_map`/`starlark_derive`/`starlark_syntax` have zero `use` sites anywhere in ocx's own code (confirmed both by direct grep and by ocx's own structural firewall test) yet are load-bearing for Cargo's resolver to pick a version-consistent set. The smallest mechanical check: before deleting, `git log -p -- Cargo.toml | grep -B5 -A5 '<crate-name>'` to surface the commit that added it — if the commit message or adjacent comment explains a version-lock/sealed-trait/API-surface rationale (as ocx's does, verbatim, for all three `starlark_*` entries), it is not dead weight.

The general pattern an agent should internalize: **"cargo-shear/cargo-machete said unused" is a hypothesis, not a fact.** The tools grep `use`-graph reachability from `cfg`-active code paths; they do not, and cannot, know about build-script-only consumption, feature-flag-only consumption (crates that only exist to be *enabled*, contributing no importable symbols — e.g. a `tokio` feature-bundle crate), or deliberate transitive-version pinning. Both cargo-shear and cargo-machete ship an escape hatch (`[package.metadata.cargo-{shear,machete}] ignored = [...]`) precisely because their authors know this; an agent that never reaches for that escape hatch and always deletes is discarding the tool authors' own safety valve.

## Contested / evolving

- **cargo-shear vs cargo-machete adoption momentum.** cargo-machete still holds the crates.io download lead by ~4x, and has four extra years of ecosystem presence (created 2021 vs 2024) — this research's recommendation (cargo-shear) is a bet on trajectory (release cadence, `--fix`, active maintainer) over installed base. Direction: cargo-shear's author (Boshen, also of oxc/rolldown) ships biweekly; if that cadence lapses, re-evaluate.
- **Renovate's `git-submodules` manager is still labeled beta** by Renovate's own docs ("Git Submodules functionality is currently in beta testing, so you must opt-in to test it") despite ocx-mirror already running it in production. Direction: no indication in the fetched docs of a promotion timeline; treat the beta label as a reason to keep the submodule packageRule narrow and reviewed, not as a reason to avoid it (ocx-mirror's existing usage is the de facto validation).
- **taplo-cli's maintenance status is genuinely ambiguous from crates.io alone.** A 15-month publish gap could mean abandonment or could mean the tool is feature-complete and stable (same shape of question this research answered differently for cargo-shear vs a hypothetically-stale cargo-machete). This research did not check the `taplo` GitHub repo's issue/PR activity directly — only the crates.io publish timestamp — so "stale" here means "stale on crates.io," not necessarily "abandoned upstream." Direction: worth a follow-up check of the `tamasfe/taplo` repo's commit history before any CI-enforcement decision.
- **The task's "domain jargon needs a typos-cli allowlist" premise did not survive contact with the real tool.** None of `ocx`/`grim`/`ghcr`/`oci` triggered a false positive in the empirical run. This isn't an evolving debate so much as a stale assumption corrected by evidence — flagged here so a future pass doesn't re-introduce unnecessary allowlist entries "just in case."

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [renovatebot/renovate — cargo manager readme.md](https://github.com/renovatebot/renovate/blob/main/lib/modules/manager/cargo/readme.md) | Primary source, official manager docs (source of truth for docs.renovatebot.com) | current main branch, fetched 2026-08 | Exact quote on `rangeStrategy=auto` selection logic |
| [renovatebot/renovate — cargo/schema.ts](https://github.com/renovatebot/renovate/blob/main/lib/modules/manager/cargo/schema.ts) | Primary source, TypeScript implementation | current main branch, fetched 2026-08 | Ground truth for `path`/`git`/`workspace` dependency `skipReason` handling — settles the "can Renovate see the patched fork" question definitively |
| [renovatebot/renovate — cargo/extract.ts](https://github.com/renovatebot/renovate/blob/main/lib/modules/manager/cargo/extract.ts) | Primary source, TypeScript implementation | current main branch, fetched 2026-08 | Confirms `[workspace.dependencies]`, `[target.*.dependencies]`, and `Cargo.lock` extraction paths |
| [docs.renovatebot.com/modules/manager/cargo/](https://docs.renovatebot.com/modules/manager/cargo/) | Official rendered docs | current, fetched 2026-08 | rangeStrategy default + Cargo.lock handling narrative |
| [docs.renovatebot.com/modules/manager/git-submodules/](https://docs.renovatebot.com/modules/manager/git-submodules/) | Official rendered docs | current, fetched 2026-08 | Confirms opt-in/beta status, git-versioning default, tag-vs-branch caveat |
| [docs.renovatebot.com/modules/manager/rust-toolchain/](https://docs.renovatebot.com/modules/manager/rust-toolchain/) | Official rendered docs | current, fetched 2026-08 | Confirms `rust-toolchain.toml` is a separate, default-on manager (`rust-version` datasource) |
| [docs.renovatebot.com/key-concepts/automerge/](https://docs.renovatebot.com/key-concepts/automerge/) | Official rendered docs | current, fetched 2026-08 | Automerge risk-tiering guidance quoted verbatim |
| [docs.renovatebot.com/configuration-options/#minimumreleaseage](https://docs.renovatebot.com/configuration-options/#minimumreleaseage) | Official rendered docs | current, fetched 2026-08 | `minimumReleaseAge` (formerly `stabilityDays`) semantics |
| [docs.renovatebot.com/presets-config/#configrecommended](https://docs.renovatebot.com/presets-config/#configrecommended) | Official rendered docs | current, fetched 2026-08 | What `config:recommended` actually turns on (dashboard, grouping, no automerge) |
| [Boshen/cargo-shear](https://github.com/Boshen/cargo-shear) | Primary source, tool README | fetched 2026-08, latest release v1.13.4 (2026-08-11) | CLI flags, `--fix`, allowlist mechanism, nightly-not-required confirmation |
| [bnjbvr/cargo-machete](https://github.com/bnjbvr/cargo-machete) | Primary source, tool README | fetched 2026-08, latest release v0.9.2 (2026-04-15) | CLI flags, allowlist/renamed mechanism, adoption stats context |
| [est31/cargo-udeps](https://github.com/est31/cargo-udeps) | Primary source, tool README | fetched 2026-08 | Verbatim nightly-required quote used to justify ruling it out |
| [crate-ci/typos — docs/reference.md](https://raw.githubusercontent.com/crate-ci/typos/master/docs/reference.md) | Primary source, official config reference | fetched 2026-08, typos-cli v1.49.0 | Exact `_typos.toml` keys (`extend-words`, `extend-identifiers`, `files.extend-exclude`) |
| [editorconfig.org](https://editorconfig.org/) | Primary source, spec homepage | fetched 2026-08 | Canonical property list and minimal example |
| `crates.io/api/v1/crates/{cargo-shear,cargo-machete,taplo-cli,typos-cli}` | Primary source, crates.io registry API | queried 2026-08-14 | Download counts and `updated_at`/`newest_version` used to quantify recency/adoption claims in §5 and §9 |
| `gh api repos/{Boshen/cargo-shear,bnjbvr/cargo-machete}/releases` and `/commits` | Primary source, GitHub API | queried 2026-08-14 | Exact release dates backing the "3 days old vs 4 months stale" claim |
| Empirical `cargo shear` run against `ocx` and `grimoire` (this session) | Primary, reproducible locally | run 2026-08-14, cargo-shear v1.13.4 on rustc 1.95.0 | Real false-positive data (§6), not simulated |
| Empirical `typos` run against `grimoire` (this session) | Primary, reproducible locally | run 2026-08-14, typos-cli v1.49.0 | Real finding distribution (§7), corrects the task's jargon-allowlist premise |
| `ocx/renovate.json`, `ocx-mirror/renovate.json` (this tree) | Primary, in-repo config | as committed, read 2026-08-14 | Direct diff source for §3 |
| `ocx/Cargo.toml`, `grimoire/Cargo.toml`, `ocx-mirror/Cargo.toml`, `.gitmodules` files (this tree) | Primary, in-repo config | as committed, read 2026-08-14 | `[patch.crates-io]` shape and submodule branch-tracking confirmation for §2 |

## 10. The grimoire renovate.json

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:recommended",
    "schedule:weekly"
  ],
  "semanticCommits": "enabled",
  "git-submodules": {
    "enabled": true
  },
  "packageRules": [
    {
      "description": "release.yml is cargo-dist-generated and floats by design — never let Renovate bump its actions",
      "matchManagers": ["github-actions"],
      "matchFileNames": [".github/workflows/release.yml"],
      "enabled": false
    },
    {
      "description": "GitHub Actions — group, SHA-pin, ci(deps) prefix",
      "matchManagers": ["github-actions"],
      "groupName": "actions",
      "semanticCommitType": "ci",
      "semanticCommitScope": "deps",
      "pinDigests": true
    },
    {
      "description": "Cargo crates — group, chore(deps) prefix. Path-patched forks (docker_credential, oci-client) are invisible here by construction — see the git-submodules rule below.",
      "matchManagers": ["cargo"],
      "groupName": "rust-deps",
      "semanticCommitType": "chore",
      "semanticCommitScope": "deps"
    },
    {
      "description": "docker_credential / rust-oci-client forks — the only channel that sees the [patch.crates-io] path dependencies at all. oci-client's fork carries the TLS trust-store security fix: never group with routine crate bumps, never automerge.",
      "matchManagers": ["git-submodules"],
      "groupName": "forked-submodules",
      "semanticCommitType": "chore",
      "semanticCommitScope": "deps"
    },
    {
      "description": "rust-toolchain.toml MSRV pin — a build-wide decision, not a routine dependency bump. Re-check cargo-shear's own MSRV floor before merging (it tracks current stable).",
      "matchManagers": ["rust-toolchain"],
      "groupName": "toolchain",
      "semanticCommitType": "chore",
      "semanticCommitScope": "toolchain"
    }
  ]
}
```

No `automerge`, no `minimumReleaseAge` — matches ocx/ocx-mirror's existing posture by omission (see §4). No `npm` manager scoping (grimoire's docs are mdBook, not an npm site) and no `customManagers` (ocx-mirror's two regex managers exist only for its Rust-source-embedded pipeline-generator templates, which grimoire doesn't have).
