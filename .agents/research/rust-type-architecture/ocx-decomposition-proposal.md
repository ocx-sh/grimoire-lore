---
title: OCX and Grimoire — Concrete Decomposition Proposal
topic: rust-type-architecture
agent: arch-proposal
model: opus
date: 2026-08
scope: >
  A sequenced, executable decomposition for /home/mherwig/dev/ocx (4-crate
  workspace) and /home/mherwig/dev/grimoire (single crate), applying
  ARCH-01…ARCH-22 from rust-type-architecture.md under the rust-restructure
  skill's parity-gated procedure. Every claim about current code carries a
  file:line. Measurements re-taken directly from source; several of the input
  audit's headline numbers did not survive re-measurement and are corrected
  in place.
sources:
  - .agents/research/rust-type-architecture.md
  - .agents/research/ocx-codebase-audit/crate-architecture.md
  - skills/rust-restructure/SKILL.md
  - skills/rust-restructure/references/transforms.md
  - skills/rust-restructure/references/work-packages.md
  - skills/rust-restructure/references/parity-harness.md
  - ocx/Cargo.toml, ocx/crates/{ocx_cli,ocx_lib,ocx_schema,ocx_shim}/Cargo.toml
  - ocx/crates/ocx_lib/src/lib.rs
  - ocx/crates/ocx_lib/src/package_manager.rs
  - ocx/crates/ocx_lib/src/package_manager/{composer.rs,tasks.rs}
  - ocx/crates/ocx_lib/src/package_manager/tasks/*.rs (all 23 impl-carrying files)
  - ocx/crates/ocx_lib/src/cli/classify.rs
  - ocx/crates/ocx_lib/src/oci/client.rs
  - ocx/crates/ocx_schema/src/lib.rs
  - grimoire/Cargo.toml, grimoire/src/main.rs
  - grimoire/src/catalog/forge.rs
  - grimoire/src/command/config.rs
  - grimoire/src/install/vendor.rs, grimoire/src/install/vendor_*.rs
  - grimoire/src/tui/app.rs
---

# OCX and Grimoire — Concrete Decomposition Proposal

## What is actually wrong

**`PackageManager` has 78 methods, not 603.** The audit counted every
4-space-indented `fn` in each of the 23 files; in `composer.rs` that is 154
lines, of which **5** are inside `impl PackageManager` (lines 1224–1504) and
149 are inside `mod tests` (line 1567 onward). Brace-matched per impl block,
the real total across all 23 files is **78 methods — 77 with a `&self`
receiver, 1 associated** ([package_manager.rs:355](../../../../ocx/crates/ocx_lib/src/package_manager.rs),
23 blocks in 23 files). The real defect is **23 inherent `impl` blocks on one
9-field type** — ARCH-03's structural clause — not method volume; the
method-count ceiling is exceeded by 3×, not 24×.

**The whole tree is 61% test code.** `package_manager/` is 36,731 file lines
but **14,331 production lines**. `tasks/resolve.rs` is 2,446 production lines
of 7,785; `oci/client.rs` is 2,056 of 6,899; `command/config.rs` is 1,925 of
5,159. `ocx_lib` is **81,051 production LOC** of 183,450; grimoire is
**63,138** of 128,893. Every "oversized file" figure in the audit is roughly
2.5× the code that would actually move.

**One file causes 16 of ocx's 22 module cycles.**
[cli/classify.rs:76-114](../../../../ocx/crates/ocx_lib/src/cli/classify.rs)'s
`try_classify` imports 38 error types from 18 modules inside one function
body to run a downcast ladder. Deleting that one file from the import graph
drops the cycle count from 22 to 6, and the residual six are **14 `use` lines
total** (`cli/theme.rs:23` and `:24` are one cycle each). ARCH-16 is
one afternoon's work, not a project.

**`impl Client` is fine.** 35 methods, one block, 6 fields, already behind an
`OciTransport` port with an exercised test double
([oci/client.rs:150,177,183](../../../../ocx/crates/ocx_lib/src/oci/client.rs)).
It is over ARCH-03's 25-method line and nothing else. Not a target.

**Grimoire's defect is the opposite one and smaller than described.**
`catalog/forge.rs` threads `(&reqwest::Client, &ForgeContext)` through **11**
free functions ([forge.rs:319](../../../../grimoire/src/catalog/forge.rs)) —
the strongest ARCH-01 hit in either codebase. `command/config.rs` threads
`(&mut ConfigOptions, &mut [RegistryConfig])` through 5 and `&mut
[RegistryConfig]` through 4 more ([config.rs:464,694,890,1017,1272,1236-1262](../../../../grimoire/src/command/config.rs)).
`tui/app.rs` threads `(&TuiContext, &mut TuiState)` through 9
([app.rs:811](../../../../grimoire/src/tui/app.rs)).

**These two need opposite fixes.** ocx needs one type *split into several*;
grimoire needs several free-function families *gathered onto types that do
not exist yet*. Running one rule over both is what produced the god struct.

Two of the audit's named targets do not survive contact with the code.
`forge.rs` has **3** true `github_*`/`gitlab_*` I/O pairs, not 20
(`pull_request`/`merge_request` at :491/:559, `ensure_fork` at :798/:870,
`login`/`current_user` at :396/:710), and they **already sit behind a
three-variant `ForgeKind` enum match** at :333, :466, :771 — the dispatch the
audit says is missing is written. `install/vendor.rs:180`'s `Vendor` trait has
**18 implementations**; the `(&Path, ConfigScope)` tuple recurring 110 times
is that trait's own method signatures, not a smell.

## Target crate shape

### ocx

ARCH-20 names a five-crate target (`-types` → `-core` → `-oci`/`-store` →
bin). ARCH-19 (also MUST) refuses to fund four of the five. **ARCH-19 wins,
and ARCH-20 should be read as the required *dependency direction*, not a
mandate to create all five members** — see Decisions.

| Crate | Responsibility | Moves in | May depend on | ARCH-19 justification |
|---|---|---|---|---|
| **`ocx_types`** *(new)* | The serde data types that define OCX's on-disk and wire formats, and nothing that reads or writes them. | The `struct`/`enum` halves of `config` (`Config`, `RegistryConfig`, `RegistryDefaults`, mirror/patch/managed config shapes), `package/metadata/authoring::AuthoringMetadata`, `patch::PatchDescriptor`, `project::{ProjectConfig, ProjectLock}`. Their I/O halves (`config/loader.rs`, `patch/persistence.rs`, `patch/snapshot.rs`, `project/{resolve,mutate,lock,hook,mutation,registry,project_lock}.rs`, `package/metadata/env/resolver.rs`) stay in `ocx_lib`. | `serde`, `serde_json`, `schemars`, `toml`, `semver`, `chrono`. **No** tokio/reqwest/starlark/zip. | **#1 actual second consumer** and **#2 dependency isolation**, both measured: [ocx_schema/src/lib.rs:10-13](../../../../ocx/crates/ocx_schema/src/lib.rs) imports exactly these five type families and today pulls all 45 of `ocx_lib`'s dependencies — the starlark family, tokio, reqwest, zip, oci-client — to emit JSON Schema from serde structs. |
| **`ocx_lib`** | Everything else: OCI protocol, index, store, package manager, project, script, setup. | — (loses the above; gains nothing) | `ocx_types` + its current 45 | Existing member. |
| **`ocx_cli`** | clap surface, exit-code classification, composition root. | **Gains** the bulk of `cli/classify.rs`'s downcast ladder (see WP-1). | `ocx_lib`, `ocx_types` | Existing member. |
| **`ocx_schema`** | JSON Schema emitter. | — | **`ocx_types`** + `schemars` only (drops `ocx_lib`) | Existing member; this is the crate whose dependency set the split exists to fix. |
| **`ocx_shim`** | Windows launcher stub. | — | none | Existing member, zero deps. Untouched. |

**Crates that do not appear, and why.** `ocx_core`, `ocx_oci`, `ocx_store`:
`oci` is 14,502 production LOC with exactly one consumer (`ocx_lib` itself),
no dependency to isolate (reqwest and oci-client are needed by the library
regardless), no independent semver promise (`publish = false` on all four
members), and **no measured compile-time bottleneck** — ARCH-19 demands
measurement and none exists. All four justifications fail. `xtask`: no build
task exists that needs one. `ocx_testsupport`: 354 inline `#[cfg(test)]`
blocks cannot be the consumer of a dev-dependency crate without moving out of
their modules first, and only 7 integration-test files exist; revisit after
the restructure, not before.

ARCH-21 is **already satisfied**: all four manifests carry `[lints] workspace
= true` and `publish = false` ([ocx/crates/*/Cargo.toml](../../../../ocx/Cargo.toml)).
`ocx_types` must carry both from its first commit.

