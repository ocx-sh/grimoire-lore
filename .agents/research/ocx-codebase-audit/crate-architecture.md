---
title: OCX vs Grimoire — Rust Architecture Audit (crates, free functions, traits/structs)
agent: inv-arch
model: sonnet
scope: >
  /home/mherwig/dev/ocx (workspace: crates/ocx_cli, crates/ocx_lib, crates/ocx_schema,
  crates/ocx_shim; external/ and target/ ignored; crates/ocx_mirror excluded — not a
  workspace member, contains only a CycloneDX SBOM json, no Rust) vs
  /home/mherwig/dev/grimoire (single crate, src/; external/ vendored forks ignored).
method: >
  All counts from ripgrep (rg 14.1.1) and `wc -l`/`find` against *.rs files under each
  crate's src/ only (no target/, no external/, no test/ python trees). Every command
  used is inlined next to its result below so numbers are re-runnable verbatim. NOTE:
  in this shell `rg` is a Claude-Code-provided function; short-flag bundles like `-oh`
  silently degenerate into ripgrep's own `--help` output (that failure mode was hit
  and corrected mid-audit — see the caveat under §3). All commands below are the
  corrected, verified forms.
---

# OCX vs Grimoire — Rust Architecture Audit

## 0. Headline numbers

| | ocx (4 crates) | grimoire (1 crate) |
|---|---:|---:|
| Total Rust LOC (src/ only) | 221,013 | 128,694 |
| Files | 419 | 199 |
| Free functions (module-level, col-0) | 1,138 | 897 |
| Indented `fn` (methods + nested + test fns) | 7,768 | 4,094 |
| — of which `#[test]`/`#[tokio::test]` fns | 4,282 | 2,687 |
| `struct` | 486 | 290 |
| `enum` | 213 | 133 |
| `trait` definitions | 16 | 6 |
| `impl` blocks (all) | 791 | 308 |
| `impl Trait for X` blocks | 394 | 172 |
| `dyn Trait` usages | 175 | 173 |
| `#[async_trait]` usages | 63 | 20 |
| pub items (col-0 `pub `) | 1,118 (ocx_lib only) | 913 |

**Free-fn density (per 1,000 LOC, production code only — test fns excluded):**
ocx = 1,138 free / (7,768 − 4,282) methods = 1,138 : 3,486 → free fns are **24.6%** of non-test functions, **5.15 free fns / kLOC**.
grimoire = 897 free / (4,094 − 2,687) methods = 897 : 1,407 → free fns are **38.9%** of non-test functions, **6.97 free fns / kLOC**.

**This inverts the owner's framing.** Grimoire has proportionally *more* free functions relative to methods, and *more* free functions per line of code, than ocx does. ocx's actual anti-pattern is different and worse — see §2.

## 1. Crate graph

```
cargo workspace members = ["crates/ocx_cli", "crates/ocx_lib", "crates/ocx_schema", "crates/ocx_shim"]
ocx_cli   (bin "ocx")      -> ocx_lib                                    34,628 LOC / 131 files
ocx_lib   (lib, no bins)   -> (leaf; ~45 external deps: tokio, oci-client, starlark family, zip, ...)  183,167 LOC / 283 files  (82.9% of the whole workspace)
ocx_schema(lib)            -> ocx_lib, schemars                             348 LOC /   2 files
ocx_shim  (bin "ocx-shim") -> (no deps; Windows launcher stub)             2,870 LOC /   3 files
```
`crates/ocx_mirror/` contains only `ocx_mirror.cdx.json` (a CycloneDX SBOM), is **not** a workspace member, and has no source — excluded.

`ocx_lib` is 82.9% of the workspace by LOC with `ocx_cli` as a thin 15.7% wrapper — this *is* a real "nearly one crate" structure, confirmed.

