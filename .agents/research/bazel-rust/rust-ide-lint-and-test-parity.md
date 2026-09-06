---
title: rust-analyzer, clippy/rustfmt aspects, and cargo-test parity under Bazel
topic: rust-ide-lint-and-test-parity
group: bazel-rust
family: BZL-RUST
agent: sonnet-wave3b-bazel-rust
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 18
primary_sources_count: 14
settles: [M-I-09, M-I-10, M-I-11, M-I-12]
builds_on: []
scope: |
  Covered: the rust_analyzer:setup one-shot installer (editors, host-Rust
  independence, per-user user_config.json toggles, --per-package-workspaces'
  find-usages cost, the non-working VSCode Debug codelens and its
  gen_launch_json fix); the clippy and rustfmt aspects as the only gating
  mechanism (.bazelrc aspect + output_groups registration, their two
  *different* tag-based opt-outs, the open unsandboxed-test clippy bug
  rules_rust#2510); the rust_test(crate=...) coverage instrumentation
  inconsistency; and a checklist that proves a rust_test/rust_test_suite/
  rust_doc_test set reaches parity with what `cargo test` would have run.
  Not covered: crates_repository/crates_vendor, the two crate_universe
  lockfiles, and repin mechanics (crate-universe-lockfiles-and-repin);
  cargo_build_script hermeticity and cross-compilation (cargo-build-scripts-
  and-cross-compilation); test size/sharding/flakiness taxonomy and
  analysistest (bazel-testing, BZL-TEST); Cargo.toml/rust-toolchain.toml
  hygiene itself (owned by rust-cargo, rust-quality).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The rust_analyzer:setup installer](#1-the-rust_analyzersetup-installer)
   2. [Per-user toggles live outside the committed config](#2-per-user-toggles-live-outside-the-committed-config)
   3. [--per-package-workspaces: what indexing speed costs](#3---per-package-workspaces-what-indexing-speed-costs)
   4. [The Debug codelens does not work; gen_launch_json does](#4-the-debug-codelens-does-not-work-gen_launch_json-does)
   5. [Clippy and rustfmt are aspects, never a per-target attribute](#5-clippy-and-rustfmt-are-aspects-never-a-per-target-attribute)
   6. [Two different opt-out tag families, and one open sandbox bug](#6-two-different-opt-out-tag-families-and-one-open-sandbox-bug)
   7. [The coverage inconsistency: crate=... always instruments #[cfg(test)]](#7-the-coverage-inconsistency-crate-always-instruments-cfgtest)
   8. [Chasing the surprise: how mature is the IDE story, really](#8-chasing-the-surprise-how-mature-is-the-ide-story-really)
   9. [Test-parity checklist: what Cargo auto-discovers that Bazel does not](#9-test-parity-checklist-what-cargo-auto-discovers-that-bazel-does-not)
   10. [A live, silent trap: the empty test_suite](#10-a-live-silent-trap-the-empty-test_suite)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `rust_analyzer:setup` is one re-runnable Bazel target that configures VSCode, Neovim, Helix, or a generic JSON emitter for anything else; after it runs, rust-analyzer, its proc-macro server, and rustfmt all come from the Bazel toolchain — no host Rust install is needed ([rust_analyzer.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/rust_analyzer.md)).
- Per-user preferences (`--clippy`/`--no-clippy`, `--per-package-workspaces`) write to a gitignored `user_config.json`, not the committed `settings.json` — two developers can hold different preferences without touching checked-in config ([rust_analyzer.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/rust_analyzer.md)).
- `--per-package-workspaces` trades whole-repo indexing time for a named, documented loss: "dependents of the package you're working on aren't indexed, so 'find usages' can miss callers in other packages" — verbatim from the doc.
- VSCode's built-in `▶ Debug` codelens is explicitly documented as **not working** for Bazel projects; the supported path is `bazel run @rules_rust//tools/vscode:gen_launch_json` plus the CodeLLDB extension and F5.
- Clippy and rustfmt gate exclusively through `.bazelrc` aspect + `--output_groups` registration (`%rust_clippy_aspect` / `%rustfmt_aspect`) — there is no per-target rule attribute that turns either on ([clippy.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/clippy.md), [rustfmt.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/rustfmt.md)).
- Clippy's skip tags (`no_clippy`, `no_lint`, `nolint`, `noclippy`) and rustfmt's skip tags (`no_format`, `no_rustfmt`, `norustfmt`) are **two disjoint sets** read from source — tagging a target to skip one lint does not skip the other.
- rustfmt's own doc recommends the aspect be CI-only "so formatting issues do not impact users' ability to rapidly iterate" — it names no equivalent recommendation for clippy.
- An open rules_rust issue (`#2510`, filed 2024-02-22, still open as of this read, 0 comments) reproduces a clippy-aspect failure specifically when a target is tagged `no-sandbox`, `--@rules_rust//:rustc_output_diagnostics=true` is set, and the test was already built once — the clippy action then fails writing an undeclared output file it shares with the prior rustc compile action.
- Coverage has a documented, named inconsistency: `rust_test(crate = ...)` compiles the whole crate — including `#[cfg(test)]` code — into one binary, so that test-only code gets instrumented "without needing `--instrument_test_targets`," breaking the Bazel-wide convention that test code needs that flag to be covered.
- One independent, named account (mmapped.blog, ~600k lines of Rust, "a few hundred" packages) reports rust-analyzer support "worked perfectly in the prototype but choked on our code base" — no source in this dive states a numeric crate-count or line-count threshold where it starts failing; say so plainly rather than inventing one.
- The same repository shipped two rust-analyzer-adjacent fixes (`gen_rust_project` external crate paths, Helix config) in its most recent release (0.74.0, 2026-08-28) — this machinery is actively maintained, not stable legacy code.
- Cargo auto-discovers unit tests (`#[cfg(test)]`), integration tests (`tests/*.rs`), and doc tests (`///` code fences) in one `cargo test` run; Bazel needs three separate, explicit mechanisms: `rust_test(crate = ...)`, `rust_test`/`rust_test_suite` over `tests/`, and `rust_doc_test(crate = ...)` — the last of these is never auto-generated.
- `rust_test_suite`'s own source shows the trap directly: an empty (or wrongly globbed) `srcs` list still produces a passing, empty `test_suite` target with no error anywhere — Bazel's `test_suite` special-cases an empty `tests` list as "run everything in the package" and the macro defends against exactly that with a synthetic `restrict_<name>` tag, which is silent insurance, not a loud failure.
- `crate_root` defaults to `lib.rs`/`main.rs`, or the single file in `srcs` if there is exactly one — an integration test with a nonstandard file name and more than one `srcs` entry (test file + shared helper) needs `crate_root` set explicitly.
- `data` on `rust_test` is documented as "used by this rule at compile time and runtime" — the one attribute that carries fixture files an integration test reads at runtime; it is separate from `compile_data`, which is only for `include_str!()`-style compile-time inclusion.
- No fleet repository exercises any of this: zero fleet repos use `rust_*` rules, so every claim above grounds on upstream sources; `bob` (9 crates, clean DAG, no CI) is the orchestrator-named adoption candidate this checklist would first apply to.

## Findings

### 1. The rust_analyzer:setup installer

`rules_rust` ships `@rules_rust//tools/rust_analyzer:setup`, one Rust binary target with per-editor subcommands: `vscode`, `neovim`, `helix`, and a generic `print` mode for `coc.nvim`/`vim-lsp`/ALE consumers that read the same `rust-analyzer.*` JSON keys VSCode uses ([rust_analyzer.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/rust_analyzer.md)). `setup` is explicitly documented as re-runnable at any time, and the doc states plainly: "After setup, rust-analyzer, the proc-macro server, and rustfmt all come from Bazel — no host Rust install required." The tool's own source directory (`tools/rust_analyzer/`) contains `user_config.rs`, `rust_project.rs`, `cache.rs`, `aquery.rs`, and `bep.rs` — this is first-class, non-trivial code, not a thin wrapper (confirmed by directory listing, `gh api repos/bazelbuild/rules_rust/contents/tools/rust_analyzer`).

For VSCode specifically: `.vscode/settings.json` is always written, and a `*.code-workspace` at the workspace root is picked up too. "Existing user keys and comments survive re-runs, so `.vscode/settings.json` and `.code-workspace` are safe to commit." The one directory that must be gitignored is the per-editor launcher cache, e.g. `.vscode/.rules_rust_analyzer/`.

### 2. Per-user toggles live outside the committed config

Two flags are explicitly per-developer: `--clippy`/`--no-clippy` (run clippy on save and stream its diagnostics alongside rustc's) and `--per-package-workspaces`/`--no-per-package-workspaces`. Both "mutate `<launcher-dir>/user_config.json` (gitignored) instead of the shared committed settings file. Two developers on the same workspace can hold different preferences without touching the checked-in configuration." Editing `user_config.json` by hand works too — there is no schema-validation step named in the doc.

### 3. --per-package-workspaces: what indexing speed costs

By default rust-analyzer treats the whole project as a single workspace. For large repos, `--per-package-workspaces` scopes discovery "to the saved file's package + deps; rust-analyzer reloads when you jump to a different package." The cost is stated in the doc's own words: "dependents of the package you're working on aren't indexed, so 'find usages' can miss callers in other packages." This is a correctness trade for indexing speed, not a pure performance knob — a developer using it can get a false-negative "0 usages" result on a symbol that genuinely has callers elsewhere in the tree.

### 4. The Debug codelens does not work; gen_launch_json does

The doc is unambiguous: "The `▶ Debug` codelens VSCode renders next to `#[test]` functions **does not work** for Bazel projects." The supported alternative is `bazel run @rules_rust//tools/vscode:gen_launch_json`, which writes `.vscode/launch.json`, plus the [CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb) extension and F5. The target is confirmed live in the ruleset's own `BUILD.bazel`:

```python
# tools/vscode/BUILD.bazel
rust_binary(
    name = "gen_launch_json",
    srcs = ["src/bin/gen_launch_json.rs"],
    edition = "2021",
    visibility = ["//visibility:public"],
    deps = [":vscode", ...],
)
```
(fetched raw, `tools/vscode/BUILD.bazel`, `main`)

"One launch config covers every test in that binary" — it is not per-test, it is per test-binary target.

### 5. Clippy and rustfmt are aspects, never a per-target attribute

Both lints gate exclusively through `.bazelrc`, never a `rust_test`/`rust_library` attribute:

```text
# clippy — build --aspects=@rules_rust//rust:defs.bzl%rust_clippy_aspect
build --aspects=@rules_rust//rust:defs.bzl%rust_clippy_aspect
build --output_groups=+clippy_checks
```
```text
# rustfmt — build --aspects=@rules_rust//rust:defs.bzl%rustfmt_aspect
build --aspects=@rules_rust//rust:defs.bzl%rustfmt_aspect
build --output_groups=+rustfmt_checks
```

([clippy.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/clippy.md), [rustfmt.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/rustfmt.md)). There is no `clippy = True` or `rustfmt = True` attribute on `rust_test`/`rust_library` to hallucinate — the mechanism is entirely aspect registration plus an output group, applied to *every* Rust target in the build once registered. A local `clippy.toml`/`.clippy.toml` is picked up via a separate setting, `--@rules_rust//rust/settings:clippy.toml=//:clippy.toml`, and requires Rust ≥ 1.34.0. rustfmt has the equivalent `--@rules_rust//rust/settings:rustfmt.toml=//:rustfmt.toml`.

rustfmt's own doc makes the CI-only recommendation explicit: "It's recommended to only enable this aspect in your CI environment so formatting issues do not impact users' ability to rapidly iterate on changes." Clippy's doc names no equivalent recommendation — silence, not a stated exception.

### 6. Two different opt-out tag families, and one open sandbox bug

Reading the aspects' own source (not just the docs) shows the opt-out tags are two **disjoint** sets, matched case-insensitively with hyphens normalized to underscores:

```python
# rust/private/clippy.bzl — ignore_tags for the clippy aspect
ignore_tags = ["no_clippy", "no_lint", "nolint", "noclippy"]
for tag in aspect_ctx.rule.attr.tags:
    if tag.replace("-", "_").lower() in ignore_tags: ...
```
```python
# rust/private/rustfmt.bzl — ignore_tags for the rustfmt aspect
ignore_tags = ["no_format", "no_rustfmt"]   # docstring also lists "norustfmt"
for tag in aspect_ctx.rule.attr.tags:
    if tag.replace("-", "_").lower() in ignore_tags: ...
```
(both fetched raw from `rust/private/`, `main`) So `tags = ["no-clippy"]` and `tags = ["no_clippy"]` are equivalent (the hyphen/underscore normalization), but `tags = ["no-lint"]` does **not** silence rustfmt, and `tags = ["no-format"]` does **not** silence clippy.

The clippy aspect has a specific, reproduced (not merely "intermittent" in the sense of nondeterministic) failure mode when three conditions hold together: a target tagged `no-sandbox`, `--@rules_rust//:rustc_output_diagnostics=true` set (used for editor integration), and the clippy build run *after* the test's own compile action has already produced its output file. Because tag propagation makes the clippy aspect's action unsandboxed too, and the process-wrapper output file is not a declared Bazel output, the second write hits `Permission denied` — a real repro with a full command line and patch is in the issue body ([bazelbuild/rules_rust#2510](https://github.com/bazelbuild/rules_rust/issues/2510), filed 2024-02-22, `state: open`, `comments: 0` as read via `gh api` on 2026-09-05). The filer's own framing: "the underlying issue isn't a rules_rust issue, but rather a bazel issue" (linking `bazelbuild/bazel#21474`), and their only workaround is "disable clippy for any unsandboxed tests" — there is no shipped fix.

### 7. The coverage inconsistency: crate=... always instruments #[cfg(test)]

`rules_rust` uses LLVM source-based coverage (`-Cinstrument-coverage`) gated by Bazel's own `--instrumentation_filter`, same mechanism as C++ and Java ([coverage.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/coverage.md)). The doc names the inconsistency itself, verbatim: "because the entire crate (including `#[cfg(test)]` code) is compiled as one unit, test-specific code in the crate will also be instrumented... a known inconsistency with the usual Bazel convention where test code is only instrumented when `--instrument_test_targets` is set." This only applies to `rust_test(crate = ...)` (the unit-test wrapper around a library/binary); a standalone integration `rust_test` with its own `srcs` follows the normal convention. Recommended `.bazelrc`:

```text
coverage --instrumentation_filter=^//,-^//third_party
```

### 8. Chasing the surprise: how mature is the IDE story, really

The map's frame calls `rules_rust`'s IDE story "materially the most mature of the four languages in this programme" while citing one account that "still reports it choking on a real codebase where it worked in a prototype." Both halves check out against primary sources, and neither resolves to a number.

The maturity side: `rust_analyzer:setup` is a fully-fledged, tested Rust binary (not a shell script) with its own `user_config.rs`/`rust_project.rs`/`cache.rs` modules, four editor targets, a documented troubleshooting section (`flycheck.log`, `--clean`), and — critically — active, current maintenance: the 0.74.0 release (2026-08-28, the current pin at time of writing) shipped two rust-analyzer-specific fixes in the same cut: "[fix external crate paths for `gen_rust_project`](https://github.com/bazelbuild/rules_rust/pull/4200)" (part of `#4057`) and "[Fix rust-analyzer helix config](https://github.com/bazelbuild/rules_rust/pull/4199)" (closes `#4197`) ([0.74.0 release notes](https://github.com/bazelbuild/rules_rust/releases/tag/0.74.0), read via `gh api`). Read that as: this is not settled, static tooling — it is patched release over release.

The "choked" side is a single, named, credible source: [mmapped.blog's "Scaling Rust builds with Bazel"](https://mmapped.blog/posts/17-scaling-rust-builds-with-bazel) reports "The rules_rust Bazel plugin offers experimental support for rust-analyzer, which worked perfectly in the prototype but choked on our code base," in the context of a ~600,000-line Rust codebase ("the Internet Computer repository") migrating "a few hundred Rust packages" onto Bazel. Their resolution was pragmatic, not a fix: keep Cargo files around purely for IDE/dev convenience while CI runs exclusively on Bazel.

**No source read in this dive states a numeric crate-count or line-count threshold where rust-analyzer support degrades.** The honest scale statement is: it is reported working for prototypes and smaller repos, reported failing on at least one ~600k-LOC, few-hundred-package repo, and the gap between those two points is not measured anywhere in the corpus. Any rule that asserts a specific number is inventing one.

### 9. Test-parity checklist: what Cargo auto-discovers that Bazel does not

Cargo's `cargo test` auto-discovers three kinds of tests from one crate layout with zero explicit target declarations: unit tests (`#[cfg(test)] mod` inside `src/`), integration tests (each file directly under `tests/`), and doc tests (every `///`/`//!` code fence). Bazel requires an explicit target for each kind:

| Cargo auto-discovers | Bazel's explicit equivalent | Source |
|---|---|---|
| `#[cfg(test)]` unit tests | `rust_test(crate = ":lib")`, no `srcs` | [rust.bzl `rust_test` doc](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/rust/private/rust.bzl) |
| One file per `tests/*.rs` | One `rust_test(srcs = ["tests/foo.rs"], deps = [":lib"])`, or `rust_test_suite(srcs = glob(["tests/**"]), ...)` — one macro-generated `rust_test` per file | [rust.bzl `rust_test_suite`](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/rust/private/rust.bzl) |
| Doc-comment code fences | `rust_doc_test(name = ..., crate = ":lib")` — **never auto-generated** | [rustdoc.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/rustdoc.md), [rustdoc_test.bzl](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/rust/private/rustdoc_test.bzl) |

Two attributes matter for fixture-heavy tests:

- **`crate_root`**: "If `crate_root` is not set, then this rule will look for a `lib.rs` file (or `main.rs` for rust_binary) or the single file in `srcs` if `srcs` contains only one file." An integration test that pulls in a shared helper module (`srcs = ["tests/foo.rs", "tests/common/mod.rs"]`) has *two* files in `srcs`, so `crate_root` must be set explicitly to `tests/foo.rs` or the build fails to infer a root.
- **`data`**: "List of files used by this rule at compile time and runtime. If including data at compile time with `include_str!()` and similar, prefer `compile_data` over `data`." Any fixture a test reads at runtime (a golden file, a sample input) goes in `data`, not `srcs` or `compile_data`.

The parity checklist a `bazel-adopt` handoff should run:

1. For every `rust_library`/`rust_binary` containing a `#[cfg(test)] mod`, confirm a matching `rust_test(crate = ...)` target exists.
2. For every file under `tests/`, confirm a `rust_test` target exists (directly or generated by `rust_test_suite`) with the right `crate_root` when `srcs` has more than one file, and every fixture path it reads listed in `data`.
3. For every public item whose doc comment contains a fenced code block intended as an example, confirm a `rust_doc_test(crate = ...)` target exists — this is the one Cargo behavior Bazel never auto-generates at all.
4. Cross-check counts: `cargo test -- --list` (or `cargo nextest list`) against `bazel query 'kind(rust_test, //...)' | wc -l` plus `bazel query 'kind(rust_doc_test, //...)'`. A lower Bazel count is a real gap; an equal or higher count is not proof of parity by itself (`rust_test_suite` can generate names that don't obviously map back to Cargo's test names) — diff names, not just counts, for anything the rule set treats as MUST.
5. Verify no `rust_test_suite` silently resolved to an empty target set (Finding 10).

### 10. A live, silent trap: the empty test_suite

`rust_test_suite(name, srcs, shared_srcs, **kwargs)` is a macro, not a rule: it iterates `srcs`, emits one `rust_test` per non-shared file with a synthetic tag `restrict_<name>` plus every user-supplied tag, then calls `native.test_suite(name = name, tests = tests, tags = tags)`. The macro's own doc-comment explains why the synthetic tag exists: "If `test_suite.tests` is empty, Bazel will unhelpfully include all tests from the package. Require an extra tag so they are filtered out again." ([rust.bzl, `rust_test_suite`](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/rust/private/rust.bzl))

The ruleset ships a dedicated regression fixture for exactly this case, `test/empty_suite/BUILD.bazel`, whose own comment states the scenario plainly: "This package has a `rust_test_suite` containing no tests. (This could happen if the `srcs` were selected via a glob.) We test that the test suite exists and is empty, bypassing `test_suite`'s special-case behavior for empty suites." A `glob(["tests/**/*.rs"])` that matches nothing — a typo'd directory name, a `tests/` folder that got renamed — produces a `test_suite` that exists, is empty, and passes `bazel test //pkg:suite` with a green result and zero tests run. There is no error anywhere in this path.

## Decisions

**The IDE setup a `bazel-adopt` run must perform before handing a Rust repo back:**

1. Run `bazel run @rules_rust//tools/rust_analyzer:setup -- <editor>` once per supported editor the team uses, committing the resulting `.vscode/settings.json`/`.code-workspace` (or the Neovim/Helix snippet, pasted into the repo's onboarding doc since those are stdout-printed, not written to a file) and adding the launcher's cache directory to `.gitignore`.
2. Leave `--per-package-workspaces` and `--clippy` as documented per-developer choices (they write to gitignored `user_config.json` already) rather than mandating a repo-wide default — but record the find-usages trade-off from Finding 3 in the handoff notes so a developer who flips it on understands the risk.
3. Generate `.vscode/launch.json` via `bazel run @rules_rust//tools/vscode:gen_launch_json` and name CodeLLDB as the required extension in onboarding docs — the built-in Debug codelens is a documented dead end, not a "figure it out" gap.
4. Register the clippy and rustfmt aspects in `.bazelrc` per Finding 5's exact lines, with rustfmt confined to a CI-only config (a separate `--config=ci` block or CI-specific `.bazelrc`, per rustfmt's own recommendation) and clippy in the default build config unless the repo is already tripping the `#2510` sandbox interaction.
5. Note in the handoff that `setup` must be re-run after any `MODULE.bazel` edit or `bazel clean --expunge` — this is a recurring maintenance step for the receiving team, not a one-time install.

Evidence: Findings 1-6. Assumption named: this checklist assumes VSCode or one of the three other named editors; a team on an unsupported editor gets the generic `print` JSON and inherits whatever gaps that editor's LSP client has with the emitted keys — untested by any source read here.

**The test-parity verification:** run the five-step checklist in Finding 9, in order, treating step 3 (doc tests) as the one Cargo auto-discovers with zero Bazel analog — no other step in this checklist has a "Bazel does nothing for this" gap that large. Evidence: the `rust_doc_test` rule requires one target per crate with no macro or aspect that generates it from doc comments (confirmed by reading the rule's own attrs and doc string — `crate` is `mandatory = True`, there is no `srcs`/glob-based variant). Assumption named: a codebase with no fenced-code-block doc comments has nothing to lose from skipping step 3 — the checklist step is conditional on the source actually containing runnable doc examples, which a `grep -rn '^///.*```' src/**/*.rs` (or equivalent) settles cheaply before treating the gap as a finding.

## Normative guidance candidates

1. **A `bazel-adopt` handoff on a Rust repo must run `rust_analyzer:setup` for at least one supported editor before the handoff is considered complete.** Rationale: without it, the received repo has a working Bazel build but no working IDE experience, and the setup step is the one that resolves rust-analyzer, the proc-macro server, and rustfmt entirely off the Bazel toolchain. Verify: `test -f .vscode/settings.json -o -f <workspace>.code-workspace` (or the Neovim/Helix snippet present in onboarding docs) after handoff. **Missing = finding.** Severity: MUST. Bazel 7-9; rules_rust 0.74.0 (any recent version — no version floor stated for the tool). Settles: M-I-09.
2. **The rust-analyzer launcher cache directory (`.vscode/.rules_rust_analyzer/` for VSCode) must be gitignored; `.vscode/settings.json` and any `.code-workspace` file must be committed.** Rationale: the doc states the settings file is safe to commit (re-runs preserve user keys/comments) while the launcher directory is regenerated, per-machine, disposable state. Verify: `git check-ignore .vscode/.rules_rust_analyzer` exits 0; `git ls-files .vscode/settings.json` returns the path. **Either check failing = finding.** Severity: MUST. Bazel 7-9; rules_rust current. Settles: M-I-09.
3. **Never commit a developer's `--per-package-workspaces` or `--clippy` preference by editing the shared `.vscode/settings.json` by hand.** Rationale: both flags are designed to write to gitignored `user_config.json` specifically so two developers can diverge; hand-editing the committed file defeats that design and silently imposes one developer's indexing trade-off (Finding 3) on everyone. Verify: `git diff .vscode/settings.json` on a PR touching only IDE preferences — a diff to `rust-analyzer.*` keys outside a `setup` re-run is a finding. Reading heuristic, not a pure grep. Severity: SHOULD. Bazel 7-9; rules_rust current.
4. **Document the `--per-package-workspaces` find-usages trade-off in the repo's own onboarding notes before recommending it, rather than presenting it as a pure speed win.** Rationale: the doc's own text is explicit that this is a correctness trade ("find usages" misses cross-package callers), not a free performance toggle. Verify: named reading heuristic — the onboarding doc/README section on IDE setup mentions the trade-off in the same breath as the flag. **No mention while the flag is recommended = finding.** Severity: SHOULD. Bazel 7-9; rules_rust current. Settles: M-I-09.
5. **Generate `.vscode/launch.json` via `bazel run @rules_rust//tools/vscode:gen_launch_json` and require the CodeLLDB extension; never document or rely on VSCode's built-in `▶ Debug` codelens for a Bazel Rust target.** Rationale: the codelens is explicitly documented as not working for Bazel projects — pointing a new developer at it wastes their first debugging session on a dead end. Verify: `git ls-files .vscode/launch.json` returns the path, and the repo's onboarding doc names CodeLLDB. **Missing launch.json with debugging documented as supported = finding.** Severity: MUST if the repo documents Rust debugging support at all; N/A otherwise. Bazel 7-9; rules_rust current. Settles: M-I-09.
6. **Enable the clippy and/or rustfmt aspect only via `.bazelrc` `--aspects=` + `--output_groups=` lines; never invent or expect a per-target `clippy`/`rustfmt` boolean attribute on `rust_test`/`rust_library`/`rust_binary`.** Rationale: no such attribute exists in the rule's `attrs` dict — this is the single most likely hallucinated pattern for an LLM porting a `#[clippy::...]`-style mental model onto Bazel. Verify: `grep -rn '^\s*\(clippy\|rustfmt\)\s*=' **/BUILD.bazel` — a hit on either name as a rule call argument is invalid Starlark for these attrs and a finding regardless of Bazel major. `grep -n 'rust_clippy_aspect\|rustfmt_aspect' .bazelrc*` — **empty output = lints not gated at all**, which is its own separate finding for a repo claiming to enforce them. Severity: MUST. Bazel 7-9; rules_rust current. Settles: M-I-10.
7. **Register the rustfmt aspect in a CI-only `.bazelrc` config (a `--config=ci` block or a separate CI-specific rc file), never in the default `build` config that runs on every local `bazel build`.** Rationale: rustfmt's own doc states the reason directly — "so formatting issues do not impact users' ability to rapidly iterate on changes." Verify: `grep -n 'rustfmt_aspect' .bazelrc` — a hit under a bare `build --aspects=...` line (not `build:ci` or similar) is a finding; a hit scoped to a named config is a pass. Severity: SHOULD. Bazel 7-9; rules_rust current. Settles: M-I-10.
8. **Treat clippy's opt-out tags (`no_clippy`/`no-clippy`/`no_lint`/`nolint`/`noclippy`) and rustfmt's opt-out tags (`no_format`/`no-format`/`no_rustfmt`/`no-rustfmt`/`norustfmt`) as two disjoint sets — never assume one tag silences both aspects.** Rationale: read directly from each aspect's own source; the two `ignore_tags` lists share no entries. An LLM or a developer porting a Cargo `#[allow(...)]`-shaped mental model of "one lint switch" will reach for a single tag and get a false sense of coverage. Verify: for any target tagged to skip one aspect, confirm the PR/commit message states which aspect is being skipped and why; a tag from one family present with no corresponding awareness of the other aspect still running is a review-time finding, not a grep-only one. Severity: SHOULD. Bazel 7-9; rules_rust current (source-verified 0.74.0-era `main`). Settles: M-I-10.
9. **Before relying on the clippy aspect over a target tagged `no-sandbox` (or any tag causing an unsandboxed action) with `--@rules_rust//:rustc_output_diagnostics=true` set, verify the specific build order does not trigger `rules_rust#2510`, or drop `no-clippy` onto that target as a stated, temporary exception.** Rationale: this is a real, reproduced, currently-unfixed failure (`Permission denied` writing an undeclared shared output file) with zero upstream comments as of this read — treating it as fixed or as flaky-and-ignorable is wrong either way. Verify: `grep -rn 'no-sandbox\|no_sandbox' **/BUILD.bazel` cross-referenced against whether `rustc_output_diagnostics` is set anywhere in `.bazelrc`; both present together is the exact precondition — confirm a stated `no-clippy` exception exists on those targets. Severity: SHOULD (documentation of a known exception); CONSIDER if `rustc_output_diagnostics` is never set (then the bug's precondition never triggers). Bazel 7-9 (bug traced to `bazelbuild/bazel#21474`, tag-propagation default since Bazel 7.x); rules_rust current, unfixed. Settles: M-I-10.
10. **State explicitly, wherever coverage numbers are reported or reviewed, that `rust_test(crate = ...)` instruments the crate's own `#[cfg(test)]` code even without `--instrument_test_targets` — never read a Rust coverage report against the general Bazel convention that test code needs that flag.** Rationale: `coverage.md` documents this as a named, intentional inconsistency; a reviewer applying the C++/Java mental model will misread test-only code appearing in a coverage report as a leak rather than expected behavior. Verify: named reading heuristic — before citing a Rust coverage percentage in a PR or dashboard, confirm whether the target set includes any `crate = ...` unit-test wrapper; if so, the percentage includes test code by design. Severity: CONSIDER (a documentation/interpretation check, not a build-breaking one). Bazel 7-9; rules_rust current. Settles: M-I-11.
11. **Restrict `--instrumentation_filter` to workspace targets (`^//,-^//third_party` or equivalent) whenever a coverage report includes vendored or third-party crates.** Rationale: the doc's own recommended setting exists specifically to avoid unnecessary recompilation and noise from dependencies the team does not own. Verify: `grep -n 'instrumentation_filter' .bazelrc` — a coverage report run with no filter set on a repo carrying vendored crates is a finding (default filter is `-/javatests[/:],-/test/java[/:]`, which does nothing for a Rust-only tree). Severity: SHOULD. Bazel 7-9; rules_rust current.
12. **For every `rust_library`/`rust_binary` carrying a `#[cfg(test)]` module, a matching `rust_test(crate = ...)` target must exist.** Rationale: this is the direct Bazel analog of Cargo's automatic unit-test discovery; its absence is a silent, permanent test-coverage gap with no build error to surface it. Verify: named reading heuristic — grep source for `#[cfg(test)]` per crate, cross-reference against `bazel query 'kind(rust_test, //<pkg>:*)'` depending on that crate via `crate = ...`. **A crate with the source pattern and no corresponding `rust_test` = finding.** Severity: MUST for any Bazel migration claiming test parity with Cargo. Bazel 7-9; rules_rust current. Settles: M-I-12.
13. **For every file under a crate's `tests/` directory, a corresponding `rust_test` (direct or `rust_test_suite`-generated) target must exist, with `crate_root` set explicitly whenever `srcs` has more than one file.** Rationale: `crate_root` inference only covers `lib.rs`/`main.rs`/a single-file `srcs`; a test file that pulls in a shared helper via a second `srcs` entry falls outside the inference rule and needs the attribute set by hand. Verify: for each `rust_test`/`rust_test_suite`-generated target with `len(srcs) > 1`, confirm `crate_root` is set. **A multi-file `srcs` list with no `crate_root` is invalid at analysis time already (rule will fail to build)** — so the practical check is a pre-commit reading pass, not a post-hoc grep of a green build. Severity: MUST. Bazel 7-9; rules_rust current. Settles: M-I-12.
14. **Every `rust_test`/`rust_test_suite` target that reads a fixture file at runtime lists it in `data`, never bakes it in via `compile_data` or omits it and relies on an ambient path.** Rationale: `data` is documented as the attribute Bazel actually stages into the test's runfiles at both compile and run time; `compile_data` exists for compile-time-only inclusion (`include_str!()`), and a test reading a fixture path with neither will pass locally (real filesystem still has the file) and fail hermetically (in a remote sandbox, on a clean checkout, in CI) with a confusing "file not found." Verify: grep test sources for a hard-coded relative path (`std::fs::read(...)`, `include_bytes!` outside compile-time use) and cross-check the owning target's `data` list for that path. **A referenced path absent from `data` = finding.** Severity: MUST. Bazel 7-9; rules_rust current. Settles: M-I-12.
15. **For every public item with a doc comment containing a fenced Rust code block intended as a runnable example, a `rust_doc_test(crate = ...)` target must exist for that crate.** Rationale: this is the one Cargo test kind (`cargo test --doc`) that Bazel never auto-generates under any mechanism — no glob, no aspect, no macro scans doc comments for code fences the way `rust_test_suite` scans `tests/`. Verify: `grep -rn '^///.*```\|^//!.*```' src/**/*.rs` per crate, cross-referenced against `bazel query 'kind(rust_doc_test, //<pkg>:*)'` for that crate. **Fenced doc examples present with no `rust_doc_test` depending on that crate = finding; empty grep output = nothing to check, pass by default.** Severity: MUST when doc examples exist; N/A otherwise. Bazel 7-9; rules_rust current. Settles: M-I-12.
16. **Before trusting a `rust_test_suite`'s `srcs` glob as covering the intended `tests/` tree, confirm the generated `test_suite` target's resolved test list is non-empty.** Rationale: `test_suite` special-cases an empty `tests` list as "run everything in the package," and the macro's own `restrict_<name>` tag exists purely to suppress that special case — meaning a glob that matches nothing produces a green, empty, silently-passing suite with zero indication anything is wrong. Verify: `bazel query 'tests(//pkg:suite_name)'`. **Empty output on a suite whose `tests/` directory is known to contain files = finding** (glob path is wrong, directory got renamed, or the suite was never wired to real sources); non-empty output listing the expected test targets = pass. Severity: MUST. Bazel 7-9; rules_rust current (regression-tested by the ruleset's own `test/empty_suite` fixture). Settles: M-I-12.
17. **Diff test names, not just counts, when comparing a `cargo test -- --list` run against `bazel query 'kind(rust_test, //...)'` to certify migration parity.** Rationale: a `rust_test_suite`-generated name (`<suite>_<path-without-.rs>_test`) does not match Cargo's own test names, so an equal or higher Bazel count is not proof every original test made the jump — a renamed/duplicated target could hide a dropped one under the same total. Verify: named reading heuristic (no single grep substitutes for a set-diff of two differently-named lists); script the two listings and diff by normalized name if the crate count is large enough that eyeballing is unreliable. Severity: SHOULD for a migration sign-off. Bazel 7-9; rules_rust current. Settles: M-I-12.
18. **Re-run `rust_analyzer:setup` after any `MODULE.bazel` edit or `bazel clean --expunge`, and say so in the repo's own contribution docs as a recurring step.** Rationale: the doc names both events explicitly as requiring a re-run; treating `setup` as a one-time install step produces stale rust-analyzer configuration with no error, only degraded/wrong IDE behavior. Verify: named reading heuristic — the repo's CONTRIBUTING/onboarding doc names both trigger events next to the `setup` command. Severity: SHOULD. Bazel 7-9; rules_rust current. Settles: M-I-09.

## Fleet evidence

No fleet repository builds Rust under Bazel today — zero fleet repos use `rust_*` rules ([fleet-bazel-readiness.md](../bazel-audit/fleet-bazel-readiness.md), wave-1 correction 7). Every rule above is therefore CONSIDER-eligible-to-MUST purely on upstream grounding (shape F), with no repository able to exhibit a pass or a violation.

The orchestrator's own adoption decision names `bob` as the first candidate (`AGENTS.md`-analogous decision table, `bazel-frame.md` §"Decisions taken by the orchestrator"): "9 crates, clean DAG, no Python or TypeScript, no CI to preserve." `fleet-bazel-readiness.md:97,255` measures it precisely: 9 `Cargo.toml` (5 crates + 3 `playground/` crates + the workspace root), a clean `bob_cli/bob_engine/bob_graph/bob_host → bob_cas` dependency DAG, and "the simplest fleet member to model in Bazel: 8 `rust_binary`/`rust_library` targets, one clean DAG, nothing else to touch." `bob` also has **no `rust-toolchain.toml` and no MSRV pin** (`fleet-bazel-readiness.md:59,275`) — orthogonal to this dive's scope (owned by `rust-cargo`/`rust-quality`), but relevant context for whoever runs the Decision-1 checklist against it first: the `rust_analyzer:setup` step will resolve a toolchain version through whatever `rules_rust` toolchain registration the adopting `MODULE.bazel` picks, not through anything currently in `bob`'s own repo.

Nothing in the fleet exercises the coverage inconsistency (Finding 7), the sandbox bug (Finding 6/#2510), or the empty-suite trap (Finding 10) — these are upstream findings a `bob` pilot would be the first fleet instance to either confirm or avoid.

## AI-agent angle

- **Inventing a per-target `clippy`/`rustfmt` boolean attribute on `rust_test`/`rust_library`.** Neither exists; the only mechanism is the `.bazelrc` aspect + output-group pair (Finding 5). Smallest check: `grep -rn '^\s*\(clippy\|rustfmt\)\s*=' **/BUILD.bazel` — any hit fails to load already, but the *design* mistake (assuming per-target control is possible at all) is the thing to catch during review, not just at build time.
- **Assuming a single tag silences both lints.** `no-lint`/`nolint` only stops clippy; it does nothing to rustfmt, and vice versa for `no-format`/`no-rustfmt` (Finding 6). Smallest check: cross-reference any skip-tag against both `ignore_tags` lists (clippy's four names, rustfmt's three) before treating a target as "excluded from linting" in a review comment.
- **Recommending VSCode's built-in `▶ Debug` codelens for a Bazel Rust test because it works for a plain `cargo test` project.** The doc disclaims this outright (Finding 4). Smallest check: `git ls-files .vscode/launch.json` — if it's missing and debugging is documented as supported, the codelens is the (wrong) fallback being relied on.
- **Treating `--per-package-workspaces` as a free performance win with no trade-off, because the flag name reads that way.** The doc names a real correctness cost (Finding 3). Smallest check: does the PR/commit turning it on mention "find usages" anywhere? If not, the trade-off was likely never considered.
- **Assuming `cargo test --doc` behavior is automatic under Bazel because doc-comment testing "just happens" everywhere else in the Rust ecosystem.** `rust_doc_test` is a separate, mandatory-`crate`, never-auto-generated rule (Finding 9). Smallest check: `grep -rn '^///.*```' src/**/*.rs` per crate, cross-checked against `bazel query 'kind(rust_doc_test, //<pkg>:*)'` — a nonempty grep with an empty query is the exact miss.
- **Reading a Rust coverage report against the general Bazel rule "test code needs `--instrument_test_targets` to count."** For `rust_test(crate = ...)`, it does not need that flag — the crate's own `#[cfg(test)]` code is always compiled in and always instrumented (Finding 7). Smallest check: before flagging a coverage number as "suspiciously including test code," check `coverage.md`'s own documented exception first.
- **Assuming a `rust_test_suite` with a `glob(["tests/**"])` that matches nothing will fail loudly, the way an empty `deps` list or a bad label reference would.** It does not — `test_suite`'s empty-list special case plus the macro's own defensive tag produce a silent, green, empty suite (Finding 10). Smallest check: `bazel query 'tests(//pkg:suite_name)'` — empty output on a suite that should cover real files is the finding, not a pass.

## Contested / evolving

- **The clippy-aspect sandbox interaction (`#2510`) is unresolved and shows no sign of a near-term fix.** Filed 2024-02-22 against an underlying Bazel behavior (`bazelbuild/bazel#21474`, tag propagation to unsandboxed actions), still open with zero comments as of this read (2026-09-05). Trending: nowhere — no linked PR, no maintainer triage comment, only the filer's own local patch. Treat the three-condition trigger (unsandboxed target + `rustc_output_diagnostics=true` + test-before-clippy build order) as a live trap indefinitely, not a soon-to-be-fixed rough edge.
- **rust-analyzer's real-world scale ceiling is a single data point, not a curve.** mmapped.blog's ~600k-LOC, few-hundred-package account is the only concrete "it broke" report surfaced by this dive's sources, against an actively-patched tool (two rust-analyzer fixes landed in the very latest release, Finding 8). Trend, cautiously: the tooling keeps improving release over release, but nothing in the corpus states whether that specific large-scale failure mode has been closed — the honest position is "unmeasured since," not "fixed" or "still broken."
- **Whether "Cargo remains the IDE/dependency source of truth" is a stable end state is adjacent but out of this dive's scope** (`M-I-16`, contested in the pain-points survey — Tweag and mmapped.blog both land on it as stable while `rules_rust` discussion `#2879` shows `cargo-bazel`/`cargo` resolution mismatches). This dive's `rust_analyzer:setup` reduces the *IDE* half of that dependency (rust-analyzer reads Bazel's own toolchain once configured), but does not touch the *dependency-resolution* half, which belongs to the `crate-universe-lockfiles-and-repin` dive.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs/src/rust_analyzer.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/rust_analyzer.md) | Primary ruleset doc, raw from `main` | Fetched 2026-09-05 | The complete, current `rust_analyzer:setup` contract: editors, flags, troubleshooting, workspace-splitting trade-off, verbatim |
| [docs/src/clippy.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/clippy.md) | Primary ruleset doc | Fetched 2026-09-05 | Exact `.bazelrc` aspect-registration lines and the `no-clippy` tag mention |
| [docs/src/rustfmt.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/rustfmt.md) | Primary ruleset doc | Fetched 2026-09-05 | Exact rustfmt aspect setup and the explicit CI-only recommendation |
| [docs/src/coverage.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/coverage.md) | Primary ruleset doc | Fetched 2026-09-05 | States the `rust_test(crate=...)` coverage inconsistency in the ruleset's own words |
| [docs/src/rustdoc.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/rustdoc.md) | Primary ruleset doc | Fetched 2026-09-05 | Confirms `rust_doc_test` matches `cargo test --doc`, and that it's a separate rule from `rust_doc` |
| [rust/private/rust.bzl](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/rust/private/rust.bzl) | Primary rule source, raw from `main` | Fetched 2026-09-05 | Ground truth for `rust_test`/`rust_test_suite` attrs (`crate_root`, `data`, `srcs`) and the empty-suite tag defense — read the code, not a description of it |
| [rust/private/rustdoc_test.bzl](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/rust/private/rustdoc_test.bzl) | Primary rule source | Fetched 2026-09-05 | `rust_doc_test`'s mandatory `crate` attr and full doc string, confirming it is per-crate and never generated |
| [rust/private/clippy.bzl](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/rust/private/clippy.bzl) | Primary aspect source | Fetched 2026-09-05 | The exact clippy `ignore_tags` list and the hyphen/underscore, case-insensitive normalization |
| [rust/private/rustfmt.bzl](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/rust/private/rustfmt.bzl) | Primary aspect source | Fetched 2026-09-05 | The exact, *different*, rustfmt `ignore_tags` list |
| [tools/vscode/BUILD.bazel](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/tools/vscode/BUILD.bazel) | Primary BUILD source | Fetched 2026-09-05 | Confirms `gen_launch_json` is a real, public `rust_binary` target at the exact label the doc names |
| [test/empty_suite/BUILD.bazel](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/test/empty_suite/BUILD.bazel) | Primary regression-test fixture | Fetched 2026-09-05 | The ruleset's own worked proof that an empty `rust_test_suite` glob passes silently |
| [bazelbuild/rules_rust#2510](https://github.com/bazelbuild/rules_rust/issues/2510) | GitHub issue, full repro + patch | Filed 2024-02-22, open as of 2026-09-05 read | The named "open intermittent failure" from the brief, with exact preconditions and command lines, not a summary of it |
| [rules_rust 0.74.0 release notes](https://github.com/bazelbuild/rules_rust/releases/tag/0.74.0) | Primary release notes | 2026-08-28 (current pin at time of writing) | Dates the two rust-analyzer-adjacent fixes (`gen_rust_project`, Helix) landing in the very latest release |
| [PR #4200](https://github.com/bazelbuild/rules_rust/pull/4200), [PR #4199](https://github.com/bazelbuild/rules_rust/pull/4199) | Primary PR records | Merged 2026-08-28 | Confirms the two rust-analyzer fixes are real, recent, and issue-linked (`#4057`, `#4197`) |
| [mmapped.blog — Scaling Rust builds with Bazel](https://mmapped.blog/posts/17-scaling-rust-builds-with-bazel) | Practitioner account (argued), the brief's named "chase the surprise" source | Recent, undated post; describes a multi-year migration ending pre-2026 | The only concrete "it broke at scale" account in this corpus, with the codebase-size numbers the frame's scale question needs |
| [language-rulesets-canonical.md §2-4, §6](../bazel-topic-map/language-rulesets-canonical.md) | Wave-1 scout consolidation | 2026-09-05 | Cross-checked against every primary fetch above; used to confirm nothing material was missed, not cited as the source of any claim |
| [language-pain-points.md §Rust, §Contested](../bazel-topic-map/language-pain-points.md) | Wave-1 scout consolidation | 2026-09-05 | Source of the M-I-16 cross-reference and the mmapped.blog/Tweag contested framing |
| [bazel-topic-map.md, family I](../bazel-topic-map.md) | This program's own map | 2026-09-05 | M-I-09 through M-I-12 question text and priority, settled by this dive |