### grimoire

**Grimoire stays one crate.** Every ARCH-19 justification fails, including
for the `-tui` crate the open questions raise:

- *Second consumer* — none. One binary, `grim`.
- *Dependency isolation* — `crossterm` already leaks outside `tui/` to
  [cli/printer.rs:153](../../../../grimoire/src/cli/printer.rs) and
  [cli/progress.rs:38](../../../../grimoire/src/cli/progress.rs) (both call
  `crossterm::terminal::size()` for wrapping width). A `grim_tui` crate would
  leave crossterm in the bin crate anyway, so it isolates nothing.
- *Measured compile bottleneck* — unmeasured.
- *Independent semver* — nothing is published.

`tui/` is 10,376 production LOC and cleanly layered already (`tui/state.rs`
and `tui/event.rs` are pure; `tui/app.rs` is the shell) with a single
2-import/3-import cycle against `command`. It is a module boundary that
works. Revisit only if a second consumer appears (a `grim-tui` binary, or a
library API) or a `cargo build --timings` run names it.

## PackageManager decomposition

`PackageManager` has 9 fields
([package_manager.rs:319-353](../../../../ocx/crates/ocx_lib/src/package_manager.rs)):
`file_structure`, `index`, `client`, `default_registry`, `progress`,
`patches`, `patch_snapshot`, `managed_config_client`, `index_store`. Of its
78 methods, **22 are constructors and accessors** (`package_manager.rs:361-670`)
and **56 are one-per-CLI-verb task entry points** spread over 22 files. The
22 accessors exist almost entirely to let those 22 files reach fields —
`self.file_structure()`, `self.index()`, `self.patches()`. That is the
decomposition signal: the accessor surface *is* the field-partition, written
out longhand.