```
Cargo.toml -> [package] fields inspected via:
find /home/mherwig/dev/ocx -name Cargo.toml | grep -v -E '(external|target)'
cat crates/ocx_cli/Cargo.toml crates/ocx_lib/Cargo.toml crates/ocx_schema/Cargo.toml crates/ocx_shim/Cargo.toml Cargo.toml
```

grimoire: single crate `grimoire` (bin `grim`), no internal crate split at all — `cat /home/mherwig/dev/grimoire/Cargo.toml`. ~40 external deps (clap, tokio, oci-client fork, ratatui, rmcp, starlark absent).

## 2. THE finding: a 603-method god-struct, not free-function sprawl

```
rg -l '^impl PackageManager' /home/mherwig/dev/ocx/crates/ocx_lib/src   # 23 files
```
`PackageManager` has **23 separate inherent `impl PackageManager { }` blocks** spread across 23 different files under `package_manager/` and `package_manager/tasks/`, totaling **603 methods** (counted at exactly 4-space indent, i.e. direct impl members, excluding nested closures/test fns):

| file | methods on `impl PackageManager` |
|---|---:|
| composer.rs | 154 |
| tasks/resolve.rs | 100 |
| tasks/inspect.rs | 53 |
| package_manager.rs | 33 |
| tasks/patch_discovery.rs | 51 |
| tasks/patch_sync.rs | 29 |
| tasks/prepare_lazy.rs | 27 |
| tasks/update_check.rs | 26 |
| tasks/managed_config.rs | 22 |
| tasks/pull_local.rs | 18 |
| tasks/patch_test.rs | 18 |
| tasks/pull.rs | 13 |
| tasks/clean.rs / find.rs | 12 each |
| remaining 10 files | 1–8 each |
| **Total** | **603** |

Command used (repeat per file, or loop):
```
for f in <23 files from rg -l '^impl PackageManager' ...>; do
  rg -c '^    (pub(\(crate\))?\s+)?(async\s+)?fn\s+\w+' "$f"
done
```
Cross-check inherent-impl-block ownership (top 15 by block count, both codebases):
```
rg -o --no-filename '^impl(<[^>]*>)?\s+[A-Za-z_][A-Za-z0-9_]*(<[^>]*>)?\s*\{' <src dirs> \
  | grep -v ' for ' \
  | sed -E 's/^impl(<[^>]*>)?\s+//; s/(<[^>]*>)?\s*\{$//' \
  | sort | uniq -c | sort -rn | head -15
```
ocx result: `PackageManager` 23, next-highest `PackageInspect`/`Env` 3 each — a 7.7x gap.
grimoire result: highest is `RegistryClient` with **3** impl blocks. **No equivalent god-struct exists in grimoire.**

This is Rust's "multiple `impl` blocks for one type, one per file" pattern used as a poor man's module system: `PackageManager` isn't decomposed into cooperating types, it's one struct whose *method surface* is decomposed into files. Every one of the 4 largest files in ocx_lib (resolve.rs 7,784 LOC, client.rs 6,898, composer.rs 6,430, chained_index.rs 5,806) is dominated by one or two giant impl blocks, not free functions — resolve.rs has 90 methods on `impl PackageManager` in a single 7,300-line block, client.rs has ~101 methods on `impl Client`. **The owner's stated complaint ("too many free-standing functions instead of traits and structs") does not match what's actually there — what's there is too few structs carrying too many methods each, via `impl` sprawl instead of decomposition.**

## 3. Largest 15 files, both codebases (LOC, free_fn, struct, enum, trait, impl; cohesion judgment)

Regex caveat: `rg -oh` was mis-typed once mid-audit (`-oh` = `-o` + `-h`/`--help` combined, not `-o --no-heading`) and silently dumped `rg --help` text into results for two queries; caught via a sanity check (`echo "impl Foo {" | rg '...'`) and re-run with flags spelled out (`-o --no-filename`). All numbers in this report are from the corrected commands.

**ocx** (`rg '^(...)fn|struct|enum|trait|impl' <file> -c` per file):

