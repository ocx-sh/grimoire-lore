---
title: Delta update - rules_rust, crate_universe, rules_rs, hermeticbuild fork, gazelle_rust
pair: bazel-quality
date_researched: 2026-11-27
window_start: 2026-09-06
model: sonnet
sources_fetched: 16
---

# Delta update: rules_rust, crate_universe, rules_rs, gazelle_rust

Scope: changes after each row's baseline, up to 2026-11-27. The rules_rust and crate_universe rows are measured from 2026-09-06 (rules_rust 0.74.0). The rules_rs rows BZL-RUST-37 to BZL-RUST-40 are measured from 2026-10-21 (rules_rs 0.1.3). Everything else stays as researched. All facts below were read from GitHub API responses and file contents at the named tags or branches, not from search snippets.

## Summary

- Newest rules_rust is 0.75.0, published 2026-10-26 ([release](https://github.com/bazelbuild/rules_rust/releases/tag/0.75.0)). It is also on the BCR ([metadata](https://github.com/bazelbuild/bazel-central-registry/blob/main/modules/rules_rust/metadata.json)). It supersedes 0.74.0 as "current" in every row that cites 0.74.0.
- Newest rules_rs is 0.2.4, published 2026-11-12 ([release](https://github.com/hermeticbuild/rules_rs/releases/tag/v0.2.4)). Between 0.1.3 and 0.2.4 the 0.2.0 release requires Bazel 8.7 or newer ([#324](https://github.com/hermeticbuild/rules_rs/pull/324)).
- The 0.75.0 release notes list zero crate_universe entries. The header claim "seven of roughly 32 entries ... crate_universe correctness fixes" was about 0.74.0 and is historical; 0.75.0 has about 45 entries and none are crate_universe. The repair continues on main after 0.75.0 (see Findings 3).
- The ruleset docs still print `CARGO_BAZEL_REPIN=1 bazel sync --only=...` at tag 0.75.0 and on main. Non-Negotiable 15 and BZL-RUST-03 stay correct.
- No crate_universe repin or lockfile behaviour change was found in 0.75.0. Unreleased main (2026-11-23) deprecates the root hub aliases and (2026-11-24) turns license metadata on by default, which changes generated BUILD files, not the repin command.
- rules_rs `rust_doc_test` still passes `--discard-stdout-on-success` in the hermeticbuild fork at main (read 2026-11-27). BZL-RUST-40 is unchanged.
- rules_rs 0.2.1 now registers `@default_rust_toolchains//...` itself ([#325](https://github.com/hermeticbuild/rules_rs/pull/325)). `toolchains.toolchain(version = ...)` remains the documented pin; nothing in it changed, but the "register toolchains" wording in BZL-RUST-38 and the rules_rs block deserves a one-line note.
- gazelle_rust has no new release, tag or commit since the baseline. BCR still lists only 0.1.0. BZL-RUST-19 stands.
- Windows disclaimer in rules_rust docs is unchanged at 0.75.0; BZL-TEST-24 remains open.

## Findings

### 1. Versions

| Component | Baseline | Newest as of 2026-11-27 | Date | Source |
|---|---|---|---|---|
| rules_rust | 0.74.0 (2026-08-28) | 0.75.0 | 2026-10-26 | [release](https://github.com/bazelbuild/rules_rust/releases/tag/0.75.0) |
| rules_rust_prost and siblings | 0.74.0 | 0.75.0, same version as rules_rust | 2026-10-26 | same release notes list `rules_rust_prost`, `_bindgen`, `_mdbook`, `_pyo3`, `_wasm_bindgen` at 0.75.0 |
| rules_rs | 0.1.3 (2026-10-20) | 0.2.4 | 2026-11-12 | [releases](https://github.com/hermeticbuild/rules_rs/releases) |
| hermeticbuild/rules_rust source release | f263e89 (2026-10-26 was the first after #87) | 0ff2996 | 2026-11-12 | [source tag](https://github.com/hermeticbuild/rules_rust/releases/tag/source-0ff2996ca9267312baab2c2c16040561a8a649bb) |
| gazelle_rust | 0.1.0 | 0.1.0 | 2026-05-05 | [releases](https://github.com/Calsign/gazelle_rust/releases), [BCR metadata](https://github.com/bazelbuild/bazel-central-registry/blob/main/modules/gazelle_rust/metadata.json) |
| Rust stable | 1.95.0 | 1.100.0 | 2026-11-12 | [rust-lang/rust releases](https://github.com/rust-lang/rust/releases) |

rules_rs 0.2.0 to 0.2.4 are the only releases after 0.1.3 (0.2.2 and 0.2.3 compare links in their notes show a wrong base tag; treat the PR lists as authoritative). rules_rs bumped its bundled rules_rust twice ([#318](https://github.com/hermeticbuild/rules_rs/pull/318), source f263e89; [#347](https://github.com/hermeticbuild/rules_rs/pull/347), source 9fe9776).

### 2. rules_rust 0.75.0 changes that touch the pair

From the [0.75.0 notes](https://github.com/bazelbuild/rules_rust/releases/tag/0.75.0):

- Toolchains: "Add a Cargo toolchain" ([#4339](https://github.com/bazelbuild/rules_rust/pull/4339)), `*_toolchain_alias` rules ([#4335](https://github.com/bazelbuild/rules_rust/pull/4335)), C++ toolchain resolved through rules_cc ([#4347](https://github.com/bazelbuild/rules_rust/pull/4347)), Rust 1.98.1 and 1.99.1 added.
- Doctests, in bazelbuild rules_rust: "rustdoc: align the doctest runner with the test platform" ([#4279](https://github.com/bazelbuild/rules_rust/pull/4279)), "preserve the test invocation environment" ([#4277](https://github.com/bazelbuild/rules_rust/pull/4277)), "Preserve runtime files for compiled doctests" ([#4272](https://github.com/bazelbuild/rules_rust/pull/4272)), "Map all generated input roots into legacy doctest runfiles" ([#4271](https://github.com/bazelbuild/rules_rust/pull/4271)). These are about runfiles and the test execution platform; none mentions output handling.
- Windows: no coverage or `--enable_runfiles` change. The docs index at 0.75.0 still reads "We do not have sufficient maintainer expertise to support Windows" ([docs/src/index.md@0.75.0](https://github.com/bazelbuild/rules_rust/blob/0.75.0/docs/src/index.md)).
- crate_universe: no entries.

### 3. crate_universe after 0.75.0 (unreleased, on main)

Commits on [bazelbuild/rules_rust main](https://github.com/bazelbuild/rules_rust/commits/main) since 2026-10-26:

- [#4452](https://github.com/bazelbuild/rules_rust/pull/4452) (2026-11-23): sets `deprecation` on every root-level alias of a generated hub `BUILD.bazel`; Bazel warns at each use. The replacement is the per-crate subpackage form `@hub//name`. Local vendoring keeps root aliases without the attribute.
- [#4455](https://github.com/bazelbuild/rules_rust/pull/4455) (2026-11-24): every generated crate declares `package_metadata` (purl) and `license` targets; `generate_rules_license_metadata` now defaults to True for the extension (read in `crate_universe/extensions.bzl` at main, diff against 0.75.0).
- Fixes: proc-macro alias maps ([#4454](https://github.com/bazelbuild/rules_rust/pull/4454)), Tera template string escaping ([#4416](https://github.com/bazelbuild/rules_rust/pull/4416)), `cp`/`find` replaced by repository_ctx APIs in `local_crate_mirror` ([#4427](https://github.com/bazelbuild/rules_rust/pull/4427)), cargo_metadata 0.23.1 ([#4411](https://github.com/bazelbuild/rules_rust/pull/4411)), netrc auth for downloads ([#4410](https://github.com/bazelbuild/rules_rust/pull/4410), [#4383](https://github.com/bazelbuild/rules_rust/pull/4383)), Windows `cargo-bazel.exe` bootstrap name.
- [#4449](https://github.com/bazelbuild/rules_rust/pull/4449) (2026-11-20): the `rust` module extension reads `rust-toolchain.toml`. This is a new way to pin the toolchain under rules_rust; not in any release yet.
- Also on main: `rust_toolchain` split into rustdoc and clippy parts ([#4354](https://github.com/bazelbuild/rules_rust/pull/4354)); per-component on-demand Rust release fetch ([#4397](https://github.com/bazelbuild/rules_rust/pull/4397)).

The extension docs diff between tag 0.75.0 and main shows only these additions; the repin section is byte-identical.

### 4. Repin command and `bazel sync` in the docs

`crate_universe/extensions.bzl` line 138 reads `CARGO_BAZEL_REPIN=1 bazel sync --only=crates` at 0.74.0, at 0.75.0 and at main. `crate_universe/private/crates_repository.bzl` lines 235 and 257 print `bazel sync --only=crate_index` at all three refs. Read via the GitHub contents API on 2026-11-27: [extensions.bzl@main](https://github.com/bazelbuild/rules_rust/blob/main/crate_universe/extensions.bzl), [crates_repository.bzl@main](https://github.com/bazelbuild/rules_rust/blob/main/crate_universe/private/crates_repository.bzl).

### 5. rules_rs changes since 2026-10-21

From [v0.2.0](https://github.com/hermeticbuild/rules_rs/releases/tag/v0.2.0) to [v0.2.4](https://github.com/hermeticbuild/rules_rs/releases/tag/v0.2.4) and main to 2026-11-17:

- Bazel floor raised to 8.7 ([#324](https://github.com/hermeticbuild/rules_rs/pull/324)), 2026-10-29.
- `from_cargo` tags now require both `Cargo.toml` and `Cargo.lock` ([#316](https://github.com/hermeticbuild/rules_rs/pull/316)); relevant to BZL-RUST-37, whose example passes both.
- Cargo toolchains are registered alongside rustc ([#318](https://github.com/hermeticbuild/rules_rs/pull/318)).
- Default toolchains registered by rules_rs itself ([#325](https://github.com/hermeticbuild/rules_rs/pull/325), 2026-10-30): `@default_rust_toolchains//...`, prost, wasm_bindgen and bindgen toolchains. With only a `host_cargo` tag nothing is downloaded. Root-module registrations still take precedence. No change to the `toolchains.toolchain(version = ...)` tag.
- Rust redist manifests fetched on demand ([#351](https://github.com/hermeticbuild/rules_rs/pull/351)); features resolved across target platforms together ([#354](https://github.com/hermeticbuild/rules_rs/pull/354)); Cargo metadata and aliases split into separate packages and crate subpackage aliases ([#359](https://github.com/hermeticbuild/rules_rs/pull/359), [#360](https://github.com/hermeticbuild/rules_rs/pull/360)); root metadata in internal hubs disabled as deprecated ([#366](https://github.com/hermeticbuild/rules_rs/pull/366)).
- The README on main still shows `toolchains.toolchain(...)` with `bazel_dep(name = "rules_rs", version = "0.1.3")` and `llvm` 0.8.25 ([README](https://github.com/hermeticbuild/rules_rs/blob/main/README.md)): toolchain pinning syntax unchanged, the version in the example is stale. The README documents that a root-module `toolchains.toolchain` declaration controls the complete configuration.
- The 0.2.x release notes mention no change to `llvm` pairing. Not checked: whether rules_rs 0.2.4 depends on a different `llvm` version (BZL-RUST-37 cites 0.1.3 depending on llvm 0.8.18). Could not determine without reading the 0.2.4 MODULE.bazel.

### 6. hermeticbuild/rules_rust fork

PRs merged after 2026-10-21 ([pulls](https://github.com/hermeticbuild/rules_rust/pulls?q=is%3Apr+is%3Amerged)): #89, #90, #94, #99, #100, #101, #102, #103, #105, #106, #107; none concerns doctests. `rust/private/rustdoc_test.bzl` at fork main still contains `action.process_wrapper_flags.add("--discard-stdout-on-success", "true")` (line 95) and the doc string "When every documentation test passes, the replay prints nothing to stdout" (line 221) ([file](https://github.com/hermeticbuild/rules_rust/blob/main/rust/private/rustdoc_test.bzl)). bazelbuild/rules_rust main has a different, simpler doctest implementation (a "wrapper that suppresses stdout on success for compiled doc test actions" attribute); that is upstream behaviour, not the fork's, and was not compared further.

### 7. gazelle_rust

No release after v0.1.0 (2026-05-05); the commits API returned nothing since 2026-09-06; BCR versions list is `["0.1.0"]`. [Calsign/gazelle_rust](https://github.com/Calsign/gazelle_rust).

## Claim status

| Claim at risk | Status | Evidence |
|---|---|---|
| rust.md header: crate_universe "under active repair - seven of roughly 32 entries in the 0.74.0 changelog" | changed in framing, not false. Old text: 0.74.0 is the baseline. New fact: 0.75.0 (2026-10-26, about 45 entries) has zero crate_universe entries, but main has about ten crate_universe commits 2026-11-13 to 2026-11-24, so "under active repair" still holds, now on main. | [0.75.0 notes](https://github.com/bazelbuild/rules_rust/releases/tag/0.75.0), [main commits](https://github.com/bazelbuild/rules_rust/commits/main) |
| rust.md: re-read `crate_universe/extensions.bzl` at the tag | changed target: tag is now 0.75.0; the repin text is identical to 0.74.0. | [extensions.bzl@0.75.0](https://github.com/bazelbuild/rules_rust/blob/0.75.0/crate_universe/extensions.bzl) |
| NN 15: `bazel sync` deleted at 9.0.0, ruleset docs still print it | unchanged | Finding 4 |
| NN 15: `CARGO_BAZEL_REPIN=1 bazel fetch --repo=@<repo>` | unchanged; no change to repin or lockfile handling in 0.75.0 or on main | Findings 2, 3, 4 |
| NN 15: under rules_rs no `CARGO_BAZEL_*`, MODULE.bazel.lock is the gate | unchanged; rules_rs 0.2.x changes (#316, #354) add no lockfile or env var | Finding 5 |
| NN 15: `toolchains.toolchain(version = ...)` under rules_rs | unchanged; 0.2.1 adds default registration but keeps the tag | [#325](https://github.com/hermeticbuild/rules_rs/pull/325) |
| BZL-RUST-40: `--discard-stdout-on-success`, empty passing test.log | unchanged at fork main 2026-11-27 | Finding 6 |
| BZL-RUST-19: gazelle_rust 0.1.0 preconditions | unchanged; no new release or commit | Finding 7 |
| BZL-RUST-33: `rules_rust_prost` at the same version as rules_rust | unchanged rule; the matching version is now 0.75.0 | release notes |
| testing.md, caching.md, flags.md, architecture.md cite rules_rust 0.74.0 | changed: 0.75.0 exists (2026-10-26). architecture.md says gazelle_rust floor is rules_rust 0.40.0, so 0.75.0 still clears it. flags.md BZL-FLAG-29 example "0.73 to 0.74 is a major bump": 0.74 to 0.75 is another. | Finding 1 |
| rust.md gaps: BZL-TEST-24 verification still open | unchanged; Windows disclaimer identical at 0.75.0, no coverage change in the notes | [index.md@0.75.0](https://github.com/bazelbuild/rules_rust/blob/0.75.0/docs/src/index.md) |
| rust.md line 46: measured on rules_rs 0.1.3, llvm 0.8.25, Rust 1.95.0 | still a correct description of the measurement; versions are now behind (0.2.4, Rust 1.100.0) | Finding 1 |

## Normative guidance candidates

1. Bump every "current" citation of rules_rust from 0.74.0 to 0.75.0 and its measurement date. Rationale: 0.75.0 is on the BCR. Verification: `grep -rn "0\.74\.0" skills/bazel-quality-reference rules/bazel-quality.md` returns only lines intentionally historical.
2. BZL-RUST-37: add that rules_rs 0.2.0 or newer needs Bazel 8.7 or newer and that `from_cargo` requires both `cargo_toml` and `cargo_lock`. Rationale: [#324](https://github.com/hermeticbuild/rules_rs/pull/324), [#316](https://github.com/hermeticbuild/rules_rs/pull/316). Verification: read `.bazelversion` against 8.7.0 or newer and grep `from_cargo(` for both attributes.
3. BZL-RUST-37/38: note that rules_rs 0.2.1 or newer registers `@default_rust_toolchains//...` and the prost, wasm_bindgen and bindgen toolchains by default, so a module's explicit `register_toolchains` is still the root-precedence form and an `@llvm//toolchain:all` registration is still required for hermetic C linking. Rationale: [#325](https://github.com/hermeticbuild/rules_rs/pull/325) says root registrations take precedence and the llvm toolchain is not part of the defaults. Verification: BZL-RUST-38's existing grep for `@llvm//toolchain` in `register_toolchains`.
4. New row (CONSIDER, rules_rust crate_universe users): after upgrading past 0.75.0 expect `deprecation` warnings on root hub aliases (`@crates//:serde`) and use `@crates//serde` instead. Rationale: [#4452](https://github.com/bazelbuild/rules_rust/pull/4452). Verification: `grep -rnE '@crates//:[a-z_]+' --include=BUILD.bazel --include=*.bzl .` finds root-alias uses. Mark as unreleased (main only) until a release contains it.
5. Keep BZL-RUST-03, BZL-RUST-40, BZL-RUST-19 and BZL-TEST-24 text as is. Their verification greps need no change.

## AI-agent angle

- An agent copying the repin command from `extensions.bzl` docstrings gets `bazel sync`, still wrong on Bazel 9; the grep in rust.md line 91 catches it.
- An agent reading the rules_rs README copies `rules_rs` 0.1.3 and `llvm` 0.8.25 as the current pair; check the BCR metadata versions instead (0.2.4 now).
- An agent may add `rust_doc_test` output parsing based on bazelbuild/rules_rust behaviour; the fork's empty-on-pass log is different.

## Contested / evolving

- crate_universe hub root aliases are being deprecated on main (2026-11-23); trend: subpackage aliases `@hub//name`, matching what rules_rs did in 0.2.4 ([#360](https://github.com/hermeticbuild/rules_rs/pull/360)).
- Toolchain pinning is converging on file-based pinning (`rust-toolchain.toml` read by the `rust` extension, [#4449](https://github.com/bazelbuild/rules_rust/pull/4449), main only) and on shipping a Cargo toolchain with rustc (0.75.0 and rules_rs 0.2.0). Re-check at rules_rust 0.76.0.
- Bazel `--incompatible_restrict_non_root_registrations` is being prototyped, per the [#325](https://github.com/hermeticbuild/rules_rs/pull/325) description; could change default toolchain registration behaviour later.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://github.com/bazelbuild/rules_rust/releases/tag/0.75.0 | release notes | 2026-10-26 | version and change list |
| https://github.com/bazelbuild/rules_rust/blob/0.75.0/crate_universe/extensions.bzl | repin docs | 0.75.0 | bazel sync still printed |
| https://github.com/bazelbuild/rules_rust/blob/main/crate_universe/extensions.bzl | main source | read 2026-11-27 | post-release diff |
| https://github.com/bazelbuild/rules_rust/blob/main/crate_universe/private/crates_repository.bzl | crates_repository docs | read 2026-11-27 | bazel sync printed |
| https://github.com/bazelbuild/rules_rust/pull/4452 | PR | 2026-11-23 | root alias deprecation |
| https://github.com/bazelbuild/rules_rust/pull/4455 | PR | 2026-11-24 | license metadata default |
| https://github.com/bazelbuild/rules_rust/pull/4449 | PR | 2026-11-20 | rust-toolchain.toml |
| https://github.com/bazelbuild/rules_rust/blob/0.75.0/docs/src/index.md | docs index | 0.75.0 | Windows disclaimer |
| https://github.com/hermeticbuild/rules_rs/releases | rules_rs releases 0.2.0-0.2.4 | 2026-10-29 to 2026-11-12 | versions and PR lists |
| https://github.com/hermeticbuild/rules_rs/pull/325 | PR | 2026-10-30 | default toolchain registration |
| https://github.com/hermeticbuild/rules_rs/pull/318 | PR | 2026-10-26 | Cargo toolchain, rules_rust pin |
| https://github.com/hermeticbuild/rules_rs/blob/main/README.md | README | read 2026-11-27 | toolchain pin syntax |
| https://github.com/hermeticbuild/rules_rust/blob/main/rust/private/rustdoc_test.bzl | fork doctest rule | read 2026-11-27 | discard-stdout still present |
| https://github.com/hermeticbuild/rules_rust/pulls?q=is%3Apr+is%3Amerged | fork merged PRs | to 2026-11-13 | no doctest change |
| https://github.com/Calsign/gazelle_rust/releases | gazelle_rust | v0.1.0 2026-05-05 | no new release |
| https://github.com/bazelbuild/bazel-central-registry/tree/main/modules | BCR metadata for rules_rust, rules_rs, gazelle_rust | read 2026-11-27 | published versions |
| https://github.com/rust-lang/rust/releases | Rust releases | 1.100.0 on 2026-11-12 | toolchain currency |