**Six cooperating types.** Not 23 (one per file — that reproduces the file
split in the type system and buys nothing), and not 4 (which would put the
managed-config client back in reach of code that must not have it). Six is
where the field partition stops being arbitrary: each type's field set is
exactly what its methods already touch, and three of the six boundaries are
enforcing an existing security or offline invariant that is currently only a
comment.

| # | Type | Fields it owns (borrowed views, see below) | Method clusters that move | Methods | Explicitly does NOT get |
|---|---|---|---|---:|---|
| 1 | **`Resolver`** | `file_structure`, `index`, `index_store`, `patches`, `patch_snapshot`, `progress` | `tasks/resolve.rs` (10: `resolve`, `resolve_all`, `resolve_env`, `resolve_env_with_patch_boundary`, `resolve_env_with_attribution`, `build_site_patch_set`, `companion_pin`, `companion_pin_recorded`, `find_companion_local`, `resolve_site_patch_roots`) + `tasks/inspect.rs` (2) | 12 | **`client`.** Resolution goes through `Index`, never the OCI client directly. Verified: `resolve.rs` and `inspect.rs` reach `patches`/`file_structure`/`index`/`patch_snapshot`/`progress` and never `client()`/`require_client()`. |
| 2 | **`Acquisition`** | `file_structure`, `index`, `index_store`, `client`, `default_registry`, `progress` | `composer.rs` (5), `tasks/find.rs` (3), `find_or_install.rs` (2), `find_symlink.rs` (3), `install.rs` (2), `pull.rs` (2), `pull_local.rs` (1), `prepare_lazy.rs` (1), `materialize_lazy.rs` (2) | 21 | Local-only lifecycle ops (uninstall/clean/purge). Composition folds in here because `composer.rs` already calls `self.find`, `self.find_plain`, `self.find_symlink_all`, `self.prepare_lazy` — a separate `Composition` type would be 5 methods whose every call crosses back. |
| 3 | **`Lifecycle`** | `file_structure`, `progress` | `tasks/select.rs` (1), `deselect.rs` (2), `purge.rs` (2), `uninstall.rs` (2), `clean.rs` (1) | 8 | **`client`, `index`.** `ocx clean` and `ocx uninstall` mutate the local store only. Today that is a convention; here the compiler enforces it. |
| 4 | **`PatchTier`** | `file_structure`, `client`, `patches`, `patch_snapshot` | `tasks/patch_discovery.rs` (4), `patch_sync.rs` (1), `patch_test.rs` (2), `patch_publish.rs` (1) | 8 | The composer and resolver entry points. `Acquisition` calls **into** `PatchTier` (`install.rs` → `discover_and_install_patches`); the reverse edge does not exist today and must not be added. |
| 5 | **`SelfUpdate`** | `index`, `client`, `file_structure` | `tasks/update_check.rs` (4) | 4 | Everything else. It replaces the running binary; a 4-method type whose blast radius is visible in its signature is worth the file. |
| 6 | **`ManagedConfigSync`** | `file_structure`, `managed_config_client` | `tasks/managed_config.rs` (3) | 3 | **`client`.** This is the one boundary that is load-bearing today and only documented in a comment: `managed_config_client` is built from the *local-only* mirror view so the managed tier cannot redirect the route used to fetch itself ([package_manager.rs:337-346](../../../../ocx/crates/ocx_lib/src/package_manager.rs), ADR "Mirror posture"). Giving this cluster a type that cannot name `client` turns the ADR into a compile error. |

56 methods placed. Every type's field set is a strict subset; none needs all
nine, which is the test transforms.md sets for "has this actually
decomposed anything".

**How they hold their state: borrowed views, constructed per call.**