| file | LOC | free_fn | struct | enum | trait | impl | cohesion |
|---|---:|---:|---:|---:|---:|---:|---|
| package_manager/tasks/resolve.rs | 7,784 | 14 | 7 | 5 | 0 | 5 | Cohesive but oversized — one `impl PackageManager` (90 methods) doing dependency-graph resolution + chain building |
| oci/client.rs | 6,898 | 3 | 3 | 2 | 0 | 4 | Cohesive — `impl Client` (~101 methods), the whole OCI registry protocol client in one file |
| package_manager/composer.rs | 6,430 | 22 | 5 | 1 | 0 | 1 | Cohesive by domain (two-env composition) but one impl carries 154 methods |
| oci/index/chained_index.rs | 5,806 | 6 | 1 | 1 | 0 | 2 | Cohesive, single responsibility (chained index resolution) |
| utility/fs/assemble.rs | 3,819 | 11 | 6 | 3 | 0 | 2 | Cohesive — layer-assembly filesystem walker |
| env.rs | 3,561 | 17 | 4 | 3 | 0 | 8 | Cohesive, several small env-related types |
| oci/index/local_index.rs | 3,434 | 3 | 3 | 1 | 0 | 3 | Cohesive |
| oci/index/ocx_index.rs | 3,106 | 9 | 5 | 1 | 1 | 7 | Cohesive — one of the few files defining a trait (`IndexTransport`) |
| file_structure/index_store.rs | 3,074 | 2 | 3 | 1 | 0 | 3 | Cohesive |
| package_manager/tasks/inspect.rs | 3,017 | 6 | 7 | 1 | 0 | 1 | Cohesive but one `impl PackageManager` (53 methods) |
| config/loader.rs | 2,910 | 0 | 3 | 0 | 0 | 1 | Cohesive, deliberately free-function-free per its own doc comment |
| project/resolve.rs | 2,737 | 21 | 1 | 1 | 0 | 1 | Cohesive |
| package_manager/tasks/patch_discovery.rs | 2,698 | 5 | 2 | 3 | 0 | 2 | Cohesive |
| oci/platform.rs | 2,406 | 9 | 0 | 2 | 0 | 10 | Cohesive |
| package_manager/tasks/common.rs | 2,352 | 26 | 6 | 0 | 0 | 0 | Grab-bag by its own doc comment: `"Shared utilities for task modules. Free functions only — no impl PackageManager"` — see §5 dive #1 |

**grimoire:**

| file | LOC | free_fn | struct | enum | trait | impl | cohesion |
|---|---:|---:|---:|---:|---:|---:|---|
| tui/app.rs | 7,563 | 76 | 6 | 0 | 0 | 4 | Grab-bag by design — doc says "the one place the terminal, raw mode, async catalog load, and the event loop live"; free-fn-heavy event/update logic, deliberate |
| install/installer.rs | 5,770 | 27 | 2 | 3 | 0 | 1 | Cohesive — per-artifact install + integrity gate |
| command/config.rs | 5,158 | 46 | 2 | 4 | 0 | 0 | Grab-bag of parse/validate/format helpers for `grim config` — see §5 dive #2, zero impl blocks at this size |
| command/publish.rs | 4,937 | 36 | 8 | 3 | 0 | 3 | Cohesive (one CLI command, manifest-driven release) but free-fn-heavy |
| tui/state.rs | 3,978 | 3 | 5 | 4 | 0 | 3 | Cohesive, deliberately pure (doc: "free of ratatui, crossterm, and std::io") |
| tui/render.rs | 3,729 | 23 | 5 | 2 | 0 | 0 | Deliberate pure-function design: doc says `frame` is "a pure function" — free fns are the architecture here, not an accident |
| tui/tree.rs | 3,397 | 11 | 6 | 2 | 0 | 2 | Cohesive, pure builder |
| install/path_anchor.rs | 3,288 | 9 | 2 | 3 | 0 | 7 | Cohesive |
| install/install_state.rs | 3,104 | 5 | 10 | 2 | 0 | 4 | Cohesive |
| catalog/forge.rs | 2,609 | 39 | 5 | 3 | 0 | 2 | Grab-bag: GitHub+GitLab forge API calls as parallel free-fn families (`github_*`/`gitlab_*`) — see §5 dive #3 |
| config/project_config.rs | 2,597 | 19 | 6 | 2 | 0 | 3 | Cohesive |
| tui/event.rs | 2,386 | 8 | 0 | 3 | 0 | 0 | Deliberate pure design (doc: "No terminal imports... pure function") |
| resolve/resolver.rs | 2,252 | 21 | 3 | 0 | 0 | 0 | Cohesive, all free-fn |
| install/prune.rs | 2,011 | 7 | 2 | 2 | 0 | 0 | Cohesive |
| command/status.rs | 1,909 | 17 | 2 | 1 | 0 | 0 | Cohesive |

