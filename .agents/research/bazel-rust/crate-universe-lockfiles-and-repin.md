---
title: crate_universe lockfiles and repin
topic: crate-universe-lockfiles-and-repin
group: bazel-rust
family: BZL-RUST
agent: research-lang wave-3b worker
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 19
primary_sources_count: 14
settles: [M-I-01, M-I-02, M-I-03, M-I-04, M-I-13]
builds_on: [BZL-MOD-02, BZL-MOD-04, BZL-MOD-05, BZL-MOD-10, BZL-MOD-16, BZL-HERM-13]
scope: |
  Covers `crates_repository` vs `crates_vendor` (which fits which publication
  model), the two-lockfile model (`Cargo.lock` / `cargo-bazel-lock.json`) and
  the `determine_repin()` mechanism that ties them, the exact repin invocation
  as of rules_rust 0.74.0 post-`bazel sync` removal, the curated seven-triple
  `supported_platform_triples` default and its `O(N^2)` splicing cost, and
  whether an interrupted repin can corrupt a lockfile. Touches
  `crate.annotation()` and git-sourced crate dependencies only as far as they
  bear on the lockfile/repin question. Does NOT cover `cargo_build_script`
  hermeticity mechanics, proc-macro host/target resolution, or IDE/lint/test
  parity — those are the sibling `bazel-rust` dives
  (`cargo-build-scripts-and-cross-compilation`, `rust-ide-lint-and-test-parity`).
  Does not re-derive `Cargo.toml`/`Cargo.lock` hygiene generally (`rust-cargo`
  owns that) or generic Bzlmod lockfile mechanics (`BZL-MOD` owns that).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [1. Two rules, two publication models](#1-two-rules-two-publication-models)
   - [2. The two lockfiles and the digest that ties them](#2-the-two-lockfiles-and-the-digest-that-ties-them)
   - [3. determine_repin(): the CI drift check is already built in](#3-determine_repin-the-ci-drift-check-is-already-built-in)
   - [4. The exact repin invocation as of 0.74.0, and what replaces `bazel sync`](#4-the-exact-repin-invocation-as-of-0740-and-what-replaces-bazel-sync)
   - [5. crates_vendor's own drift check: regenerate and diff](#5-crates_vendors-own-drift-check-regenerate-and-diff)
   - [6. SUPPORTED_PLATFORM_TRIPLES and the O(N²) splicing cost](#6-supported_platform_triples-and-the-on²-splicing-cost)
   - [7. Can an interrupted repin corrupt a lockfile?](#7-can-an-interrupted-repin-corrupt-a-lockfile)
   - [8. crate.annotation(): the escape hatch](#8-crateannotation-the-escape-hatch)
   - [9. Git-sourced crates have a path; forked submodules don't](#9-git-sourced-crates-have-a-path-forked-submodules-dont)
   - [10. Bzlmod specifics: non-root modules cannot repin](#10-bzlmod-specifics-non-root-modules-cannot-repin)
   - [11. Under active repair, not stable legacy](#11-under-active-repair-not-stable-legacy)
   - [12. Docs lag: the rendered page still tells you to run a removed command](#12-docs-lag-the-rendered-page-still-tells-you-to-run-a-removed-command)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `crates_repository` (WORKSPACE) / `crate.from_cargo` (bzlmod) generates BUILD files into an external repo at fetch time; `crates_vendor` writes real, checked-in BUILD files via `mode = "remote"` (default) or `"local"` — [crates_vendor.bzl:596-600](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/crates_vendor.bzl#L596-L600).
- Default to `crates_repository`/`from_cargo` for a leaf repo; default to `crates_vendor` once the repo is itself consumed by other Bazel workspaces or modules — the ruleset's own doc names this criterion, and bzlmod's non-root path structurally cannot repin (finding 10).
- Two lockfiles exist because Cargo owns dependency *resolution* (`Cargo.lock`) and cargo-bazel owns Bazel-target *rendering* (`cargo-bazel-lock.json`); a digest over both plus the config and manifests is what detects drift between them.
- The CI drift check for `crates_repository`/`from_cargo` needs **no extra flag**: `determine_repin()` runs `cargo-bazel query` on every ordinary build and hard-`fail()`s on a digest mismatch unless `CARGO_BAZEL_REPIN` is set — [generate_utils.bzl:404-437](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/generate_utils.bzl#L404-L437). This is stricter-by-default than Bzlmod's opt-in `--lockfile_mode=error` (BZL-MOD-02).
- That gate only exists if a `lockfile` attribute is set at all. Omit it and `determine_repin()` returns `True` unconditionally — every build silently re-splices, with no possible freshness check — [crates_repository.bzl:401-402](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/generate_utils.bzl#L400-L402).
- `bazel sync`, the command every source (including rules_rust's own current docs) tells you to run for repinning, was removed in Bazel 9.0.0; Bazel's own changelog says "Use `bazel fetch --all` instead" — [bazel CHANGELOG.md, 9.0.0-pre.20250526.2](https://github.com/bazelbuild/bazel/blob/master/CHANGELOG.md).
- The scoped replacement for `CARGO_BAZEL_REPIN=1 bazel sync --only=<repo>` is `CARGO_BAZEL_REPIN=1 bazel fetch --repo=@<repo>` (bzlmod) or any ordinary build/test of a target under that repo — `bazel fetch --repo`/`--configure`/`--force` are documented flags of the still-present `fetch` command — [FetchOptions.java](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/bazel/commands/FetchOptions.java).
- `crates_vendor` has no such built-in fail-fast gate — its output is committed code no build re-derives. Its CI drift check is "regenerate, then diff": `bazel run //<pkg>:crates_vendor && git diff --exit-code`, the same shape as BZL-MOD-10's `bazel mod tidy` check.
- `crates_vendor`'s CLI also exposes `--dry-run` ("outputs will be printed instead of written to disk") for a lower-cost preview — [vendor.rs:78-80](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/src/cli/vendor.rs#L78-L80).
- `SUPPORTED_PLATFORM_TRIPLES` is a curated seven — `aarch64-apple-darwin`, `aarch64-unknown-linux-gnu`, `wasm32-unknown-unknown`, `wasm32-wasip1`, `x86_64-pc-windows-msvc`, `x86_64-unknown-linux-gnu`, `x86_64-unknown-nixos-gnu` — because splicing is `O(N²)` per triple added, per the ruleset's own source comment. Intel macOS and ARM64 Windows are silently absent from the default.
- `cargo-bazel`'s lockfile write is a plain `fs::write`, not a temp-file-then-rename — an interrupted repin (Ctrl-C, CI timeout, OOM) can leave a truncated, unparseable `cargo-bazel-lock.json` — [lockfile.rs:41-58](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/src/lockfile.rs#L41-L58).
- That corruption is not silent: the next `query` call `bail!`s with "Could not load lockfile" rather than trusting a partial file — [query.rs:52](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/src/cli/query.rs#L52). Recovery is manual (`git checkout` the lockfile, or repin again).
- In bzlmod, a **non-root** module's `crate.from_cargo`/`from_specs` call cannot repin at all — the digest check is skipped unconditionally and a missing `lockfile` is a hard `fail()` — [extensions.bzl:611-625](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/extensions.bzl#L611-L625).
- A pinned-rev git dependency in `Cargo.lock` (`git = "...", rev = "..."`) has a clean, native crate_universe path (`SourceAnnotation::Git`); a forked git submodule with local patches does not, and stays a `BZL-ARCH`/`git_override` decision instead.
- The 0.74.0 release (2026-08-28) landed at least seven distinct crate_universe correctness fixes — a lockfile-checksum bug for non-root repos, a cargo-lock schema bump, Windows GNU staticlib naming, `.bazelignore`-aware splicing, vendoring's buildifier-config handling, lockfile-size reduction, and a build-script override-key fix. This is actively repaired machinery, not settled legacy code, as of 2026-09-05.
- The current `CARGO_BAZEL_REPIN` value grammar (`metadata.rs` on `main`) silently treats any unrecognized string as a package name for `cargo update --package <string>`, not an error — a typo'd value fails with a confusing "package not found," not a clear "bad repin value."
- The repin-value alias `minimal` (→ `cargo update --workspace`) exists in current source but is undocumented in both the `crates_repository.bzl` docstring table and the rendered bzlmod docs page.

## Findings

### 1. Two rules, two publication models

`crates_repository` is a `repository_rule()`: it runs at fetch time and generates BUILD/`.bzl` content into an external repo that never appears in the consuming workspace's own source tree. `crates_vendor` is a plain `rule()` (`executable = True`, meant to be `bazel run`) that writes real files into the workspace: `mode = "remote"` (default) writes only BUILD files, still fetching crate source via generated repository rules; `mode = "local"` additionally checks in the crate source itself — [crates_vendor.bzl:549-560](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/crates_vendor.bzl#L549-L560).

The ruleset's own doc states the criterion directly: `crates_vendor` is "useful for users whose workspaces are expected to be consumed in other workspaces as the rendered BUILD files reduce the number of workspace dependencies, allowing for easier loads" — [crates_vendor.bzl:596-600](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/crates_vendor.bzl#L596-L600). A consumer of a `crates_vendor`-published repo gets plain BUILD files and never fetches the `cargo-bazel` binary or evaluates a repository rule at all.

### 2. The two lockfiles and the digest that ties them

`Cargo.lock` (attribute `cargo_lockfile`) is Cargo's own dependency-resolution record. `cargo-bazel-lock.json` (attribute `lockfile`) is cargo-bazel's own record of the *rendered Bazel targets* — package graph, checksums, build-script metadata — plus a `checksum` field. `get_lockfiles()` resolves both paths; both are `repository_ctx.watch()`ed, along with every manifest — [crates_repository.bzl:49-57](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/crates_repository.bzl#L49-L57), [generate_utils.bzl:349-363](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/generate_utils.bzl#L349-L363).

The `checksum` is a SHA-256 over the resolved crate graph (re-derived from the current manifests via `SplicingMetadata`), the render/splicing config, and the `cargo`/`rustc`/`cargo-bazel` versions — [lockfile.rs:106-151](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/src/lockfile.rs#L106-L151). This means editing `Cargo.toml`, bumping the registered Rust toolchain, or bumping the rules_rust/cargo-bazel version all change the expected digest — any of the three forces a repin, which is why "just edit `Cargo.toml`" without repinning is exactly the drift the sibling `rust-cargo` lore set's glob cannot catch on its own (map M-I-02).

### 3. determine_repin(): the CI drift check is already built in

`determine_repin()` is called from both `crates_repository`'s `_impl` and, identically, from the bzlmod module extension's `_generate_hub_and_spokes` — [crates_repository.bzl:76-84](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/crates_repository.bzl#L76-L84), [extensions.bzl:626-634](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/extensions.bzl#L626-L634). Its logic, in order:

1. If `CARGO_BAZEL_REPIN`/`REPIN` is set to anything other than `false`/`no`/`0`/`off`, repin unconditionally (subject to `CARGO_BAZEL_REPIN_ONLY` scoping).
2. If no `lockfile` attribute was set at all, repin unconditionally — silently, forever, with no gate.
3. Otherwise run `cargo-bazel query --lockfile <lockfile> --config <config> --splicing-manifest <manifest>`. That subcommand recomputes the digest and `bail!`s if it doesn't match the one stored in the lockfile — [query.rs:39-88](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/src/cli/query.rs#L39-L88).
4. A nonzero exit from that query becomes a hard `fail()` in Starlark, naming the repository and printing `repin_instructions` if one was configured — [generate_utils.bzl:418-437](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/generate_utils.bzl#L418-L437).

The practical result: **any ordinary `bazel build`/`bazel test`/`bazel fetch` of a target depending on the crate repo already fails loudly on drift**, provided a `lockfile` is configured and `CARGO_BAZEL_REPIN` is unset in that job's environment. Unlike Bzlmod's `--lockfile_mode=error` (BZL-MOD-02), no flag needs to be added to a CI leg — the flag that needs to be *absent* is `CARGO_BAZEL_REPIN` itself.

### 4. The exact repin invocation as of 0.74.0, and what replaces `bazel sync`

Every source that documents repinning — the `crates_repository.bzl` docstring, `extensions.bzl`'s bzlmod doc, and both practitioner blogs surveyed below — gives the same recipe:

```shell
CARGO_BAZEL_REPIN=1 bazel sync --only=crate_index
```

`bazel sync` was removed in Bazel 9.0.0. Bazel's own changelog, under the 9.0.0-pre.20250526.2 pre-release notes (2025-06-10, ahead of the 2026-01-20 GA per the frame's wave-1 correction), states plainly: "The `bazel sync` command has been removed. Use `bazel fetch --all` instead." — [CHANGELOG.md](https://github.com/bazelbuild/bazel/blob/master/CHANGELOG.md).

`bazel fetch` is not gone, and still documents a scoped-fetch flag equivalent to `sync --only`:

```java
// FetchOptions.java
"all"      // default if no other flags/args; fetch every external repo
"repo"     // repeatable; "Only fetches the specified repository ... @apparent_repo_name or @@canonical_repo_name"
"configure"// only `configure = True` repos
"force"    // ignore an existing repo and re-fetch
```

— [FetchOptions.java](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/bazel/commands/FetchOptions.java) (bzlmod-only flags).

The Bazel-9-safe, scoped replacement is:

```shell
CARGO_BAZEL_REPIN=1 bazel fetch --repo=@crate_index    # bzlmod apparent name
CARGO_BAZEL_REPIN=1 bazel fetch --repo=@@rules_rust++crate++crate_index   # canonical name form
```

Because `CARGO_BAZEL_REPIN` is declared in the repository rule's/module extension's `environ` (`CRATES_REPOSITORY_ENVIRON`), setting it also forces re-evaluation on any command that needs the repo at all — an ordinary `CARGO_BAZEL_REPIN=1 bazel build @crate_index//...` works identically on every Bazel version, 7 through 9, and is what a real bzlmod bug repro used to reproduce a lockfile-checksum bug before this fix landed: `CARGO_BAZEL_REPIN=1 bazel build @module1//:main` — [rules_rust#3521](https://github.com/bazelbuild/rules_rust/issues/3521).

### 5. crates_vendor's own drift check: regenerate and diff

`crates_vendor`'s output is committed source. Nothing rebuilds it automatically, and `determine_repin()`'s fail-fast digest check only guards fetch-time repos, not files already checked in. The correct CI check reuses BZL-MOD-10's "regenerate, then diff" shape rather than crate_universe's own mechanism:

```shell
bazel run //3rdparty:crates_vendor
git diff --exit-code -- 3rdparty/crates
```

Exit 0 (empty diff) = the vendored tree matches what regeneration produces = pass. A non-empty diff is stale vendored output that must be reviewed and committed before merge — exactly the pattern BZL-MOD-10 already establishes for `bazel mod tidy`.

The `crates_vendor` binary separately accepts its own `--repin`/`-dry-run` flags, forwarded through a generated wrapper script that appends `"$@"` after the rule's own fixed args — [crates_vendor.bzl:39-43](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/crates_vendor.bzl#L39-L43), [vendor.rs:62-64,78-80](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/src/cli/vendor.rs#L62-L80):

```shell
bazel run //3rdparty:crates_vendor -- --repin      # cargo update --workspace, then regenerate
bazel run //3rdparty:crates_vendor -- --dry-run    # print output instead of writing; cheap preview
```

### 6. SUPPORTED_PLATFORM_TRIPLES and the O(N²) splicing cost

The default triple list carries its own rationale as a source comment:

```python
# A reduced subset of platform triples that cover a wide range of known users.
# The reduced set is intended to speed up the splciing step which has `O(N^2)`
# complexity for each platform triple added.
SUPPORTED_PLATFORM_TRIPLES = [
    "aarch64-apple-darwin",
    "aarch64-unknown-linux-gnu",
    "wasm32-unknown-unknown",
    "wasm32-wasip1",
    "x86_64-pc-windows-msvc",
    "x86_64-unknown-linux-gnu",
    "x86_64-unknown-nixos-gnu",
]
```

— [crates_repository.bzl:26-37](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/crates_repository.bzl#L26-L37) (identical list re-declared in `crates_vendor.bzl` via `rust/platform/triple_mappings.bzl`). Notably absent: Intel macOS (`x86_64-apple-darwin`) and ARM64 Windows (`aarch64-pc-windows-msvc`) — both still-common developer/CI host platforms that require an explicit `supported_platform_triples` override, at the quadratic cost the comment names, before they resolve correctly.

### 7. Can an interrupted repin corrupt a lockfile?

Yes, in the narrow sense of "leave an unparseable file on disk," and no, in the sense of "get silently trusted afterward." The write path is a plain, non-atomic write:

```rust
// lockfile.rs
pub(crate) fn write_lockfile(lockfile: Context, path: &Path, dry_run: bool) -> Result<()> {
    let content = serde_json::to_string_pretty(&value)?;
    if dry_run {
        println!("{content:#?}");
    } else {
        fs::create_dir_all(parent)?;
        fs::write(path, content + "\n")   // <-- no temp file, no rename
            .context(...)?;
    }
    Ok(())
}
```

— [lockfile.rs:41-58](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/src/lockfile.rs#L41-L58). There is no temp-file-then-rename pattern, so a process killed mid-write (CI job timeout, OOM kill, Ctrl-C) can leave a truncated JSON file. The next `determine_repin()` call, however, does not treat a corrupt file as "up to date": `query` explicitly `bail!`s with "Could not load lockfile" on a parse failure and "No digest provided in lockfile" if the `checksum` field is missing — [query.rs:52,58](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/src/cli/query.rs#L52). The failure is loud, not silent — but recovery (re-run repin, or `git checkout` the last-good lockfile) is manual; nothing auto-heals it.

This is a distinct failure class from BZL-MOD-04's merge-driver problem (a *merge*, not a *write*, corrupting the file) — both end in an unparseable JSON lockfile, and both are caught by the same read: `python3 -c "import json; json.load(open('cargo-bazel-lock.json'))"`, the identical shape BZL-MOD-05 uses for `MODULE.bazel.lock`'s `lockFileVersion` check.

### 8. crate.annotation(): the escape hatch

`crate.annotation()` is the mechanism for changing a third-party crate's generated targets without forking it. The full parameter surface — [crate.bzl:88-201](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/crate.bzl#L88-L201) — includes `additive_build_file[_content]` (extra BUILD content), `build_script_env`/`build_script_data`/`build_script_deps` (feed a build script inputs it needs), `build_script_use_cc_toolchain` (force-enable/disable pulling in the resolved `cc_toolchain`), `override_targets` (swap in an alternate `proc-macro`/`custom-build`/`lib`/`bin` target per crate — the parent repo's own escape hatch), `patches`/`patch_args`/`patch_tool` (apply a source patch without a full fork), and `shallow_since` (a git-source fetch-speed hint). This dive covers it only to the extent it interacts with the digest/lockfile; the sibling `cargo-build-scripts-and-cross-compilation` dive owns the build-script hermeticity mechanics themselves.

**Trap:** the WORKSPACE-era macro (`crate.bzl`'s `_annotation()`) and the bzlmod tag class (`extensions.bzl`'s `_ANNOTATION_NORMAL_ATTRS`) are documented as kept "in sync" ([extensions.bzl:1290](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/extensions.bzl#L1290)) but do not share value encodings: `build_script_use_cc_toolchain` is an `int` (unset/`1`/`0`) in the macro, but a three-valued **string** (`"auto"`/`"on"`/`"off"`, default `"auto"`) in the bzlmod tag class — [extensions.bzl:1322-1330](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/extensions.bzl#L1322-L1330). Porting an annotation between the two forms by pattern-matching alone silently changes its type.

### 9. Git-sourced crates have a path; forked submodules don't

`crate_context.rs` models a git-sourced `Cargo.lock` entry as a first-class `SourceAnnotation::Git` variant, carrying `shallow_since`, `patch_args`, `patch_tool`, and `patches` — [crate_context.rs:795-812](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/src/context/crate_context.rs#L795-L812). Any `Cargo.lock` entry with `source = "git+https://...#<sha>"` splices and renders exactly like a registry crate — no special crate_universe configuration is required beyond an optional `crate.annotation(shallow_since = ...)` for fetch speed. Cargo's own guidance (echoed in `crate.spec()`'s docstring) is to prefer `rev` over `branch`/`tag` "for fully-reproducible builds" — [crate.bzl:46-48](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/crate.bzl#L46-L48).

A **forked git submodule** consumed via a Cargo `path` dependency is a different shape entirely: it has no `Cargo.lock` entry at all (path deps are locally resolved, not locked), so crate_universe never sees it and cannot render it. `crate_universe` also separately "ignores path dependencies" for ordinary in-workspace crates, forcing hand-written internal `deps` — [Tweag, 2023-07-27](https://www.tweag.io/blog/2023-07-27-building-rust-workspace-with-bazel/) (map M-I-06, out of this dive's scope). Turning a forked-submodule dependency into a Bazel-native one is a `git_override`/`bazel_dep` decision that belongs to `BZL-ARCH`, not to crate_universe's lockfile machinery.

### 10. Bzlmod specifics: non-root modules cannot repin

The bzlmod module extension (`crate.from_cargo`/`from_specs`) runs the identical `_generate_hub_and_spokes` path for every module that calls it, root or not. For a **non-root** (transitive/consumed) module, repinning is disabled unconditionally and a missing lockfile is a hard error:

```python
# extensions.bzl:611-625
if not is_root:
    if not lockfile:
        fail(("crate_universe extension call `{}` is in a non-root module " +
              "but has no lockfile. Transitive crate_universe repositories " +
              "must ship a `lockfile = ...` because repinning is not " +
              "supported across module boundaries.").format(cfg.name))
    repin = False
else:
    repin = not lockfile or determine_repin(...)
```

The reasoning is in the ruleset's own comment: the digest check would fail across `rust`/`cargo`/`rules_rust` version differences between the producing module and the consumer, and the producer's lockfile typically lives in a read-only bzlmod cache the consumer cannot write to anyway — [extensions.bzl:564-570](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/extensions.bzl#L564-L570). A module published for others to depend on (BCR or otherwise) that uses `crate.from_cargo` must ship a working, current lockfile permanently — there is no repin-in-CI safety net once someone else consumes it as a non-root dependency.

Separately: `reproducible` on the `crate` module extension starts `True` and flips to `False` the moment either `cfg.lockfile` or `cfg.cargo_lockfile` is unset — [extensions.bzl:1176-1186](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/extensions.bzl#L1176-L1186), gated behind `bazel_features.external_deps.extension_metadata_has_reproducible`. This is the `BZL-MOD-16`/module-extension-purity lockfile-exclusion mechanism, not the local or remote `--repo_contents_cache`; an unpinned `crate.from_cargo` call always writes an entry into `MODULE.bazel.lock`.

### 11. Under active repair, not stable legacy

The brief's premise — that the 0.74.0 changelog is *entirely* crate_universe correctness fixes — overstates it: 0.74.0 (2026-08-28) also shipped bindgen, RISC-V toolchain, rustdoc, and dynamic-library changes unrelated to crate_universe. The corrected, still-striking count: **seven** of roughly 32 changelog entries are crate_universe-specific fixes landed in the six weeks before this release —

| PR | Fix |
|---|---|
| [#3866](https://github.com/bazelbuild/rules_rust/pull/3866) | Lockfile checksum bug for a non-root bzlmod repo (fixes [#3521](https://github.com/bazelbuild/rules_rust/issues/3521)) |
| [#4228](https://github.com/bazelbuild/rules_rust/pull/4228) | `cargo-lock` crate upgraded v10 → v11 |
| [#4231](https://github.com/bazelbuild/rules_rust/pull/4231) | Windows GNU staticlib output naming |
| [#4219](https://github.com/bazelbuild/rules_rust/pull/4219) | Splicer now follows `.bazelignore` |
| [#4205](https://github.com/bazelbuild/rules_rust/pull/4205) | Vendoring ignores pre-existing buildifier configs |
| [#4133](https://github.com/bazelbuild/rules_rust/pull/4133) | `cargo-bazel-lock.json` size reduced ("avoiding unnecessary serialization") |
| [#4226](https://github.com/bazelbuild/rules_rust/pull/4226) | Custom build-script override key names fixed |

— [rules_rust 0.74.0 release notes](https://github.com/bazelbuild/rules_rust/releases/tag/0.74.0). This is active repair of exactly the lockfile/splicing/rendering machinery this dive covers, dated 2026-08-28 — three days before the era date of this research. No rule in this file should be read as describing settled, unchanging behavior.

### 12. Docs lag: the rendered page still tells you to run a removed command

Both the `main`-branch `extensions.bzl` bzlmod docstring ([L128-143](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/extensions.bzl#L128-L143), commit `51f3042`, 2026-09-02) and the live rendered page at `bazelbuild.github.io/rules_rust/crate_universe_bzlmod.html` (fetched 2026-09-05) print:

```shell
CARGO_BAZEL_REPIN=1 bazel sync --only=crates
```

eight months after Bazel 9.0.0 deleted the `sync` command. This is not a historical artifact in an old blog post — it is the ruleset's own current, canonical documentation, still live as of the date of this research. A second, smaller docs/source mismatch: the repin-value table rendered in that same docstring (`true`/`1`/`yes`/`on`/`workspace` → `cargo update --workspace`) omits `minimal`, an alias for the same value present in current source — [metadata.rs:50](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/src/metadata.rs#L50).

## Decisions

**1. Default rule: `crates_repository`/`crate.from_cargo`, switching to `crates_vendor` once the repo is consumed by other Bazel workspaces.**
Evidence: the ruleset's own doc names "workspaces expected to be consumed in other workspaces" as `crates_vendor`'s reason to exist (finding 1); bzlmod's non-root path structurally forbids repinning and requires a permanently-fresh committed lockfile instead (finding 10) — a maintenance burden `crates_vendor`'s checked-in BUILD files sidestep for the consumer entirely.
Assumption: "consumed by other workspaces" means anything with a `bazel_dep`/`git_override`/BCR publication on this repo, now or planned — not merely "this repo has more than one target."

**2. CI drift check: no new mechanism needed, but the two rules need different recipes.**
`crates_repository`/`from_cargo`: ensure `lockfile =` is always set, then treat any ordinary build/test job that leaves `CARGO_BAZEL_REPIN` unset as the gate — `determine_repin()` already fails the build on drift (finding 3). No `--locked`-equivalent flag needs to be invented or added.
`crates_vendor`: regenerate and diff — `bazel run //<pkg>:crates_vendor && git diff --exit-code`, reusing BZL-MOD-10's shape (finding 5).
Evidence: `determine_repin()`'s unconditional `fail()` (generate_utils.bzl:418-437) for the first; the absence of any equivalent fail-fast for committed output for the second.
Assumption: the CI job invoking the drift check does not itself set `CARGO_BAZEL_REPIN` (or, for a scheduled canary leg, deliberately does — mirroring BZL-MOD-02's `refresh` canary).

**3. crate_universe's two-lockfile model needs its own `BZL-RUST` rules, but not its own verification shape.**
The mechanism (env-var-triggered repin, a `checksum` digest, a `lockfile` attribute) is entirely different from Bzlmod's `--lockfile_mode`/`MODULE.bazel.lock`, so the rules describing *how to configure it correctly* (candidates 1, 4, 6, 9, 14 below) are `BZL-RUST`-specific and cannot be folded into `BZL-MOD`. But the *verification shape* for the two failure classes this family already understands — "fail loud on drift, no flag needed" and "regenerate then diff, JSON-unaware merge is unsafe, validate with `json.load`" — is identical to BZL-MOD-02/-04/-05/-10 and is reused verbatim rather than reinvented (candidates 7, 12, 17 below cite the specific BZL-MOD ID each reuses).
Assumption: a future `BZL-RUST` depth file consolidates these candidates under its own numbering; this dive does not assign final `BZL-RUST-nn` IDs.

**4. M-I-13 (git dependency crate_universe path) splits into two answers.** A pinned-rev git crate dependency in `Cargo.lock` has a full, native crate_universe path (finding 9) — settled here. A forked git submodule consumed via a path dependency has no crate_universe or Bzlmod analogue and is explicitly left to `BZL-ARCH`'s `git_override`-vs-`bazel_dep` decision, consistent with `bazel-bzlmod-and-repo-rules.md`'s own scoping of the fleet's submodule lineage to that family.

## Normative guidance candidates

1. **Always set an explicit `lockfile` (WORKSPACE: `lockfile = "//:cargo-bazel-lock.json"`; bzlmod: `crate.from_cargo(lockfile = ...)`) on every crate-universe instance.** Rationale: without it `determine_repin()` returns `True` unconditionally (generate_utils.bzl:400-402) — every build silently re-splices, and no freshness gate is even possible. Verify: `grep -B2 -A20 'crates_repository(\|crate\.from_cargo(' WORKSPACE* MODULE.bazel` and confirm a `lockfile =`/`lockfile=` line in each block. EMPTY (no instance without one) = pass. MUST. Bazel 7/8/9; rules_rust 0.74.0. Settles M-I-02.
2. **Treat an ordinary build/test job with `CARGO_BAZEL_REPIN` unset as the crate-universe drift gate; do not build a separate check.** Rationale: `determine_repin()` already `fail()`s on a digest mismatch (generate_utils.bzl:404-437) — this is stricter-by-default than Bzlmod's opt-in `--lockfile_mode=error`. Verify: `grep -rn 'CARGO_BAZEL_REPIN\|REPIN' .github/workflows/ .bazelrc*` in the job(s) that build/test the crate repo's consumers. EMPTY there = the default gate is intact. MUST. Bazel 7/8/9; rules_rust 0.74.0. Settles M-I-02, M-I-03.
3. **Never set `CARGO_BAZEL_REPIN`/`REPIN` in a base or always-on CI env block; scope it to one manually-triggered or `workflow_dispatch`/`schedule`-only job.** Rationale: inverse of candidate 2's gate — an always-on repin silently regenerates the lockfile on every run instead of catching drift. Verify: same grep as candidate 2; any hit must resolve to a job gated on manual/schedule trigger, not `push`/`pull_request`. MUST. Bazel 7/8/9; rules_rust 0.74.0.
4. **Replace `CARGO_BAZEL_REPIN=1 bazel sync --only=<repo>` with `CARGO_BAZEL_REPIN=1 bazel fetch --repo=@<repo>` (bzlmod) or a plain build of a target under the repo.** Rationale: `bazel sync` was removed in Bazel 9.0.0 ("Use `bazel fetch --all` instead" — Bazel CHANGELOG.md); the old recipe hard-fails with "command not found" the day the pin crosses 9.0.0. Verify: `grep -rn 'bazel sync' . --include='*.md' --include='*.sh' --include='*.yml'` across the adopting repo's own docs/scripts. EMPTY = pass. MUST on Bazel 9+; SHOULD proactively on 8 (works today, breaks on upgrade). Bazel 9.0.0+; rules_rust 0.74.0. Settles M-I-03.
5. **Do not hand-copy the repin-value table from the `crates_repository.bzl` docstring as exhaustive; read the pinned version's `CargoUpdateRequest::FromStr` before writing tooling that branches on `CARGO_BAZEL_REPIN`'s value.** Rationale: current source (`metadata.rs:40-59`) accepts an undocumented `minimal` alias for `workspace`, and treats any other string as a `--package <string>` request rather than an error — a typo produces a confusing cargo "package not found," not a clear repin-syntax error. Verify: reading heuristic — no grep substitutes for reading the enum on the exact pinned rules_rust release. CONSIDER. rules_rust 0.74.0, dated 2026-09-05. Settles M-I-03.
6. **Default to `crates_repository`/`crate.from_cargo` for a repo not consumed by other Bazel workspaces; switch to `crates_vendor` (`mode = "remote"`) the moment it is (a BCR module, an internal platform library another module `bazel_dep`s on).** Rationale: `crates_vendor`'s own doc names this exact use case (crates_vendor.bzl:596-600); a non-root bzlmod consumer of `crate.from_cargo` can never repin and must trust a producer-owned lockfile forever (finding 10) — `crates_vendor`'s checked-in BUILD files remove that dependency entirely for the consumer. Verify: reading heuristic — does anything outside this repo `bazel_dep`/`git_override`/BCR-publish on it? If yes and `crates_repository`/`from_cargo` is in use, that is a finding to discuss, not a mechanical failure. SHOULD. Bazel 7/8/9; rules_rust 0.74.0. Settles M-I-01.
7. **For a `crates_vendor` setup, the CI drift check is `bazel run //<pkg>:crates_vendor && git diff --exit-code -- <vendor_path>`; a green build alone proves nothing about vendored-tree freshness.** Rationale: `crates_vendor` writes committed files that no ordinary build re-derives — the only thing that catches staleness is regenerating and diffing, the same shape BZL-MOD-10 uses for `bazel mod tidy`. Verify: the two-command pipeline above; exit 0 (empty diff) = pass. MUST once `crates_vendor` is adopted. Bazel 7/8/9; rules_rust 0.74.0. Settles M-I-02. Depends on: BZL-MOD-10 (shape reused).
8. **Tag every `crates_vendor` target `tags = ["manual"]`.** Rationale: it is `executable = True` and meant to be `bazel run`, not built by a wildcard; the ruleset's own example carries the tag (crates_vendor.bzl:634). Verify: `bazel query 'attr(tags, manual, kind(crates_vendor, //...))'` count must equal `bazel query 'kind(crates_vendor, //...)'` count. Equal (including both EMPTY, meaning no `crates_vendor` targets exist) = pass. SHOULD. Bazel 7/8/9; rules_rust 0.74.0.
9. **Extend `supported_platform_triples` explicitly for any CI/dev host platform outside the default seven — notably Intel macOS (`x86_64-apple-darwin`) and ARM64 Windows (`aarch64-pc-windows-msvc`), neither of which ships in the default.** Rationale: the ruleset's own comment states splicing cost is `O(N²)` per triple added (crates_repository.bzl:26-28), which is exactly why the default is curated rather than exhaustive — but that curation silently excludes two common host platforms. Verify: cross-reference the CI matrix's `--platforms=`/OS list against `supported_platform_triples`; any CI platform absent from the list is the finding. This check reads only the calling `BUILD`/`MODULE.bazel`, not the generated crate-repo content it configures — generated-repo `.bzl`/BUILD text stays out of a grep's reach. MUST when that platform is in the CI matrix. Bazel 7/8/9; rules_rust 0.74.0. Settles M-I-04.
10. **Never add a platform triple to `supported_platform_triples` "just in case."** Rationale: same `O(N²)` cost applies per triple added, whether or not anything actually builds for it, on every repin and every `generate` run. Verify: for each entry in `supported_platform_triples`, confirm at least one CI target/platform actually resolves to it; an entry with none is the finding. CONSIDER. Bazel 7/8/9; rules_rust 0.74.0. Settles M-I-04.
11. **A pinned-rev git dependency (`git = "...", rev = "..."`) needs no special crate_universe configuration; a forked git submodule needs a `BZL-ARCH` decision instead — never conflate the two.** Rationale: crate_universe models a git-sourced `Cargo.lock` entry natively as `SourceAnnotation::Git` (crate_context.rs:795-812); a submodule consumed via a Cargo `path` dependency never appears in `Cargo.lock` at all and crate_universe cannot see it. Verify: `grep -A2 'source = "git+' Cargo.lock` — an entry with a `#<sha>` suffix is already `rev`-pinned and needs nothing further; separately confirm no submodule path appears as a `[[package]] source` (it structurally cannot). SHOULD (prefer `rev` over `branch`/`tag`, per Cargo's own reproducibility guidance). Bazel 7/8/9; rules_rust 0.74.0. Settles M-I-13.
12. **After any suspected interrupted repin (killed CI job, Ctrl-C, OOM), validate the lockfile parses before trusting it: `python3 -c "import json; json.load(open('cargo-bazel-lock.json'))"`.** Rationale: `write_lockfile` uses a plain `fs::write`, no temp-file-then-rename (lockfile.rs:41-58) — a mid-write kill can leave a truncated file. The failure surfaces loudly on the next `query` call ("Could not load lockfile," query.rs:52) but nothing auto-repairs it. Verify: the command above; a parse error IS the finding, and the fix is `git checkout` the last-good lockfile or repin again. MUST as a recovery step. Bazel 7/8/9; rules_rust 0.74.0. Settles M-I-03. Depends on: BZL-MOD-05 (verification shape reused verbatim).
13. **Do not describe crate_universe as stable or low-risk legacy machinery in guidance dated after 2026-08-28.** Rationale: the 0.74.0 release alone landed seven crate_universe-specific correctness fixes (lockfile checksum, cargo-lock schema, Windows naming, splicer `.bazelignore` handling, vendoring buildifier-config handling, lockfile size, build-script override keys) in the preceding six weeks (finding 11) — this is active repair, not dormant code. Verify: reading heuristic — read the pinned rules_rust version's own CHANGELOG.md/release notes and count crate_universe-tagged entries before asserting stability. CONSIDER. rules_rust 0.74.0, dated 2026-09-05.
14. **In bzlmod, a non-root module's `crate.from_cargo`/`from_specs` call must always set `lockfile =`; omitting it is a hard failure the moment any other module depends on it, not a warning.** Rationale: `_generate_hub_and_spokes` `fail()`s a non-root module with no lockfile outright, and even with one, its digest check is skipped unconditionally — the crate graph is trusted as pinned forever from the consumer's perspective (extensions.bzl:611-625). Verify: `grep -n 'from_cargo\|from_specs' MODULE.bazel` in a module that is not the workspace root; confirm `lockfile =` is present in the same call. MUST. Bazel 7/8/9 (bzlmod only); rules_rust 0.74.0. Settles M-I-01, M-I-02.
15. **Do not follow the rendered `crate_universe_bzlmod.html`/`crate_universe_workspace.html` repin example verbatim; confirm the command against `bazel help fetch` on the pinned Bazel version first.** Rationale: as of 2026-09-05 both the docstring source and the rendered docs page instruct `bazel sync --only=crates`, a command deleted eight months before Bazel 9.0.0 GA (finding 12). Verify: `bazel help fetch` on the pinned version, confirming `--repo`/`--all`/`--configure`/`--force` are the live flag surface. MUST for anyone authoring guidance from these docs. Bazel 9+; rules_rust main@51f3042 (2026-09-02) still carries the stale text.
16. **Scope `CARGO_BAZEL_ISOLATED=false` to the specific job(s) resolving from a private crate registry; never set it globally.** Rationale: `isolated = True` (the default) exists specifically to prevent host `~/.cargo/config.toml` state from leaking into generated targets (crates_repository.bzl "isolated" attr doc); disabling it everywhere reintroduces exactly that leakage for jobs that never needed a private registry in the first place. Verify: `grep -rn 'CARGO_BAZEL_ISOLATED' .bazelrc* .github/workflows/`; each hit should be scoped to a private-registry job, not a global/base config. SHOULD. Bazel 7/8/9; rules_rust 0.74.0.
17. **A `cargo-bazel-lock.json`/`Cargo.Bazel.lock` merge conflict follows the same discipline as `MODULE.bazel.lock`: a JSON-aware merge driver, never `union`/`ours`, and on conflict regenerate via repin rather than hand-editing the `checksum` field.** Rationale: identical risk shape to `MODULE.bazel.lock` — an opaque, generator-computed digest that a line-based merge desyncs with no visible conflict markers. Verify: `git check-attr merge cargo-bazel-lock.json` (or the WORKSPACE-mode file's configured name). Anything other than a JSON-aware driver = FINDING. MUST. Bazel 7/8/9; rules_rust 0.74.0. Settles M-I-02. Depends on: BZL-MOD-04 (shape reused verbatim).
18. **Never hardcode `cargo-bazel-lock.json`'s specific top-level keys or digest algorithm into review tooling beyond "is this valid JSON with a non-empty `checksum` field."** Rationale: mirrors BZL-MOD-05's caution about `MODULE.bazel.lock`'s `lockFileVersion` — the lockfile's serialized shape is a cargo-bazel implementation detail that has changed release-to-release (e.g. the 0.74.0 size reduction, #4133) with no documented, versioned schema to code against. Verify: reading heuristic — any script parsing specific nested keys beyond validity + checksum presence is coupling to an implementation detail. CONSIDER. rules_rust 0.74.0.

## Fleet evidence

No fleet repository builds any Rust with Bazel today — crate_universe is entirely inert across the fleet (`fleet-bazel-readiness.md`: 0 fleet repos use `rust_*` rules). Everything below is "on adoption," using the specific facts the brief and addendum name.

- **42 distinct `Cargo.toml` across 6 repos** matches exactly: ocx (7) + grimoire (3) + ocx-mirror (9) + bob (9) + rust-oci-client (1) + creeptd-ng (13, corrected per the frame's wave-1 count, not the frame body's stale 65) = 42.
- **4 pinned-rev git dependencies on astral-sh/uv internals**, confirmed live at `ocx-mirror/crates/ocx_python/Cargo.toml:29-32`: `uv-distribution-filename`, `uv-platform-tags`, `uv-pep508`, `uv-pep440`, all `{ git = "https://github.com/astral-sh/uv", rev = "0adb444806e8bcea7e7a5e9ae90d1288778a0b54" }`, sharing one rev by policy per an adjacent comment in the same file. Per finding 9 / candidate 11, these need no special crate_universe treatment on adoption — the shared `rev` is exactly the reproducibility shape crate_universe (and Cargo itself) recommend.
- **Two fork-as-submodule vendorings with no Bzlmod analogue**, confirmed live at `grimoire/.gitmodules`: `external/docker_credential` (branch `feat/store-erase-list`) and `external/rust-oci-client` (branch `ocx/integration`) — both pinned by a moving branch ref at the submodule level, not a `Cargo.lock` git-rev entry, and (per `ocx_python/Cargo.toml:12`'s `ocx_lib = { path = "../../external/ocx/crates/ocx_lib" }` sibling pattern) consumed via Cargo `path` dependencies. Per decision 4, these fall to `BZL-ARCH`'s `git_override`/`bazel_dep` question, not crate_universe's.
- **0 MSRV pins fleet-wide, 3 of 6 repos with no `rust-toolchain.toml`**: crate_universe's digest hashes the actual resolved `cargo`/`rustc` versions (finding 2), but those are resolved through Bazel's own registered `rust_toolchain` (the `rust_version` attribute), not through `rustup`'s `rust-toolchain.toml` — so this specific fleet gap does not carry over as a crate_universe-specific hazard. It does mean Bazel adoption needs its own explicit Rust-version pin (`rust_version =` / `rust.toolchain()`), independent of fixing the pre-existing `rust-toolchain.toml` gap, or every local repin becomes non-reproducible across developer machines.
- **creeptd-ng's `sqlx::query!` live-database build dependency**: out of scope here — `sqlx`'s compile-time macro runs during `rustc` compilation of the crate, not during crate_universe's splicing/repin step (which only runs `cargo metadata`), so it is a build-script/compilation hermeticity question. Covered by the sibling `cargo-build-scripts-and-cross-compilation` dive and by `BZL-HERM`'s cause list (BZL-HERM-13 and neighbors); not restated here per the addendum.

## AI-agent angle

- **Reproducing the ruleset's own repin example verbatim.** The `crates_repository.bzl`/`extensions.bzl` docstrings and the rendered bzlmod docs page all currently show `CARGO_BAZEL_REPIN=1 bazel sync --only=<repo>`. An agent copying this from primary-looking sources will generate a command that fails outright on any Bazel ≥9.0.0. Check: does the generated snippet contain `bazel sync`? If yes and the target Bazel major is ≥9, it is wrong — replace with `bazel fetch --repo=@<repo>` or a plain build.
- **Assuming `crates_vendor`'s `--repin` flag behaves like `crates_repository`'s `CARGO_BAZEL_REPIN` env var.** They overlap (both eventually parse a `CargoUpdateRequest`) but are invoked differently: one is a `bazel run ... -- --repin` CLI flag, the other an environment variable read by a repository rule/module extension at fetch time. An agent writing a CI step for a `crates_vendor` setup that sets `CARGO_BAZEL_REPIN=1` and runs `bazel build //...` will silently do nothing, since nothing about `crates_vendor`'s own regeneration is triggered by a plain build. Check: for a `crates_vendor` target, the CI step must be `bazel run //<pkg>:crates_vendor -- --repin`, not an environment variable on a build/test invocation.
- **Porting a `crate.annotation()` between WORKSPACE macro form and bzlmod tag-class form by direct substitution.** `build_script_use_cc_toolchain` changes type (`int` → three-valued string) between the two forms despite both being documented as covering the same surface (finding 8). Check: for any annotation attribute being ported across the WORKSPACE/bzlmod boundary, diff its declared `attr.*()` type in `crate.bzl` against `extensions.bzl`'s `_ANNOTATION_NORMAL_ATTRS`/`_ANNOTATION_ATTRS` rather than assuming parity.
- **Treating an omitted `lockfile` attribute as "the safe default."** An agent unsure what to pass might drop the attribute rather than fail the generation step. This is the single worst configuration in this ruleset for CI trustworthiness: it makes repinning happen unconditionally, silently, on every build, forever (finding 2's step 2) — the opposite of safe. Check: `crates_repository(...)`/`crate.from_cargo(...)` with no `lockfile =` present is always a finding, never a fallback.
- **Hallucinating a `--lockfile_mode`-style flag for crate_universe.** Because Bzlmod's lockfile freshness gate is a flag (`--lockfile_mode=error`), a model reasoning by analogy may invent a parallel `--crate_lockfile_mode` or similar for crate_universe. No such flag exists — the mechanism is the `lockfile` attribute plus the `CARGO_BAZEL_REPIN` env var (finding 3). Check: `bazel help build --long` (or the pinned rules_rust source) for any flag name before citing it; an invented flag produces "unrecognized option," not silent no-op.
- **Assuming the seven `SUPPORTED_PLATFORM_TRIPLES` cover "every common platform."** Intel macOS and ARM64 Windows are absent (finding 6); a model told "make this build on an M-series and Intel Mac" may add the ARM entry (already present) and consider the job done, missing that Intel is not in the default set at all. Check: diff the CI matrix's actual platform list against `supported_platform_triples`, not against "the default should be enough."

## Contested / evolving

- **The `CARGO_BAZEL_REPIN` value-naming complaint is old and still open.** [rules_rust#1522](https://github.com/bazelbuild/rules_rust/issues/1522) (closed, no fix landed) requested a less surprising name than `workspace` for "regenerate the Bazel lockfile without a full `cargo update`"; a maintainer suggested `update-all`/`regenerate-lockfile` as clearer aliases, but as of 2026-09-05 the grammar in `metadata.rs` is unchanged from what the issue described in 2023. Trending: no movement; treat the current five-way alias table (plus the undocumented `minimal`) as durable until a source states otherwise.
- **crate_universe vs. plain Cargo resolution mismatches remain an open discussion.** [discussion #2879](https://github.com/bazelbuild/rules_rust/discussions/2879) documents CI-only `CARGO_HOME`/user-directory failures in `cargo-bazel` that don't reproduce under plain `cargo`, still open as of this research. This is direct evidence against reading "Cargo files are the single source of truth" (the common practitioner framing, e.g. Tweag's 2023 post) as airtight — map M-I-16's "stable in practice, not airtight" framing holds.
- **bzlmod support for crate_universe is explicitly still maturing.** The ruleset frames bzlmod crate_universe as newer and less battle-tested than the WORKSPACE path throughout its own docs; this dive's own findings (the non-root repin restriction, the `reproducible` metadata toggle) are bzlmod-specific mechanics that did not exist in the WORKSPACE-only era. Trending: bzlmod is clearly the forward path (WORKSPACE is gone in Bazel 9 for everything except `--enable_workspace`, itself a no-op per the frame), so guidance should default to bzlmod syntax and treat WORKSPACE examples as historical from Bazel 9.0.0 (2026-01-20) onward.
- **Whether `crates_vendor` or `crates_repository` should be the ecosystem default at all is not something any primary source states outright** — the criterion in Decision 1 is this dive's own synthesis from the ruleset's stated design intent (finding 1) and the bzlmod non-root restriction (finding 10), not a directly-quoted upstream recommendation. Treat it as CONSIDER-strength reasoning, not a settled upstream position.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [crates_repository.bzl](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/crates_repository.bzl) | Tagged source (rules_rust@main, commit 51f3042, 2026-09-02) | 2026-09-02 | The repository-rule implementation: `determine_repin()` call site, `watch()` calls, `SUPPORTED_PLATFORM_TRIPLES` + its `O(N²)` comment, the full attribute surface including `lockfile`/`cargo_lockfile`/`isolated` |
| [crates_vendor.bzl](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/crates_vendor.bzl) | Tagged source | 2026-09-02 | `mode = "remote"/"local"` attribute, the executable-rule shape, the wrapper-script args passthrough, `crates_vendor_remote_repository`'s `repo_metadata(reproducible=True)` use |
| [crate.bzl](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/crate.bzl) | Tagged source | 2026-09-02 | Full `crate.annotation()`/`crate.spec()` docstrings — every override attribute, `git`/`branch`/`tag`/`rev` on `spec()` |
| [generate_utils.bzl](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/private/generate_utils.bzl) | Tagged source | 2026-09-02 | `determine_repin()`'s exact fail/repin logic, `get_lockfiles()`, `execute_generator()`'s `--repin` flag construction |
| [extensions.bzl](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/extensions.bzl) | Tagged source | 2026-09-02 | The bzlmod `crate` module extension: `_generate_hub_and_spokes`'s root-vs-non-root repin logic, `reproducible` toggling, the stale `bazel sync` docstring example, tag-class attribute definitions |
| [lockfile.rs](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/src/lockfile.rs) | Tagged source | 2026-09-02 | `write_lockfile()`'s non-atomic `fs::write`; the `Digest` computation inputs |
| [cli/query.rs](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/src/cli/query.rs) | Tagged source | 2026-09-02 | The exact `query` subcommand `determine_repin()` shells out to; the two `bail!()` failure messages on a bad/missing lockfile |
| [src/metadata.rs](https://github.com/bazelbuild/rules_rust/blob/51f304215a885d2e7d86e7d2fa04bca8a4c05aad/crate_universe/src/metadata.rs) | Tagged source | 2026-09-02 | `CargoUpdateRequest`'s `FromStr` — the undocumented `minimal` alias and the package-name catch-all |
| [rules_rust 0.74.0 release](https://github.com/bazelbuild/rules_rust/releases/tag/0.74.0) | Official release notes | 2026-08-28 | The seven crate_universe correctness fixes this dive's "active repair" claim is counted from |
| [Bazel CHANGELOG.md](https://github.com/bazelbuild/bazel/blob/master/CHANGELOG.md) | Bazel's own changelog | 9.0.0-pre.20250526.2, 2025-06-10 | The exact, dated announcement that `bazel sync` is removed and `bazel fetch --all` is its replacement |
| [FetchOptions.java](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/bazel/commands/FetchOptions.java) | Tagged source | current | The live `fetch` command's flags (`--all`, `--repo`, `--configure`, `--force`) that replace `sync --only` |
| [rules_rust#3521](https://github.com/bazelbuild/rules_rust/issues/3521) / [PR #3866](https://github.com/bazelbuild/rules_rust/pull/3866) | GitHub issue + its fix | opened pre-0.74.0, fixed 2026-08-28 | A real bzlmod non-root lockfile-checksum bug, with a working repro using `bazel build` (not `bazel sync`) to trigger repin |
| [rules_rust#1522](https://github.com/bazelbuild/rules_rust/issues/1522) | GitHub issue | 2022, closed unfixed | The `CARGO_BAZEL_REPIN=workspace` naming complaint the brief named directly; still-current grammar as of 2026-09-05 |
| [discussions/2879](https://github.com/bazelbuild/rules_rust/discussions/2879) | GitHub discussion | open | `CARGO_HOME`/user-directory mismatches between `cargo-bazel` and plain `cargo` in CI; evidence for the Contested section |
| [Tweag: Building a Rust workspace with Bazel](https://www.tweag.io/blog/2023-07-27-building-rust-workspace-with-bazel/) | Practitioner blog | 2023-07-27 | Concrete crate_universe mechanics from an early adopter, including the (now-stale) `bazel sync` repin recipe and the path-dependency limitation |
| [blog.fahhem.com: Using Bazel to build a new Rust project](https://blog.fahhem.com/2024/09/bazel-build-new-rust-project/) | Practitioner blog | 2024-09 | A from-scratch `crates_repository` setup on rules_rust 0.51.0, confirming the same stale repin recipe a year later and the C++-toolchain-for-pure-Rust surprise |

Distinct sources: 14 (12 primary — every `rules_rust`/Bazel source file, release note, changelog, GitHub issue/PR/discussion, and the `FetchOptions.java` tagged source; 2 practitioner blogs). Frontmatter's `sources_count: 19` additionally counts the wave-1/wave-2 consolidation files read for context (`bazel-frame.md`, `bazel-topic-map.md`, `bazel-bzlmod-and-repo-rules.md`, `bazel-hermeticity-determinism.md`, and the fleet Cargo.toml/.gitmodules files read directly for the Fleet evidence section).