```rust
pub struct Resolver<'a> {
    fs: &'a file_structure::FileStructure,
    index: &'a oci::index::Index,
    index_store: Option<&'a file_structure::IndexStore>,
    patches: Option<&'a ResolvedPatchConfig>,
    patch_snapshot: Option<&'a PatchSnapshot>,
    progress: &'a ProgressManager,
}

impl PackageManager {
    pub(crate) fn resolver(&self) -> Resolver<'_> { /* field borrows */ }
    pub(crate) fn patch_tier(&self) -> PatchTier<'_> { /* … */ }
}
```

Not owned fields on the facade: that would need `FileStructure`, `Index` and
`Client` cloned six ways, and each clone is a fact to keep in sync. Not
constructed from scratch per call: the values already live on
`PackageManager`. A borrowed view is zero-cost, needs no clone analysis, and
makes the field subset the type's signature rather than a comment.

**What remains of `PackageManager`.** A facade, and a smaller one than today:
the 9 fields, the 6 constructors (`new`, `with_index`,
`with_managed_config_client`, `with_patches`, `with_patch_snapshot`,
`with_progress`), `offline_view`, `read_only_view`, and 6 view constructors.
The 12 public accessors (`file_structure()`, `index()`, `client()`,
`patches()`, `patch_snapshot()`, `progress()`, `default_registry()`,
`read_only_index()`, `require_client()`, `is_offline()`,
`effective_index_store()`, `can_fetch_managed_config()`) drop to
`pub(crate)` or disappear entirely once the only callers are the six view
constructors — they exist today solely because 22 foreign files needed field
access. The 56 task methods become one-line delegates
(`pub async fn resolve(&self, …) { self.resolver().resolve(…).await }`) kept
as the CLI-facing surface, because [package_manager/tasks.rs:4-6](../../../../ocx/crates/ocx_lib/src/package_manager/tasks.rs)
states that facade as deliberate design and `ocx_cli` calls all 56. That is
2 impl blocks and ~14 non-delegating methods on `PackageManager` — ARCH-03
satisfied.

**`Deref` forwarding is rejected outright.** ARCH-06 forbids it except on a
real smart pointer owning exactly one inner value, and `PackageManager` would
need six. Beyond the rule: `Deref` would make `pm.resolve(…)` and
`pm.clean(…)` resolve through different targets with no syntactic difference
at the call site, so the field-partition the whole split exists to make
visible becomes invisible again; method resolution would silently pick a new
target the first time two views grew a same-named method; and rustdoc lists
deref'd methods separately, so the 56-method CLI surface stops being readable
in one place. Explicit one-line delegates are more characters and the only
option that keeps the boundary legible.

## Trait extractions worth doing

ARCH-07's bar is a second real implementation or a test double the suite
exercises. Applied to every candidate in both codebases:

**Nothing in ocx clears it.** The five real I/O seams already exist
(`OciTransport`, `IndexImpl`, `IndexTransport`, `CredentialStore`,
`RegistryPing`) and `oci/client.rs:183`'s `with_transport` is the exercised
double. The six new `PackageManager` view types have one implementation each
and no double; they are inherent `impl`s, and any proposal to trait-ify them
is failure mode #2 from the ruleset.

**`ForgeApi` should not be created.** The audit names it the cheapest trait
win in either codebase; measured, it is not a win at all.

- The parallelism is 3 pairs, not 20: `github_pull_request`/`gitlab_merge_request`
  ([forge.rs:491,559](../../../../grimoire/src/catalog/forge.rs), identical
  7-parameter signatures), `github_ensure_fork`/`gitlab_ensure_fork` (:798,:870,
  identical), `github_login`/`gitlab_current_user` (:396,:710, both
  `(&Client, &ForgeContext) -> Option<String>`). `github_owner_id` **does not
  exist** — only `gitlab_owner_id` (:357), because GitHub's API needs no
  lookup. `gitlab_find_owned_fork`, `gitlab_find_owned_fork_bounded`,
  `gitlab_select_fork`, `gitlab_import_readiness` have no counterpart.
  `github_fork_target`/`gitlab_fork_target` (:1040,:1084) differ in parameter
  type (`upstream: &str` vs `upstream_id: u64`).
- **The dispatch is already written**, as the enum ARCH-09 asks for:
  `ForgeKind` has three variants (GitHub, GitLab, **Plain**) and
  `lookup_owner_id` (:333), `create_change_request` (:466) and `ensure_fork`
  (:771) each `match ctx.kind`. A trait cannot express the `Plain` arm, so a
  two-impl trait would sit *underneath* a retained enum match — strictly more
  indirection.
- No test double would exercise it: forge.rs's 38 tests are all pure-function
  tests and neither repo has an HTTP mocking dev-dependency
  ([grimoire/Cargo.toml:89-90](../../../../grimoire/Cargo.toml) — `tempfile`
  only).