**Both codebases' largest files are cohesive by domain**; neither has a genuine dumping-ground file. The stylistic difference is real: grimoire's large files lean on free functions (several *by explicit design*, e.g. `tui/state.rs`, `tui/render.rs`, `tui/event.rs` — a deliberate functional core/imperative shell split), ocx's lean on one giant `impl` block per file.

## 4. Deep-dive: 5 representative modules

**1. ocx `package_manager/tasks/common.rs`** (2,352 LOC, 26 free fns, its own doc comment reads *"Shared utilities for task modules. Free functions only — no `impl PackageManager`"* — i.e. free-function style here is a deliberate policy, not drift):
```
pub async fn find_in_store(...)
pub async fn identifier_for_symlink(...)
pub async fn load_object_data(...)
pub async fn load_config_metadata(...)
pub async fn drain_package_tasks<T: 'static>(...)
pub async fn resolve_top_manifest(...)
pub fn reference_manager(fs: &FileStructure) -> ReferenceManager
pub async fn blob_needs_fetch(...)
pub async fn stage_chain_blobs(...) / stage_and_link_chain_blobs(...)
pub async fn acquire_select_lock(...) / acquire_selection_locks(...)
pub async fn wire_selection(...)
pub fn rollback_symlink(rm: &ReferenceManager, forward_path: &Path, prior_target: Option<&Path>)
pub async fn stage_leaf_manifest(...) / walk_closure_nodes(...)
async fn gather_closure_nodes / fetch_closure_node (private)
pub fn config_blob_digest(...) / closure_fetch_miss / closure_edges_from_metadata / fold_effective_visibility / closure_env_vars / closure_integrations / resolved_edge_identity / visit_closure_node
```
Natural owner: a `ClosureWalker` (or `TaskContext`) struct bundling `FileStructure`+`ReferenceManager`+lock state, with these as methods — the functions already thread the same 2–3 params through nearly every signature, the textbook "this should be `&self`" smell.

**2. grimoire `command/config.rs`** (5,158 LOC, 46 free fns, 0 impl blocks — the most impl-free large file in either codebase):
```
pub async fn run(ctx: &Context, args: &ConfigArgs) -> anyhow::Result<(ConfigReport, ExitCode)>
fn flag_pair / parse_key / scope_to_origin / fixed_value / vendor_value / get_value
fn registry_field_value / pattern_list_value / quote_pattern
fn check_filter_pattern / check_set_filter_pattern / check_filter_flags / warn_on_discarded_patterns / has_bare_comma
fn apply_set / apply_unset / no_such_registry_for_unset
fn entry / collect_entries
fn clients_set_error / vendor_key_error
fn parse_default_view / parse_bool / parse_u32 / parse_tree_separators / reject_control_chars / validate_alias_format
fn find_registry / set_registry_field
```
Natural owner: two structs — a `ConfigKeyParser`/`ConfigValidator` (the `parse_*`/`check_*`/`reject_*`/`validate_*` cluster, ~12 fns, all pure str→Result) and a `ConfigMutator` (the `apply_set`/`apply_unset`/`set_registry_field` cluster). Currently every validation rule is a standalone fn instead of one `impl` with shared error-context helpers.

