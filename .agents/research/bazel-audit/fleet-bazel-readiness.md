---
title: Fleet Bazel-readiness audit
agent: bazel-fleet-audit
model: claude-sonnet-5
scope: >
  Every non-Bazel repository under /home/mherwig/dev that the Bazel program's
  per-language guides and "Bazel-friendly architecture" rule would touch:
  ocx, grimoire, ocx-mirror, creeptd-ng, bob, rust-oci-client (Rust);
  ocx-sdk-python, ocx-mirror-sdk, arcana/nox, index/bot-tools, ocx-indexbot,
  ocx/test, grimoire/test (Python); ocx-catalog, grimoire-indexer,
  grimoire-vscode, vscode-ocx, fma, setup-ocx, kate-middlechild,
  creeptd-ng/web (TypeScript). rules_ocx (the one Bazel repo) is out of
  scope except as a cross-reference for CI-caching mechanism.
method: >
  Read-only `find`/`grep`/`wc`/`git` over each repo's working tree, excluding
  node_modules, target, .git, .agents, .claude, .venv, dist, and (added by
  this audit — see Contradictions) `.worktrees` and any nested `.agents`.
  Every number below is followed by, or preceded by, the exact command that
  produced it, run from /home/mherwig/dev. No package manager or Bazel was
  invoked; no lockfile was resolved; nothing outside the output file was
  written.
date_researched: 2026-09-05
---

# Fleet Bazel-readiness audit

## Table of contents