The real defect in that file is ARCH-01, not ARCH-08: 11 functions thread
`(&reqwest::Client, &ForgeContext)` and 9 thread that plus a `&str`
(:319, :357, :396, :453, :491, :559, :710, :742, :798, :870, :1350). The fix
is one struct, `ForgeClient { http: reqwest::Client, ctx: ForgeContext }`,
with those 11 as `&self` methods and the existing `match ctx.kind` bodies
unchanged. That also gives `build_client` (:263) a constructor to live in —
the ARCH-12 seam the audit correctly flags — without inventing a port.

**`Vendor` is the model, and it is already built.**
[install/vendor.rs:180](../../../../grimoire/src/install/vendor.rs) with 18
implementations (`vendor_amp.rs:89` through `vendor_cursor.rs:65`) is exactly
what ARCH-07 and ARCH-08 ask for, shipped. Cite it as the house pattern; do
not touch it.

**Traits that should NOT be created:** `ForgeApi` (above); a `PackageManager`
trait or one per view type; a `FileSystem` port over the 1,664 `std::fs` call
sites as a blanket pass — ARCH-12's seam is worth extracting only where an
error branch is currently untestable *and* a test would be written, which is
a per-site judgment, not a sweep.

**Traits that should be deleted or downgraded:** `ResultExt`
([utility/result_ext.rs:4](../../../../ocx/crates/ocx_lib/src/utility/result_ext.rs),
one method `ignore()`, referenced from 3 files including its own) and
`VecExt` (`utility/vec_ext.rs:7`, 4 methods, 3 files) are below any plausible
"many call sites" bar and are pure ARCH-11 violations. `StringExt` (9 files)
and `SerdeExt` (8 files) are defensible on call-site count. See Decisions.

## Sequenced plan

Leaves first. Cycles before crates. Every package is checkable from disk and
build state alone. **The oracle for both repos is the Python acceptance
suite** — 2,360 `def test_` functions under `ocx/test/` (6 scenario
families), 924 under `grimoire/test/` — plus the inline unit tests. Neither
repo has `insta`, `assert_cmd` or `trycmd`, and neither has a recorded
mutation kill rate.

### Phase 0 — the oracle

| | |
|---|---|
| **WP-0** | Measure the oracle. **Changes:** adds `cargo-mutants` config and a recorded kill rate; no source moves. **Allowlist:** `.config/`, CI workflow, the rulebook file. **Gate:** `cargo mutants` scoped to `package_manager/`, `cli/classify.rs`, `oci/index/` on the pre-change tree. **Exit:** a number written into the rulebook. If it is below ~60%, WP-0b adds characterization tests to the weak modules *before* WP-1. **Agent-required** (test authoring). |

### Phase 1 — ocx module cycles (ARCH-16, blocks every later phase)

| | |
|---|---|
| **WP-1** | Split the exit-code downcast ladder. **Changes:** move arms of `try_classify` ([cli/classify.rs:76-114](../../../../ocx/crates/ocx_lib/src/cli/classify.rs)) from `ocx_lib` up into `ocx_cli`'s already-existing `app::classify_error` ([ocx_cli/src/app.rs:76-90](../../../../ocx/crates/ocx_cli/src/app.rs)), which already runs first and falls through to the lib's. Moving an arm *up* is exit-code-neutral for the `main` path because downcast arms are TypeId-disjoint. Re-add to the lib ladder only the arms the three in-lib production recursion sites need ([oci/index/error.rs:253](../../../../ocx/crates/ocx_lib/src/oci/index/error.rs), [package_manager/error.rs:424,428](../../../../ocx/crates/ocx_lib/src/package_manager/error.rs)); the `impl ClassifyExitCode for …` blocks stay where they are (module → `cli` is the legal direction). **Allowlist:** `ocx_lib/src/cli/classify.rs`, `ocx_cli/src/app.rs`. **Gate:** the 15 in-lib `assert_eq!(classify_error(…), ExitCode::…)` unit tests unchanged (of 28 in-lib call sites total), plus every acceptance scenario asserting a non-zero exit. **Exit:** `cli/classify.rs` imports ≤ 8 modules; measured cycle count 22 → 6. **Agent-required** (deciding which arms the recursion needs). |
| **WP-2** | The residual six cycles. **Changes:** 14 `use` lines. `cli/theme.rs:23` (`use crate::oci::{Digest, Identifier}`) and `:24` (`use crate::package::…::Visibility`) are one whole cycle each — invert by moving the display impls to the type's own module. `patch/snapshot.rs:45` (`use crate::package_manager::SitePatchRoots`) is the entire `package_manager ↔ patch` cycle. `oci/client.rs` × 4 `use crate::publisher::LayerRef`; `oci → package` × 4; `oci → file_structure` × 4. **Allowlist:** those 8 files. **Gate:** full suite; a graph re-measure. **Exit:** zero mutual `use crate::X` pairs in `ocx_lib`. **Codemod-expressible** (rust-analyzer SSR for the path rewrites; the two `theme.rs` inversions are agent-required). |