**3. grimoire `catalog/forge.rs`** (2,609 LOC, 39 free fns): a GitHub/GitLab dual-API client implemented as **parallel free-function families** — `github_owner_id`/`gitlab_owner_id`, `github_login`/`gitlab_login`(via lookup), `github_pull_request`/`gitlab_merge_request`, `github_ensure_fork`/`gitlab_ensure_fork`, `github_can_push`/`gitlab_can_push`, `github_fork_target`/`gitlab_fork_target`. Natural owner: a `ForgeApi` trait with `GitHubApi`/`GitLabApi` implementors (`create_change_request`, `ensure_fork`, `login`, `can_push` as trait methods) — this is the single clearest missing-trait case in either codebase; the parallelism between the two families is already near-perfect, it's just not expressed as one.

**4. grimoire `tui/app.rs`** (7,563 LOC, 76 free fns, 4 impl): the TUI event loop. `arm_background_checks`/`schedule_row_checks`/`recheck_rows`/`drain_checks`/`drain_bundle_member_checks`/`drain_catalog_ready` all take `(ctx: &TuiContext, state: &mut TuiState, checker: &mut UpdateChecker, ...)` — same 2–3 params repeated. Natural owner: an `AppLoop`/`UpdateScheduler` struct holding `ctx`/`checker`, turning these into `&mut self` methods. Partially mitigated by the fact `TuiState`/`TuiContext` are already separate pure-data structs (functional-core pattern) — the free functions are the "shell", not raw disorganization.

**5. ocx `package/bin_scan.rs`** (small, 13 free fns) — chosen as a *good* counter-example: `scan_interface_binaries`/`collect_candidates`/`wildcard_target_dirs`/`scan_directory_files`/`verify_declared_binaries`/`resolve_binaries` form a clean, already-trait-free pipeline of independent pure(ish) steps over `Path`/`Platform`/`Metadata` — no shared mutable state, no obvious struct to extract. **Not every free-function cluster is a code smell**; this one is a legitimate functional pipeline.

## 5. Cross-module coupling & layering

```
rg -o --no-filename 'use crate::[a-z_][a-z0-9_]*' <src dirs> | sed 's/use crate:://' | sort | uniq -c | sort -rn
```
ocx top imported modules: `oci` (220), `package` (166), `api` (77), `cli` (76), `utility` (40), `file_structure`/`config` (33 each), `package_manager` (29).
grimoire top imported modules: `oci` (301), `config` (159), `install` (137), `lock` (97), `cli` (69), `skill` (55), `tui` (34).

**Layering check (cli → lib, never reverse):**
```
rg -n 'ocx_cli' /home/mherwig/dev/ocx/crates/ocx_lib/src   # 33 hits
rg -n 'ocx_schema' /home/mherwig/dev/ocx/crates/ocx_lib/src # 1 hit
```
All 33 `ocx_lib` hits for "ocx_cli" are doc comments/identifiers containing the substring (e.g. the unrelated function `ocx_cli_identifier()`, comments explaining what lives in the other crate) — **zero actual `use ocx_cli::...` imports**. The 1 `ocx_schema` hit is also a doc comment. **Layering is clean in ocx: no lib→cli or lib→schema violations found.** (grimoire has no internal crate boundary to violate.)

## 6. Public API surface

ocx_lib: 1,118 col-0 `pub ` items, `lib.rs` re-exports 29 `pub mod`s, no dedicated `prelude` module (checked `find ... -iname 'prelude*'` — none exists despite one file referencing "prelude" 11 times as a module name, i.e. `pub mod prelude` exists inside `lib.rs`, just not as its own file).
grimoire: 913 col-0 `pub ` items across `main.rs`'s 24 `mod` declarations (single-binary crate, no `pub mod` re-export surface needed since nothing outside consumes it as a library).