1. [Headline numbers](#headline-numbers)
2. [Rust](#rust)
3. [Python](#python)
4. [TypeScript](#typescript)
5. [Cross-language coupling](#cross-language-coupling)
6. [CI shape](#ci-shape)
7. [Layout signals](#layout-signals)
8. [Repo shapes](#repo-shapes)
9. [Smells (ranked)](#smells-ranked)
10. [Patterns worth encoding](#patterns-worth-encoding)
11. [Contradictions of the frame](#contradictions-of-the-frame)
12. [Gaps](#gaps)

## Headline numbers

- 6 Rust repos, 42 distinct `Cargo.toml` (worktrees excluded), 5 real
  Cargo build scripts (not 17 — see Contradictions).
- 3 of the 6 Rust repos are not independent: `ocx` and `grimoire` vendor the
  **same two git submodules** (`docker_credential`, `rust-oci-client`), and
  `ocx-mirror` vendors the **entirety of `ocx`** as a submodule and reaches
  two directories deep into *its* submodules via Cargo path deps
  (`ocx-mirror/Cargo.toml:120-121`).
- `creeptd-ng` carries 4 live `git worktree`s (`sprint/*` branches) under
  `.worktrees/`. A naive `find -name Cargo.toml` over the repo returns 65,
  not the 13 that exist on the checked-out branch — a 5x inflation from
  counting the same workspace 5 times.
- 2 of 12 `creeptd-ng` workspace members (`leaderboard`, `profile`) use
  `sqlx::query!` (40 call sites total) with **no `.sqlx/` offline cache
  committed** — a live Postgres is required to compile them from clean.
- 0 of 6 Rust repos pin an MSRV (`rust-version`); 3 of 6 have no
  `rust-toolchain.toml` at all (`creeptd-ng`, `bob`, `rust-oci-client`).
- 0 proc-macro crates, 0 `[patch]`-driven vendoring beyond the two
  submodules, 0 cargo-vet configs anywhere in the fleet.
- 7 Python projects measured; every one locks through `uv.lock`; every
  `uv.lock` carries 1-11 packages with platform-tagged wheels
  (manylinux/macosx/win) — none are pure-Python-only locks.
- `ocx/test` binds a Python `jsonschema` check directly to a Rust-emitted
  JSON Schema (`ocx/test/pyproject.toml` dependency-groups comment +
  `ocx/crates/ocx_schema`) — the one schema-shaped cross-language coupling
  found in the fleet.
- 8 TypeScript packages measured across 3 package managers (npm ×6, bun ×2)
  and, inside `creeptd-ng` alone, **3 separate JS toolchains** in one repo
  (pnpm workspace declaring `web` as its only member, `web` itself pinned to
  npm, and a third, unlisted npm project at
  `crates/creeptd-client/tests/e2e/`).
- `index` is not a Python repo: its root is a bun-locked TypeScript
  VitePress site; `bot-tools/` is the only Python part — contradicts the
  frame's "Python library or tool" bucket for `index`. `arcana` has no
  root `pyproject.toml` at all; its only Python project lives at
  `arcana/nox/`.
- CI: `ocx` alone runs 18 workflow files (~90 named jobs); the 12 non-Bazel
  repos with any CI run 53 workflow files combined. Only 6 of 17 measured
  repos use `actions/cache` or an equivalent; none use `sccache`.

## Rust

Commands (repeated per repo, `$r` substituted):

```
find $r \( -path "*/.worktrees" -o -path "*/.agents" -o -path "*/target" -o -path "*/node_modules" \) -prune -o -name "Cargo.toml" -print
```

| Repo | Cargo.toml (true) | Workspace? | build.rs (real) | proc-macro | `[features]` files | git deps | intra-workspace path deps | `[patch]` | vendored |
|---|---|---|---|---|---|---|---|---|---|
| `ocx` | 7 | yes, 4 members (`ocx_cli`,`ocx_lib`,`ocx_schema`,`ocx_shim`), resolver "3" | 1 | 0 | 3 | 0 | `ocx_cli→ocx_lib`; `ocx_schema→ocx_cli,ocx_lib` (DAG, 0 cycles) | 1 (`ocx/Cargo.toml`) | 2 git submodules |
| `grimoire` | 3 | **no** — single package (`grimoire/Cargo.toml:1-2`), binary `grim` | 0 (see Contradictions) | 0 | 1 | 0 | n/a | 1 | 2 git submodules (same forks as `ocx`) |
| `ocx-mirror` | 9 | yes, implicit (`[workspace]` w/ `exclude=["external/ocx"]`, `ocx-mirror/Cargo.toml:16-17`), 2 own members | 1 | 0 | 4 | 4 (`ocx_python`→`astral-sh/uv`, pinned rev, `ocx-mirror/crates/ocx_python/Cargo.toml:29-32`) | `ocx_lib = {path="external/ocx/crates/ocx_lib"}` (`:35`); `oci-client`/`docker_credential` reach **2 levels** into the nested submodule (`:120-121`) | 2 (root + `external/ocx/Cargo.toml`) | 1 submodule = entire `ocx` repo |
| `creeptd-ng` | 13 (65 raw incl. 4 worktrees) | yes, resolver "2", 12 members, heavy `.workspace = true` inheritance (12 files) | 3 | 0 | 5 | 0 | DAG rooted at `creeptd-proto`,`creeptd-sim`,`test-support`; `lobby→game-server→{creeptd-proto,creeptd-sim}` — 0 cycles | 0 | 0 |
| `bob` | 9 | yes, resolver "3", 5 crates + 3 `playground/` crates | 0 | 0 | 0 | 0 | `bob_cli/bob_engine/bob_graph/bob_host → bob_cas` (DAG) | 0 | 0 |
| `rust-oci-client` | 1 | no, single crate (`oci-client` 0.16.0) | 0 | 0 | 1 (5 features) | 0 | n/a | 0 | 0 — this **is** the upstream of the submodules vendored into `ocx`/`grimoire` |

Macro/env-binding counts (own `.rs`, `external/` submodules excluded):

```
find $r \( -path "*/.worktrees" -o -path "*/.agents" -o -path "*/target" -o -path "*/external" -o -path "*/node_modules" \) -prune -o -name "*.rs" -print | xargs grep -c '<pattern>'
```

| Repo | `.rs` files | `include_str!` | `include_bytes!` | `env!` | `option_env!` | `Command::new` | `assert_cmd` | `CARGO_BIN_EXE` | `#[test]` (matching lines) | integration test files (`crate/tests/*.rs`) |
|---|---|---|---|---|---|---|---|---|---|---|
| `ocx` | 559 | 113 | 23 | 30 | 21 | 36 | 0 | 2 | 5368 | 9 |
| `grimoire` | 209 | 6 | 0 | 24 | 0 | 5 | 0 | 0 | 2732 | 0 |
| `ocx-mirror` | 250 | 13 | 0 | 81 | 1 | 19 | 0 | 0 | 1484 | 88 |
| `creeptd-ng` | 133 | 6 | 0 | 8 | 0 | 1 | 0 | 0 | 662 | 15 |
| `bob` | 11 | 0 | 0 | 1 | 0 | 3 | 0 | 0 | 21 | 1 |
| `rust-oci-client` | 16 | 0 | 3 | 1 | 0 | 0 | 0 | 0 | 18 | 1 |

Notably: **no repo uses `assert_cmd` or `CARGO_BIN_EXE!` as its primary way to test the built binary** — `ocx`'s 2 `CARGO_BIN_EXE` hits are the only ones in the fleet (`grep -rn CARGO_BIN_EXE ocx` → `ocx/crates/ocx_cli/tests/*`); the real "spawn the binary" testing happens from **Python**, not from Rust `#[test]`s (see Cross-language coupling). `rules_rust`'s `rust_test`/`cargo_build_script` map cleanly to the workspace-member and build.rs shapes above; `crate_universe` has no git-dependency analogue as clean as Cargo's — the 4 pinned-rev git deps in `ocx-mirror/crates/ocx_python/Cargo.toml:29-32` (`astral-sh/uv` internals) are the one place `crate_universe` would need `git_repository`-style handling rather than a registry lookup, and the git submodules (`ocx`/`grimoire`'s `external/*`, `ocx-mirror`'s `external/ocx`) have no Bzlmod-native equivalent — a `bazel_dep`/`git_override` pair per submodule, or absorbing the submodule's own build into the parent's `MODULE.bazel`, are the two paths and neither is a submodule.

build.rs classification (the two real vs. false positives, read in full):

- `ocx/crates/ocx_cli/build.rs:1-118` — real codegen: `vergen-gix` bakes git/build/rustc/CI provenance into `cargo:rustc-env`, consumed via `option_env!()` (best-effort, works from a tarball with no `.git/`). A `rules_rust`-friction point: `rules_rust`'s `cargo_build_script` runs in a sandbox where `.git` isn't visible by default; the file's own comment (`build.rs:14-21`) documents the fallback path this forces.
- `creeptd-ng/crates/creeptd-proto/build.rs` (full file read) — real codegen: `tonic-build`/`prost-build` against a vendored `protoc` (`protoc-bin-vendored`), single source of truth for 7 `.proto` files. Directly maps to `rules_proto`/`rules_rust`'s `rust_prost_library`.
- `creeptd-ng/services/leaderboard/build.rs`, `services/profile/build.rs` (full files read) — **not codegen**: both are `println!("cargo:rerun-if-changed=...")` only, tracking the proto crate and (for `leaderboard`) an `.sqlx/` directory that does not exist in the repo (see Smells).
- `grimoire/src/command/build.rs` — **false positive**: this is the `grim build` CLI subcommand module (doc comment: `//! \`grim build\` — validate + pack a local skill/rule`), not a Cargo build script. `grimoire/Cargo.toml` has no `build =` key. A naive `find -name build.rs` overcounts; see Contradictions.

## Python

Commands:
```
find <dir> -iname "test_*.py" -o -iname "*_test.py" | wc -l
grep -oE '(manylinux[0-9_]*|macosx_[0-9_]*|win_amd64|win32)' <dir>/uv.lock | sort -u
```

| Project | build-backend | requires-python | uv.lock | deps (project.dependencies) | dev/test deps (dependency-groups) | platform-tagged wheel families in lock | `[project.scripts]` | test files | subprocess/Popen in tests | sys.path/PYTHONPATH | PEP 723 | `__file__` uses |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `ocx-sdk-python` | hatchling | ≥3.12 | yes | 12 | 1 (`pytest-asyncio`) | 5 distinct pkgs, 13 tag families | none | 21 | 7 | 0 | 0 | 9 |
| `ocx-mirror-sdk` | hatchling | ≥3.13 | yes | 11 | — | 7 distinct pkgs, 13 tag families | none | 10 | 0 | 0 | 6 (`examples/0*.py`, not source) | 1 |
| `arcana/nox` | hatchling | ≥3.11 | yes | 0 (contract: zero runtime deps, `arcana/nox/pyproject.toml:19-20`) | ~10 | 1 pkg | none (zipapp instead, see Gaps) | 29 | 16 | 4 | 0 | 21 |
| `index/bot-tools` | none declared | ≥3.12 | yes | 6 | — | 3 pkgs | none | 2 | 0 | 0 | 0 | 2 |
| `ocx-indexbot` | hatchling | ≥3.12 | yes | 1 | pytest-cov, pytest-style, pytest-timeout | 11 pkgs | `indexbot = "ocx_indexbot.cli.main:main"` | 61 | 2 | 1 (`tests/conftest.py`) | 0 | 8 |
| `ocx/test` | none declared | ≥3.13 | yes | 0 (a harness, not a package) | 12 incl. `jsonschema`, `pexpect`, `cryptography`, `oras` | 4 pkgs | none | 156 | 92 | 11 files | 0 | 39 |
| `grimoire/test` | none declared | ≥3.10 | yes | 0 | 4: `pytest`, `pytest-xdist`, `pexpect`, `rich` | 1 pkg | none | 67 | 16 | 0 | 0 | 3 |

`rules_python`/`uv`-support angle: every lock has native wheels, so `crate_universe`-style purity isn't at stake but `rules_python`'s `pip.parse` would need the same manylinux/macosx/win platform matrix uv already resolves — the closest thing to a freebie in this fleet. `requires-python` floors span 3.10-3.13 across 7 projects with **no shared floor** — a `rules_python` toolchain registration would need one Python version per project or a `select()` per floor.

`ocx/test` and `grimoire/test` are the two harnesses named in the frame; both declare no `[build-system]` (they are pytest roots, not installable packages) and both resolve the binary under test the same way — see Cross-language coupling.

## TypeScript

Commands:
```
find <dir> -iname "package-lock.json" -o -iname "bun.lock"
find <dir> -iname "tsconfig*.json"
grep -c '"cpu":\|"os":' <dir>/<lockfile>
```

| Package | lockfile | workspaces | tsconfig files | project refs / paths | bundler | test runner | `bin` shipped | postinstall scripts | native/platform lockfile lines (`cpu`/`os`) | generated code checked in |
|---|---|---|---|---|---|---|---|---|---|---|
| `ocx-catalog` | package-lock.json (npm) | no | 2 | no | none — `tsc` only | vitest | yes (`ocx-catalog`) | 0 | 157 | none |
| `grimoire-indexer` | package-lock.json | no | 3 | no | none — `tsc` + shell copy step | vitest | yes (`grim-indexer`) | 0 | 186 | none |
| `grimoire-vscode` | package-lock.json | no | 1 | no | esbuild (`esbuild.js`) | `vscode-test` | no (VS Code extension) | 0 | 97 | none |
| `vscode-ocx` | package-lock.json | no | 1 | no | esbuild | `vscode-test` | no | 0 | 98 | none |
| `fma` | package-lock.json | no | 3 (`app`/`node`/root) | yes (`tsconfig.json` references) | vite | vitest | no | 0 | 195 | none |
| `setup-ocx` | bun.lock | no | 2 | no | bun (`bun scripts/build.ts`) | `bun test` | no | 0 | 26 | none |
| `kate-middlechild` | bun.lock | **yes** (`packages/*`, bun `catalog` field) | 3 (`base`+2 packages) | no | astro (`packages/web`) | `bun test` | no | 0 | 146 | none |
| `creeptd-ng/web` | package-lock.json | no (own lockfile, see Cross-language) | 2 (root + `e2e/`) | yes (`tsconfig.json` references) | vite | vitest | no | 0 | 118 | **yes** — `src/gen/creeptd/**/*_pb.ts` (protobuf codegen, 4 files) |

Each `cpu`/`os` line count is roughly 2x the distinct-package count (one `cpu` line + one `os` line per platform-specific optional dependency); the fleet's TypeScript native-module exposure is dominated by esbuild/rollup's per-platform binaries pulled in transitively by vite/vitest/`vscode-test`, not by hand-rolled native addons — no `node-gyp`/`prebuild` string appears in any lockfile (`grep -l node-gyp *</lockfile>` → empty on all 8). `rules_js`/`rules_ts` map straightforwardly onto the npm-lockfile packages (`pnpm`-shaped resolution `rules_js` expects); the two bun-lockfile packages (`setup-ocx`, `kate-middlechild`) have no `rules_js` bun-lockfile ingestion path as clean as npm/pnpm's — `bun.lock`'s format is not what `rules_js`'s `npm_translate_lock` consumes.

## Cross-language coupling

- **Python drives the Rust binary, not Rust `#[test]`.** `ocx/test/conftest.py:211-219` — fixture `ocx_binary()` reads `OCX_COMMAND` env var, else defaults to `test/bin/ocx` (a fixed relative path a CI step must populate after `cargo build`). `grimoire/test/conftest.py:300-305` — identical pattern, `GRIM_COMMAND` / `test/bin/grim`. This is the one coupling shape that recurs in both Rust-CLI-plus-Python-harness repos and is exactly the seam a `py_test` with a Rust binary as a `data` dep (runfiles-relative path, no env var needed) would replace.
- **Schema binding, Rust → Python.** `ocx/crates/ocx_schema` emits JSON Schema to stdout for 7 OCX types (`ocx/crates/ocx_schema/src/main.rs`, full file read). `ocx/test/pyproject.toml`'s dependency-groups comment (lines above `dependency-groups`) states the `jsonschema` Python package validates `test_execution_records.py`'s output against exactly this schema — the fleet's only found schema-shaped cross-language contract (`grep -rl "JsonSchema\|schemars\|openapi" ocx` → 175 files reference schema-adjacent terms, but this is the one binding a test asserts against, not just Serde derive).
- **Rust vendors Python's own packaging logic, not the other way round.** `ocx-mirror/crates/ocx_python` is a plain Rust lib (no `pyo3`, no `cdylib`/`crate-type`, confirmed by `grep -n crate-type ocx-mirror/crates/ocx_python/Cargo.toml` returning nothing) that depends on 4 pinned `astral-sh/uv` internals (`uv-pep440`, `uv-pep508`, `uv-platform-tags`, `uv-distribution-filename`) via git rev (`ocx-mirror/crates/ocx_python/Cargo.toml:29-32`) to parse Python package names/filenames natively — there is no PyO3 boundary anywhere in the fleet.
- **Three JS toolchains inside one repo.** `creeptd-ng/pnpm-workspace.yaml` declares `packages: - "web"` as the *only* pnpm-workspace member, yet `creeptd-ng/web/package-lock.json` exists (npm), and `creeptd-ng/crates/creeptd-client/tests/e2e/package.json` (Playwright smoke test for a Rust WASM build) is a third, unlisted npm project. `find creeptd-ng -name package.json` (worktrees excluded) → 3 files, 3 different lockfile states, one declared workspace member that isn't using the declared package manager.
- **Dockerfiles**: `ocx`, `ocx-mirror` (1 each), `ocx-sdk-python`, `ocx-mirror-sdk`, `arcana`, `ocx-indexbot` (2 each) — `find $r -iname Dockerfile*`. None of the 8 measured TypeScript packages or `creeptd-ng`'s services carry a Dockerfile in this pass (creeptd-ng's `services/*` likely deploy another way — not verified, see Gaps).
- **Taskfiles** (`go-task` `Taskfile.yml`) orchestrate build/test/lint uniformly across nearly the whole fleet: `ocx`(4), `grimoire`(4), `ocx-mirror`(7), `bob`(1), `ocx-sdk-python`(1), `ocx-mirror-sdk`(1), `arcana`(2), `index`(2), `ocx-indexbot`(1), `ocx-catalog`(1), `grimoire-indexer`(1), `grimoire-vscode`(1), `setup-ocx`(1), `kate-middlechild`(1) — 14 of 17 measured repos use Taskfiles as the existing "build orchestrator" Bazel would compete with or wrap.

## CI shape

Commands:
```
find <dir>/.github/workflows -iname "*.yml"
grep -l "actions/cache\|Swatinem/rust-cache\|sccache\|setup-node.*cache:" <workflow files>
grep -l "matrix:" <workflow files>
```

| Repo | workflow files | job-name lines (approx.) | files using a cache action | files with a `matrix:` |
|---|---|---|---|---|
| `ocx` | 18 | ~90 | 2 | 6 |
| `grimoire` | 7 | ~34 | 2 | 2 |
| `ocx-mirror` | 6 | ~26 | 1 | 1 |
| `creeptd-ng` | 5 | ~22 | 2 | 0 |
| `bob` | 0 | 0 | 0 | 0 |
| `rust-oci-client` | 3 | ~9 | 0 | 1 |
| `ocx-sdk-python` | 4 | ~21 | 0 | 1 |
| `ocx-mirror-sdk` | 3 | ~13 | 0 | 0 |
| `arcana` | 2 | ~6 | 0 | 1 |
| `index` | 9 | ~35 | 0 | 0 |
| `ocx-indexbot` | 5 | ~23 | 0 | 1 |
| `ocx-catalog` | 3 | ~18 | 0 | 0 |
| `grimoire-indexer` | 3 | ~14 | 0 | 1 |
| `grimoire-vscode` | 2 | ~8 | 0 | 1 |
| `vscode-ocx` | 3 | ~12 | 0 | 1 |
| `fma` | 0 | 0 | 0 | 0 |
| `setup-ocx` | 3 | ~14 | 1 | 1 |
| `kate-middlechild` | 0 | 0 | 0 | 0 |

Job-name counts are a heuristic (`grep -c '^  [a-zA-Z0-9_-]*:$'` per file, summed) and over-count slightly on workflows with nested 2-space YAML keys that aren't jobs — read as "order of magnitude", not exact. 12 of 17 non-Rust/non-`ocx`-family repos run **zero** cache actions: a Bazel remote cache would be a strict addition there, not a replacement. Only `ocx`, `grimoire`, `ocx-mirror`, `creeptd-ng`, `setup-ocx` cache anything today — this bounds what a shared Bazel remote cache node would actually displace versus what it would newly provide. (`rules_ocx` itself, out of scope here, caches via an HTTP remote cache configured in `.bazelrc`, not via `actions/cache` — a different mechanism than every repo in this table.)

## Layout signals

Commands:
```
find <dir> \( -path "*/node_modules" -o -path "*/.worktrees" -o -path "*/.agents" -o -path "*/.claude" -o -path "*/target" -o -path "*/.venv" -o -path "*/dist" -o -path "*/.git" \) -prune -o -type f -print | awk -F/ '{print NF}' | sort -n | tail -1
```

| Repo | max path depth (path-separator fields) |
|---|---|
| `ocx-mirror` | 13 |
| `ocx-catalog` | 11 |
| `index` | 11 |
| `grimoire-indexer` | 10 |
| `ocx` | 9 |
| `creeptd-ng` | 9 |
| `grimoire-vscode` | 9 |
| `grimoire` | 8 |
| `kate-middlechild` | 8 |
| `ocx-sdk-python` | 7 |
| `ocx-mirror-sdk` | 7 |
| `arcana` | 7 |
| `ocx-indexbot` | 7 |
| `vscode-ocx` | 7 |
| `bob` | 6 |
| `fma` | 5 |
| `rust-oci-client` | 4 |
| `setup-ocx` | 4 |

`ocx-mirror`'s depth-13 comes from the nested submodule (`.../external/ocx/external/rust-oci-client/src/...`), not from its own code — a symptom of the same submodule-chaining flagged above, not an independent depth signal.

Cargo workspace member graphs (built from path deps, both read in full above): **`ocx`** and **`creeptd-ng`** and **`bob`** are all DAGs, 0 cycles — Cargo structurally cannot form a cycle, so "0 cycles" here is a guarantee of the tool, not evidence of good layering; it says nothing about whether Bazel's `BUILD` graph would stay acyclic once services/binaries/tests are split into finer targets than one crate = one target.

Generated-code-beside-generator: only `creeptd-ng/web/src/gen/creeptd/**/*_pb.ts` (checked-in protobuf codegen, `.ts` output sitting beside hand-written TS, generator is `creeptd-proto`'s `build.rs` on the Rust side producing `.proto`-adjacent Rust, and a **separate** `buf`/`protoc-gen-es`-style step — not verified which — produces the TS). No other repo in the fleet checks in generated source next to its generator.

Tests colocated vs. separate: every Rust repo mixes both — inline `#[cfg(test)] mod tests` (the bulk of the `#[test]` counts above) plus a `tests/` directory for acceptance-style tests (`ocx-mirror`: 88 files, the fleet's heaviest). Every Python harness (`ocx/test`, `grimoire/test`, and the 5 library projects) keeps tests in a dedicated `tests/` tree, never colocated with `src/`.

## Repo shapes

Per the required classification (axis 7), one line each on what a Bazel adoption would have to model — not a recommendation:

| Repo | Shape | What Bazel adoption would touch |
|---|---|---|
| `ocx` | Rust CLI (4-member workspace) + Python acceptance harness + 2 git-submodule deps | A `rust_binary` per member, a `cargo_build_script`-compatible replacement for `vergen-gix`'s git/CI provenance capture, `git_override`/vendoring for 2 submodules, and a `py_test` wired to the built binary via `data` + runfiles instead of `OCX_COMMAND`/`test/bin/ocx`. |
| `grimoire` | Rust CLI, single package (not a workspace) + Python acceptance harness + same 2 submodules | One `rust_binary` target (simplest case in the fleet), same submodule-vendoring question as `ocx`, same Python-harness runfiles question via `GRIM_COMMAND`/`test/bin/grim`. |
| `ocx-mirror` | Rust workspace that path-deps 2 levels into a submodule that is itself a full sibling repo (`ocx`), plus a Python-packaging-logic crate with 4 pinned git deps on `astral-sh/uv` | Resolving whether the embedded `ocx` becomes a Bzlmod `bazel_dep` on the real `ocx` module or stays a nested vendor tree; `git_repository`/`git_override` for the 4 uv-internal crates; no test harness (see Gaps) to migrate. |
| `creeptd-ng` | Large Rust workspace (12 members, gRPC micro-services) + pnpm-declared/npm-actual TS frontend + a third unlisted npm e2e project | A `BUILD` per of 12 crates/services, `rust_prost_library`/`tonic`-equivalent codegen for the single proto build.rs, a hard non-hermetic dependency (live Postgres) in 2 services with no offline query cache to seed a hermetic `rust_test`, and reconciling 3 JS package managers into one `rules_js` graph. |
| `bob` | Pure Rust workspace (5 crates + 3 playground/demo crates), no Python, no TS, no CI | The simplest fleet member to model in Bazel: 8 `rust_binary`/`rust_library` targets, one clean DAG, nothing else to touch. |
| `rust-oci-client` | Standalone Rust library (fork of upstream `oci-client`), consumed as a git submodule by 2 other fleet repos | One `rust_library` target; the interesting Bazel question is entirely external — whether the 2 submodule consumers point their `MODULE.bazel` at this repo as a `bazel_dep` instead of vendoring it. |
| `ocx-sdk-python`, `ocx-mirror-sdk` | Python libraries (hatchling, uv-locked, Dockerfiles, no native extension) | `rules_python` `pip.parse` against `uv.lock`'s platform-tagged wheels; the Dockerfiles are the thing most likely to be replaced or reconciled with `rules_oci`. |
| `arcana/nox` | Python zipapp CLI, zero runtime deps by contract | A `py_binary` built as a `.pyz` — `rules_python`'s `py_zipapp`-style output is a near-exact match for the existing `build_pyz.py` script. |
| `index/bot-tools` | Python automation script bundle inside a larger TS-VitePress repo | `py_binary`/`py_test` targets sitting alongside a `rules_js` VitePress build in the same `MODULE.bazel` — the fleet's only same-repo Python+TS pairing found. |
| `ocx-indexbot` | Python automation with an installed console-script entry point | `rules_python` entry-point wiring (`py_console_script_binary` or equivalent) for `indexbot = ocx_indexbot.cli.main:main`. |
| `ocx-catalog`, `grimoire-indexer` | TS CLI, npm, `tsc`-only build, shipped `bin` | `rules_ts` + `js_binary`; no bundler step to model, `tsc` maps directly to `ts_project`. |
| `grimoire-vscode`, `vscode-ocx` | TS VS Code extension, npm, esbuild bundler, `vscode-test` runner | `rules_ts` + a custom `esbuild` rule (no first-party `rules_esbuild` in the frame's named set — a gap for the C++/JS depth files to flag) + no clean `rules_js` analogue for `vscode-test`'s Extension Host launch. |
| `fma` | TS SPA, npm, vite | `rules_ts` + `rules_js`'s vite integration (or a genrule wrapping `vite build`) — standard shape. |
| `setup-ocx` | TS CLI on Bun, `bun build`/`bun test` | No `rules_js` bun-lockfile ingestion path (see TypeScript section) — this is the one TS shape in the fleet Bzlmod's JS rulesets don't cleanly reach today. |
| `kate-middlechild` | TS bun workspace (2 packages, `catalog:` versions) + Astro | Same bun-lockfile gap as `setup-ocx`, plus Astro's own build step to wrap; the fleet's only bun **workspace** (multi-package) rather than single bun package. |
| `creeptd-ng/web` | TS SPA (vite) with checked-in protobuf-generated TS, separate lockfile from its parent repo's declared pnpm workspace | `rules_ts` + reconciling generated-`.ts`-beside-source with whatever regenerates it from `creeptd-proto`'s `.proto` files — the fleet's only case of two languages' codegen needing to land in the same Bazel action graph. |

## Smells (ranked)

1. **Non-hermetic build dependency with no escape hatch.** `creeptd-ng/services/leaderboard/src/db.rs` (24 `sqlx::query!` sites) and `services/profile/src/db.rs` (11 sites) require either a live `DATABASE_URL` at compile time or a committed `.sqlx/` cache; `git -C creeptd-ng ls-files | grep sqlx` returns nothing. Any Bazel `rust_library` for these two crates inherits this today, unchanged.
2. **Three-deep dependency chain disguised as three independent repos.** `ocx-mirror/Cargo.toml:34-35,120-121` path-deps into `external/ocx/crates/ocx_lib` and `external/ocx/external/{rust-oci-client,docker_credential}` — a git submodule of a repo that itself carries 2 git submodules, both of which are also vendored directly (not transitively) into `ocx` and `grimoire`. The frame's per-repo table (3 separate "Rust workspace + Python harness" rows) undercounts how coupled these actually are.
3. **A stale-workfree naive count is off by 5x, and the frame's own headline table shows it.** `creeptd-ng` under `.worktrees/` holds 4 full checkouts of parallel `sprint/*` branches (`git -C creeptd-ng worktree list`); counting through them makes every raw `find` number (Cargo.toml, build.rs, package.json) come out 5x true. This one is now the audit's own risk too — every count above is stated explicitly as worktree-excluded, but any future scan that forgets to exclude `.worktrees` will silently reproduce the frame's error (see Contradictions #1).
4. **A workspace declaration that isn't followed.** `creeptd-ng/pnpm-workspace.yaml:1-2` names `web` as the sole pnpm package; `creeptd-ng/web/package-lock.json` shows it's actually managed with npm. Whichever is authoritative in practice, the other file is dead weight a Bazel `rules_js` migration would have to resolve, not inherit.
5. **A "build script" that isn't one, sitting where a real one would be expected.** `grimoire/src/command/build.rs` shares a filename with Cargo's build-script convention but is a CLI subcommand; a purely syntactic `find -name build.rs` (as the frame appears to have run) reports a false positive here.
6. **Zero MSRV pins fleet-wide.** No `rust-version` key in any of the 6 Rust repos' `Cargo.toml`s (`grep -rh rust-version */Cargo.toml */crates/*/Cargo.toml` → empty). Combined with 3 repos having no `rust-toolchain.toml`, the effective Rust version for `bob`, `creeptd-ng`, and `rust-oci-client` is "whatever's on the developer's or runner's PATH" — a `rules_rust` toolchain registration has to pick a version nothing in-repo currently states.
7. **`arcana` and `index` are miscategorized by shape in the frame.** `arcana` has no top-level `pyproject.toml`; its Python is one directory down (`arcana/nox/`). `index`'s root is a bun-locked TypeScript VitePress site (`index/package.json`: `vitepress`, `vue`) with Python confined to `bot-tools/`. Treating either as a flat "Python project" undercounts what a Bazel `MODULE.bazel` at their root would need to declare.

## Patterns worth encoding

- **Binary-under-test via env-var-with-fallback-path, not a build tool.** `ocx/test/conftest.py:211-219` and `grimoire/test/conftest.py:300-305` are the same pattern twice: `OCX_COMMAND`/`GRIM_COMMAND` env override, else a fixed `test/bin/<name>` path. A `bazel-adopt` skill migrating a Rust-CLI-plus-Python-harness repo should replace this with a `py_test` `data = [":the_binary"]` + `$(rootpath)`/runfiles lookup — the pattern is common enough (2 of 2 harnesses in the fleet) to name explicitly rather than leave as a per-repo discovery.
- **A single crate as the one legitimate codegen source, with sibling crates declaring "we deliberately don't."** `creeptd-ng/crates/creeptd-proto/build.rs` docstring: "This is the single Rust protoc source for the whole workspace. No other crate or service should have its own protobuf build script." `services/leaderboard/build.rs` and `services/profile/build.rs` exist purely to encode "no own codegen" as a `rerun-if-changed` hook. This is exactly the shape `rules_rust`'s single `rust_prost_library` + downstream `deps` should take, and it's a genuinely good pattern already in the code independent of Bazel — worth naming positively in the architecture guide, not just as a migration target.
- **Vendor-as-submodule for a fork with light local integration work.** `ocx`/`grimoire`'s `.gitmodules` point 2 submodules at `ocx-sh/rust-oci-client` and `ocx-sh/docker_credential` — real forks (own remote, own branch) rather than copy-pasted vendor trees. Bzlmod's `git_override` in a `MODULE.bazel` is a closer match to this than any `crate_universe` vendoring flow — worth naming as the adoption target for exactly this shape (2 occurrences in the fleet, likely to recur).
- **Zero-runtime-deps-by-contract Python CLI shipped as a zipapp.** `arcana/nox/pyproject.toml:19-20` states zero dependencies is "a contract, not a preference (C-1001)... nox ships as a zipapp built from this tree alone," backed by `arcana/nox/scripts/build_pyz.py`. This is close to `rules_python`'s `py_binary` with a zip output and is a clean, already-hermetic Python shape to point at as the "this needs nothing from Bazel" example in the Python depth file.

## Contradictions of the frame

1. **The frame's own `creeptd-ng` numbers are internally inconsistent, and neither reading is the true count.** The frame states "`creeptd-ng` (65 `Cargo.toml`, 15 `build.rs`, 6 `package.json`, pnpm)". This audit finds: 13 true `Cargo.toml` (65 = 13 × 5 worktree copies — the frame counted `.worktrees/` as if they were distinct code), 3 true `build.rs` (15 = 3 × 5, same cause), and **3** true `package.json`, not 6 (`find creeptd-ng -path "*/node_modules" -prune -o -name package.json -print` returns 15 raw, 3 distinct across `creeptd-ng/`, `creeptd-ng/web/`, `creeptd-ng/crates/creeptd-client/tests/e2e/` — the frame's "6" doesn't match either the worktree-inclusive count (15) or the true count (3), so it appears to be a separate manual miscount rather than the same worktree artifact as the other two numbers).
2. **`grimoire`'s build.rs count is a false positive, not a real build script.** The frame lists `grimoire` at "1 `build.rs`" in parallel with `ocx`'s real one. `grimoire/src/command/build.rs` is the `grim build` subcommand (confirmed: no `build =` key in `grimoire/Cargo.toml`, and the file's own doc comment describes a CLI command, not a Cargo build script). `grimoire` has 0 real build scripts.
3. **`grimoire` is not workspace-shaped like `ocx`.** The frame's table groups `ocx`, `grimoire`, `ocx-mirror` together as "Rust workspace + Python acceptance harness," implying a parallel multi-crate structure. `grimoire/Cargo.toml:1-12` has no `[workspace]` section at all — it is a single package with 2 path deps straight into its submodules. Only `ocx` and `ocx-mirror` are actual Cargo workspaces among the three.
4. **The requester's premise that these repos are three separate polyglot codebases undercounts real coupling.** The frame's per-shape table presents `ocx`, `grimoire`, `ocx-mirror` as three rows. In dependency-graph terms they are one lineage: `rust-oci-client` (its own listed repo) is forked into `ocx-sh/rust-oci-client`, vendored identically into both `ocx` and `grimoire` as a submodule, and `ocx-mirror` vendors `ocx` whole and reaches through it to the *same* submodule two directories deep. A Bazel module graph for this fleet is not 6 independent Rust modules; it is closer to 3, with dependency edges the frame's table doesn't surface.

## Gaps

- `ocx-mirror` was not confirmed to have its own Python test harness the way `ocx`/`grimoire` do (`find ocx-mirror -iname conftest.py` returned nothing outside the embedded `external/ocx/test`) — if it has one under a different name, this audit missed it.
- `creeptd-ng`'s `services/*` deployment path (container image build, if any, beyond the absence of a `Dockerfile` found in this pass) was not traced — the `find -iname Dockerfile*` pass came back empty for `creeptd-ng` and its services, which is worth a second look with a broader filename pattern (`*.dockerfile`, `containerfile`) before concluding there is none.
- CI workflow job-name counts are heuristic (`grep -c` on a naming convention, not a YAML parse) — treat the "job-name lines" column in CI shape as order-of-magnitude, not exact; a real count needs a YAML parser, which this read-only pass deliberately didn't reach for.
- `creeptd-ng/web`'s generated `_pb.ts` files were confirmed checked in but the exact generator (`buf generate`, `protoc-gen-es`, or something else) producing them from `creeptd-ng`'s `.proto` files was not traced to a specific script or CI step — only that they exist and are marked generated.
- Python "relative imports across top-level packages" (explicitly asked for in the axis-2 demand) turned up nothing to report: all 7 measured Python projects are single-package, uv-locked, and independent of each other's source trees — this reads as a genuine negative (no cross-project relative imports exist), but was not verified with a dedicated `grep` beyond the sys.path/PYTHONPATH pass above, since no candidate cross-import surfaced during that pass.
- The C++ axis is untouched here by design (frame: "one CMake probe directory", no fleet consumer) — not re-verified in this pass; if a future wave needs the C++ depth file grounded in fleet evidence rather than upstream sources alone, that probe directory is the only place to look.