### Phase 2 — ocx free-function clusters (ARCH-01, leaves)

| | |
|---|---|
| **WP-3** | `tasks/common.rs` → `ClosureStaging`. **Changes:** 8 of its 27 free functions thread `(&FileStructure, &Index)` ([common.rs:437,515,844,893,946,1089](../../../../ocx/crates/ocx_lib/src/package_manager/tasks/common.rs) and 2 more) and 5 thread `&FileStructure` alone (:374,:534,:581,:686,:355). Those 13 become `&self` methods on one struct. The 9 pure functions (`config_blob_digest`, `closure_edges_from_metadata`, `fold_effective_visibility`, `closure_env_vars`, `closure_integrations`, `resolved_edge_identity`, `visit_closure_node`, `closure_fetch_miss`, `verify_requested_digest`) **stay free** under ARCH-02 — no privileged argument. **Allowlist:** `tasks/common.rs` + its callers. **Gate:** parity + `common.rs`'s 944 test lines unchanged. **Exit:** no function in `common.rs` takes `&FileStructure` as its first parameter. **Agent-required.** |
| **WP-4** | The 16 production free functions that take `&PackageManager`. **Changes:** these are methods written as free functions — `pull.rs:202,280,308,605,733,841` (6), `pull_local.rs:221,399,448` (3), `inspect.rs:341,356,390` (3), `install.rs:241`, `patch_discovery.rs:1078`, `resolve.rs:2228`, `hook.rs:60`. (Seven further hits — `resolve.rs:5601,5639,5912,6120`, `patch_sync.rs:1690`, `prepare_lazy.rs:949`, `composer.rs:5812` — are inside `mod tests` and move with their subject.) Each moves onto whichever Phase-3 type owns its cluster, with the `pm: &PackageManager` parameter becoming `&self`. **Do this after WP-5…WP-10 for the clusters whose type does not exist yet** — sequence per cluster, not as one package. **Gate:** parity per cluster. **Agent-required.** |

### Phase 3 — the `PackageManager` split (leaves first)

One type per work package, one commit per type, parity-run each. Order is by
inbound edge count — a type nothing else calls goes first.

| | Type | Files | Methods | Depends on |
|---|---|---|---:|---|
| **WP-5** | `ManagedConfigSync` | `tasks/managed_config.rs` | 3 | nothing |
| **WP-6** | `SelfUpdate` | `tasks/update_check.rs` | 4 | nothing |
| **WP-7** | `Lifecycle` | `tasks/{select,deselect,purge,uninstall,clean}.rs` | 8 | nothing |
| **WP-8** | `PatchTier` | `tasks/{patch_discovery,patch_sync,patch_test,patch_publish}.rs` | 8 | `Resolver` (read paths) |
| **WP-9** | `Resolver` | `tasks/{resolve,inspect}.rs` | 12 | WP-3's `ClosureStaging` |
| **WP-10** | `Acquisition` | `composer.rs`, `tasks/{find,find_or_install,find_symlink,install,pull,pull_local,prepare_lazy,materialize_lazy}.rs` | 21 | WP-8, WP-9 |

Each package: create the view struct with its field borrows, move the `impl
PackageManager` block's methods verbatim onto it, leave a one-line delegate
on `PackageManager` at every old path. **Allowlist** is that cluster's files
plus `package_manager.rs`. **Gate:** `cargo check -p ocx_lib`, the cluster's
own tests, the full acceptance suite. **Exit:** `grep -c '^impl
PackageManager' <cluster files>` returns 0. **Agent-required** — this is the
judgment a codemod cannot express.

| | |
|---|---|
| **WP-11** | Facade trim. **Changes:** narrow the 12 accessors to `pub(crate)` or delete them; remove any delegate `ocx_cli` does not call. **Separate, individually revertible commit.** **Gate:** `cargo clippy --workspace -- -D warnings` with `unreachable_pub` on. **Exit:** `PackageManager` has ≤ 2 inherent `impl` blocks. **Codemod-expressible.** |

### Phase 4 — crate extraction (only now)

| | |
|---|---|
| **WP-12** | Extract `ocx_types`. **Changes:** new member + `[lints] workspace = true` + `publish = false`; move the five type families' data halves; `pub use ocx_types::…` at every old path in `ocx_lib`; repoint `ocx_schema` to depend on `ocx_types` alone. **Allowlist:** the moved files, `ocx_lib/src/lib.rs`, both Cargo.tomls, workspace Cargo.toml. **Gate:** `cargo tree -p ocx_types -e normal` shows no tokio/reqwest/starlark/zip; `ocx_schema`'s emitted JSON byte-identical to the pre-change output. **Exit:** `ocx_schema/Cargo.toml` no longer names `ocx_lib`. **Agent-required** (splitting data from I/O per type); the path rewrites are SSR. |
| **WP-13** | Drop the re-export shims from `ocx_lib`. One commit, revertible alone. **Codemod-expressible.** |