## 7. Where trait abstraction is conspicuously missing (I/O in free functions)

```
rg -c 'std::fs::|tokio::fs::' <src dirs>   # ocx: 1,664 call sites; grimoire: 906
rg -c 'reqwest::Client::new|Client::new\(\)' <src dirs>  # ocx: 3; grimoire: 4
```
Examples of free functions doing direct, untestable-without-a-real-filesystem I/O:
- `ocx_lib/src/package/description.rs:51` — `pub fn load_logo(path: &Path) -> Result<Logo>` (direct `std::fs::read`, no `FileSystem` trait seam)
- `ocx_lib/src/utility/fs/path.rs:296` — `pub fn validate_symlinks_in_dir(root: &Path, dir: &Path) -> Result<()>`
- `ocx_lib/src/setup/shims.rs:314` — `pub fn write_shims(ocx_home: &Path, dry_run: bool) -> Result<Vec<PathBuf>, Error>`
- `grimoire/src/catalog/forge.rs:263` — `fn build_client(timeout: Duration) -> Result<reqwest::Client, reqwest::Error>` (network client built inline, no `ForgeApi` trait per §4.3)

Both codebases have this pattern at similar density; neither is meaningfully better here.

## 8. Every trait defined, both codebases

**ocx (16 total, 1 in ocx_cli, 15 in ocx_lib, 0 elsewhere):**
| trait | file:line | kind |
|---|---|---|
| `Printable: Serialize` | ocx_cli/src/api.rs:19 | output-format seam |
| `ChildWaitExt` | ocx_lib/src/script/ocx_module.rs:262 | extension trait |
| `TreeItem` | ocx_lib/src/cli/data_interface.rs:131 | display seam |
| `StyledInk` | ocx_lib/src/cli/theme.rs:230 | display seam |
| `ClassifyExitCode` | ocx_lib/src/cli/classify.rs:44 | error→exit-code seam |
| `OciTransport: Send + Sync` | ocx_lib/src/oci/client/transport.rs:49 | **real I/O seam** |
| `DeclaredVar` | ocx_lib/src/package/metadata/template/scope.rs:23 | template seam |
| `IndexImpl: Send + Sync` | ocx_lib/src/oci/index/index_impl.rs:11 | **real I/O seam** |
| `IndexTransport: Send + Sync` | ocx_lib/src/oci/index/ocx_index.rs:140 | **real I/O seam** |
| `StringExt` | ocx_lib/src/utility/string_ext.rs:8 | extension trait |
| `SerdeExt: Sized` | ocx_lib/src/utility/serde_ext.rs:6 | extension trait |
| `ResultExt` | ocx_lib/src/utility/result_ext.rs:4 | extension trait |
| `VecExt<T>: Clone` | ocx_lib/src/utility/vec_ext.rs:7 | extension trait |
| `CredentialStore: Send + Sync` | ocx_lib/src/auth/store.rs:101 | **real I/O seam** |
| `MirrorValueShape` | ocx_lib/src/config/mirror.rs:41 | config seam |
| `RegistryPing: Send + Sync` | ocx_lib/src/auth/login.rs:22 | **real I/O seam** |

5 of 16 ocx traits (OciTransport, IndexImpl, IndexTransport, CredentialStore, RegistryPing) are genuine swappable I/O seams; 4 are utility extension traits (String/Serde/Result/Vec-Ext); the rest are display/formatting seams.

**grimoire (6 total, all in src/):**
| trait | file:line | kind |
|---|---|---|
| `OciAccess: Send + Sync` | oci/access.rs:69 | **real I/O seam** |
| `CredentialStore: Send + Sync` | auth/store.rs:51 | **real I/O seam** |
| `ArtifactMaterializer` | install/materializer.rs:23 | **real I/O seam** |
| `InstallProgress` | install/progress.rs:19 | UI seam |
| `Vendor` | install/vendor.rs:180 | domain seam |
| `Printable` | cli/printer.rs:38 | output-format seam |