### Phase 5 — grimoire (independent of everything above; can run in parallel)

| | |
|---|---|
| **G-1** | `ForgeClient`. **Changes:** `struct ForgeClient { http: reqwest::Client, ctx: ForgeContext }`; the 11 `(&Client, &ForgeContext)` functions become `&self` methods, bodies verbatim, `match ctx.kind` arms untouched; `build_client` ([forge.rs:263](../../../../grimoire/src/catalog/forge.rs)) becomes the constructor. `verify_fork_push_url`, `github_can_push`, `gitlab_can_push`, `*_fork_target`, `project_path`, `encode_segment`, `pr_head`, `next_interval`, `is_last_page` **stay free** (ARCH-02, pure). **Allowlist:** `catalog/forge.rs` + callers. **Gate:** its 38 unit tests + the announce acceptance scenarios. **Exit:** no function in `forge.rs` takes `&reqwest::Client` as its first parameter. **Agent-required.** |
| **G-2** | `ConfigDraft`. **Changes:** `struct ConfigDraft { options: ConfigOptions, registries: Vec<RegistryConfig> }`; `get_value`, `apply_set`, `apply_unset`, `collect_entries`, `commit_config` ([config.rs:464,694,890,1017,1272](../../../../grimoire/src/command/config.rs)) plus `find_registry`, `set_registry_field`, `clear_all_defaults`, `set_registry_default` (:1236-1262) become methods. The 9 `parse_*`/`check_*`/`reject_*`/`validate_*` functions (:1136-1233) and the 11 `run_*` clap dispatch arms **stay free** — the parsers have no privileged argument, and `ctx: &Context` is ARCH-13's injected context, not a receiver. The audit's `ConfigKeyParser` recommendation is declined for that reason. **Exit:** no function takes both `&mut ConfigOptions` and `&mut [RegistryConfig]`. **Agent-required.** |
| **G-3** | `TuiApp`. **Changes:** the 9 `(&TuiContext, &mut TuiState)` and 4 `(&TuiContext, &TuiState, &mut UpdateChecker)` functions in [tui/app.rs:628,697,811](../../../../grimoire/src/tui/app.rs) become methods on one struct holding `ctx` + `checker`. `tui/state.rs`, `tui/render.rs`, `tui/event.rs` are **out of scope** — a documented functional core; note it in the rulebook so a later pass does not "fix" them. **Agent-required.** Lowest value of the three; do last or not at all. |

### Cross-cutting, unsequenced

**ARCH-15 visibility sweep** — 1,031 col-0 `pub` items and 106 `pub(crate)`
in `ocx_lib`; 858 and 73 in grimoire. Purely mechanical: set
`unreachable_pub = "warn"` in `[workspace.lints.rust]`
([ocx/Cargo.toml:211](../../../../ocx/Cargo.toml) — the table already exists
and every member opts in), then `cargo clippy --fix`. **Codemod-expressible,
no model.** Runs whenever, but **not inside** a Phase-3 package — the god-struct
extraction is visibility-widening by construction and a concurrent sweep makes
the diff unreadable. Scope is a Decision.

## What this costs

| Phase | Diff size | Risk | What breaks if it runs early |
|---|---|---|---|
| **WP-0** oracle | ~200 lines of config + whatever WP-0b needs | None | Nothing — but skipping it means every later gate is a build check wearing an oracle's name. |
| **WP-1** classify | ~150 lines moved between two functions | **Highest single risk in the plan.** Exit-code mapping is a wire contract; getting an arm wrong silently changes a script's behaviour and no compiler notices. This is the one package that must wear only one hat. | — |
| **WP-2** cycles | ~14 `use` lines + 2 impl relocations | Low | Nothing. |
| **WP-3/4** clusters | ~600 lines touched, mostly signature lines | Medium — the borrow-duration hazard: `fn f(fs: &FileStructure, …)` → `fn f(&self, …)` extends the borrow across the whole call. A caller that mutated `fs` mid-call stops compiling (visible) or loses an implicit clone (invisible). Every conversion needs a parity run. | Before WP-1/2: nothing breaks, but you will redo the moves when the cycle fix relocates their neighbours. |
| **WP-5…10** split | ~2,500 production lines relocated (not rewritten) across 22 files | Medium-high in aggregate, low per package. The named hazard is visibility widening: the fastest fix for a private-item error is `pub`, and it is permanent. Review every new `pub` individually. | **Before WP-1/WP-2 this does not compile at all past the first crate boundary, and even inside one crate the `cli ↔ package_manager` cycle makes the delegate placement ambiguous.** |
| **WP-11** trim | ~60 lines | Low | Before WP-10, deletes accessors the remaining clusters still need. |
| **WP-12** `ocx_types` | ~3,000 lines moved + 2 manifests | Medium — the hazard is the extracted crate dragging its dependencies. `cargo tree` is the gate, not the build. | **Before Phase 1 it will not compile**: `config`, `patch` and `project` all sit inside the cycle set today. This is the concrete cost of skipping ARCH-16. |
| **G-1/2/3** | ~400, ~300, ~250 lines | Low each | Nothing; independent of ocx. |

**Overall order dependency in one line:** oracle → cycles → clusters → types
→ crate. Reversing any adjacent pair costs a full redo of the earlier one;
reversing cycles and crate costs the whole extraction pass, which is the
failure the ruleset names as AI failure mode #11.

**What is deliberately not in the plan:** any `oci`/`store`/`core` crate;
any new trait; any change to `tui/state.rs`, `tui/render.rs`, `tui/event.rs`,
`package/bin_scan.rs`, `config/loader.rs`, or `install/vendor*.rs` — all
correct as written, all named here so a later pass does not "fix" them.

## Decisions the owner must make

**1. Does anything ever publish to crates.io?**
Recommendation: **no**, and record it. All four ocx members already carry
`publish = false` and grimoire has no `[lib]`. *If no:* ARCH-22 stays dormant
— no `cargo-semver-checks`, no `missing_docs`, no sealed traits, no
`{ path, version }` internal deps, and `ocx_types` is an internal boundary
with no compatibility obligation. *If yes:* `ocx_types` becomes a public
contract on day one, WP-12 grows a documentation pass over every moved type,
and five currently-dropped rules activate — call it a second project.

**2. Is ARCH-15 retroactive?**
Recommendation: **new code only, enforced by lint, plus one mechanical sweep
of `ocx_lib` in its own commit** — 1,031 items, `cargo clippy --fix`, zero
judgment, and it makes WP-11's "which accessors can narrow" answerable by the
compiler instead of by reading. *If new-code-only:* the sweep never happens,
`unreachable_pub` fires on 1,031 pre-existing items and gets `#![allow]`-ed at
the crate root, which disables it for new code too — the rule quietly dies.
*If a full sweep:* one large, boring, individually revertible diff, and the
lint works from then on. Do **not** interleave it with Phase 3.

**3. Delete or grandfather the four utility extension traits?**
Recommendation: **delete `ResultExt` and `VecExt`, grandfather `StringExt`
and `SerdeExt`.** `ResultExt` is one method across 3 files including its own
definition; `VecExt` is 4 methods across 3 files — neither meets ARCH-11's
"many call sites" test and both are cheaper to inline than to keep in the
Utility Catalog. `StringExt` (9 files) and `SerdeExt` (8 files, and
`read_json`/`write_json` on a foreign serde type genuinely wants method
syntax) clear the bar. *If all four are grandfathered:* ARCH-11 becomes a
rule with four standing exceptions, which is how a rule stops being applied.
*If all four go:* ~30 call sites rewrite for no functional gain on the two
that are justified.

**4. Does grim's TUI become its own crate?**
Recommendation: **no.** All four ARCH-19 justifications fail, and the
dependency-isolation one fails *demonstrably* — crossterm already leaks to
`cli/printer.rs:153` and `cli/progress.rs:38`. *If yes anyway:* you get a
`grim_tui` crate that still leaves crossterm in the bin, plus the
`command ↔ tui` cycle to break first, for an unmeasured compile win. *If no:*
grimoire stays one crate and G-1/G-2 are the whole of its work.

**5. Does ARCH-20's five-crate target shape override ARCH-19 for ocx?**
This is the one the ruleset does not resolve: ARCH-20 (MUST) names
`-types`/`-core`/`-oci`/`-store`/bin, and ARCH-19 (MUST) rejects four of them
for lack of a justification. Recommendation: **rewrite ARCH-20 as a
dependency-*direction* rule — types below core below adapters below bin — and
let ARCH-19 decide which of those layers earns a crate boundary.** Under that
reading ocx gets exactly one new crate (`ocx_types`) and grimoire gets none,
which is what the measurements support. *If ARCH-20 stands as written:* the
plan needs `cargo build --timings` on `ocx_lib` first (nobody has run it),
and three more crates whose only justification would be that number.

**6. What kill rate is good enough to start?**
WP-0 produces a number; nothing in the plan says what to do with it.
Recommendation: **≥60% on `package_manager/`, `cli/classify.rs` and
`oci/index/` before WP-1 begins**, and treat anything lower as a signal to
write characterization tests for the weak module first. *If the bar is
skipped:* Phase 3's per-package parity gate is a build check, and a 2,500-line
relocation is exactly the change a build check cannot see through.