grimoire has fewer traits in absolute terms (6 vs 16) but a **higher hit rate**: 3 of 6 are real I/O/domain seams and none are pure extension-trait boilerplate. Both codebases' `CredentialStore` traits are near-identical (same name, same bounds) — grimoire's install path is a documented port of ocx's.

## 9. Testing shape

```
find /home/mherwig/dev/ocx/crates -path '*/tests/*' -name '*.rs' | wc -l   # 7
find /home/mherwig/dev/grimoire/tests -name '*.rs' 2>/dev/null | wc -l     # 0 (dir doesn't exist)
rg -c '#\[cfg\(test\)\]' <src dirs>   # ocx: 354 blocks; grimoire: 207 blocks
```
ocx: 354 inline `#[cfg(test)] mod tests` blocks plus 7 standalone integration-test files (`crates/ocx_cli/tests/`, `ocx_lib/tests/`: `linux_self_contained.rs`, `macos_self_contained.rs`, `index_wire_conformance.rs`, `dispatch_conformance.rs`, `tag_verdicts.rs`, `live_index_wire.rs`, `schema_outputs.rs`) — plus a large separate Python acceptance-test tree at repo root (`ocx/test/`, out of scope for Rust counts).
grimoire: 207 inline `#[cfg(test)] mod tests` blocks, **zero** `tests/` directory — 100% of Rust-level testing is inline unit tests; grimoire also has a `test/` Python acceptance tree at repo root, structurally identical in spirit to ocx's.

Neither codebase's free-function style is forcing integration-only testing: both `PackageManager`'s 603 methods and the `command/config.rs`-style free-fn clusters are unit-testable as-is (free functions are *more* directly testable than methods on a 603-method god-struct, if anything — you don't need to construct a full `PackageManager` to call `closure_edges_from_metadata`).

---

## 10 strongest concrete refactoring opportunities

1. **[ocx, highest value] Split `PackageManager`'s 603 methods across 23 files into cooperating structs.** `Composer`, `Resolver`, `Inspector`, `PatchSync` etc. — the file split already exists (composer.rs, resolve.rs, inspect.rs, patch_sync.rs...), it just isn't reflected in the type system. This is a mechanical extraction: each file's `impl PackageManager` block becomes `impl <NewType>`, with `PackageManager` holding one field per extracted type or delegating via `Deref`/explicit methods.
2. **[grimoire] Extract a `ForgeApi` trait for `catalog/forge.rs`'s 20 `github_*`/`gitlab_*` function pairs** (§4.3) — the parallelism is already near-1:1, making this the cheapest, clearest trait win available in either codebase.
3. **[ocx] Give `package_manager/tasks/common.rs`'s 26 closure-resolution free fns a home struct** (§4.1) — nearly every signature threads the same `FileStructure`/`ReferenceManager` pair; bundle into a `ClosureWalker` and drop the repeated params.
4. **[grimoire] Split `command/config.rs`'s 46 free fns (0 impl blocks) into a `ConfigKeyParser` + `ConfigMutator` pair** (§4.2) — cleanest "obviously two structs" case in grimoire, all validation/parse helpers are pure and already logically grouped by naming convention (`parse_*`/`check_*`/`apply_*`).
5. **[both] The 4 `CredentialStore`-style I/O traits are the template to replicate** for `load_logo`/`validate_symlinks_in_dir`/`write_shims` (ocx) and `build_client` (grimoire) (§7) — wrap direct `std::fs`/`reqwest` calls in a `FileSystem`/`HttpClient` trait per the existing `OciTransport`/`OciAccess` precedent, rather than inventing a new pattern.
6. Neither codebase needs *more* traits across the board — ocx's 4 utility extension traits (StringExt/SerdeExt/ResultExt/VecExt) are already the "trait for trait's sake" pattern to avoid; the fix is targeted (items 1–5), not a blanket trait-ification pass.
