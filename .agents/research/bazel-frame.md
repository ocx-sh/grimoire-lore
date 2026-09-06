---
title: Bazel expertise — phase 0 frame
program: bazel
date: 2026-09-05
method: research-lang (a build system and its language rulesets, not a language)
status: active
---

# Bazel — the frame

Written before any worker was spawned. Everything below is a hypothesis the
grounding wave may overturn; corrections are appended at the bottom, never
edited into the body.

## The domain and its era

Bazel as a polyglot build system: Starlark (rules, macros, symbolic macros,
aspects, transitions, repository rules, module extensions), Bzlmod (`MODULE.bazel`,
lockfile, registries, BCR), configuration (`.bazelrc`, platforms, toolchains,
`select()`), remote caching and remote execution (REAPI, BwoB, cache hygiene),
hermeticity and determinism, testing under Bazel, CI patterns (target
determination, cache warming, untrusted-PR cache policy), performance
(profiling, analysis cost, JVM memory), and the per-language rulesets the owner
named: TypeScript/JavaScript (`rules_js`/`rules_ts`), Python (`rules_python`),
Rust (`rules_rust` + crate_universe), C++ (`rules_cc`, `toolchains_llvm`,
`hermetic_cc_toolchain`). Plus "Bazel-friendly architecture": how a codebase is
laid out so Bazel is cheap rather than a tax.

Era: September 2026. `rules_ocx` pins Bazel **8.7.0** (`.bazelversion`) and its
CI matrix runs 8.7.0, `9.x` and `rolling`. Bzlmod is the only dependency system
that matters; `WORKSPACE` is legacy and, per the release plan, gone in 9 (verify).
Shifts to check rather than assume: symbolic macros (8), `--vendor_dir`,
autoload of legacy `native.*` rules out of core, BwoB default, Skymeld, lockfile
format churn, `bazel mod tidy`, `repository_ctx.getenv`, Aspect CLI and
Bazel Steward, rules_js 2.x, rules_python 1.x with uv support, rules_rust
0.6x, the `--incompatible_*` flips between 8 and 9, BazelCon 2024/2025 and
Build Meetup talks, and the build-systems research literature since
"Build Systems à la Carte" (2018).

## The codebases that will adopt the output

Measured 2026-09-05 with `find` under `/home/mherwig/dev`, excluding
`node_modules`, `.git`, `target`, `.agents`.

**One Bazel repository exists in the fleet: `rules_ocx`.** A Bazel module
extension plus repository rules that provision tools through the OCX package
manager. 5,855 lines across the `.bzl`, `BUILD.bazel` and `MODULE.bazel` files
(`wc -l`); public surface `//ocx:defs.bzl` and `//ocx:extensions.bzl`, private
under `ocx/private/`. Version 0.4.0, published to the BCR. CI: Lint job,
Test matrix (3 OS × 3 Bazel versions), Examples matrix (live registry),
BCR-parity job (4 platforms, deliberately no cache), pin-completeness guard,
Offline-determinism job (deliberately no cache). Remote cache: an HTTP cache at
`bazel-cache.ocx.sh`, read-only for pull requests via
`--remote_upload_local_results=false`, write-authorised on `main` pushes. No
remote execution. The developer machine's `.bazelrc.user` (gitignored) points
`CC` at a zig wrapper and disables `layering_check` — a host-specific,
non-hermetic C toolchain arrangement that is itself a finding. **That file
also holds a cache write credential; no artifact may quote it.**

**Nothing else in the fleet builds with Bazel today.** The polyglot repos that
a Bazel adoption or a "Bazel-friendly architecture" rule would touch:

| Shape | Repos | Measured |
|---|---|---|
| Rust workspace + Python acceptance harness | `ocx` (7 `Cargo.toml`, 1 `build.rs`, 2 `pyproject.toml`), `grimoire` (3, 1, 2), `ocx-mirror` (9, 1) | Rust CLI driven by subprocess pytest |
| Large Rust workspace + TypeScript | `creeptd-ng` (65 `Cargo.toml`, 15 `build.rs`, 6 `package.json`, pnpm) | The only fleet repo at "monorepo" scale |
| Rust workspace | `bob` (9, 0), `rust-oci-client` (1) | |
| Python library or tool | `ocx-sdk-python`, `ocx-mirror-sdk`, `arcana`, `index`, `ocx-indexbot` (1 `pyproject.toml` + `uv.lock` each) | uv everywhere |
| TypeScript | `ocx-catalog`, `grimoire-indexer`, `grimoire-vscode`, `vscode-ocx`, `fma` (npm), `setup-ocx`, `kate-middlechild` (bun) | Three package managers |
| C++ | none (one CMake probe directory) | The C++ guide has no fleet consumer and is grounded on canonical sources and upstream exemplars instead |
| Protobuf | zero `.proto` files | |

The second audience is `rules_ocx`'s own users — "Bazel monorepo maintainers",
per its `AGENTS.md` — which is why the artifacts publish through lore rather
than living in one repo.

Existing AI config that already governs Bazel, all in `rules_ocx`: `AGENTS.md`
(~300 lines: architecture, invariants, the two-tier ocx CLI contract, env
classes), `.claude/rules/starlark.md` (40 lines), `mirror-auth.md` (19),
`release.md` (12), `dist-snapshot.md` (86), one skill (`update-dist`), one ADR
(policy tag and env classes), one research note (`research_bazel-policy-surfaces.md`,
2026-09-02). Sibling lore sets whose globs a Bazel rule must not silently
duplicate: `rust-cargo` (`**/Cargo.toml`), `python-packaging`
(`**/pyproject.toml`, `**/uv.lock`), `typescript-packaging` (`**/package.json`,
`**/tsconfig*.json`).

## The requester's hypothesis (to test, not to accept)

1. Per-language guides (TypeScript, Python, Rust, C++) are the core
   deliverable: each language's domain under Bazel, where Bazel fits it well
   or badly, and the best-effort usage pattern.
2. Remote execution and caching are a first-class topic, not a CI footnote.
3. The real pain points live in blog posts and migration retrospectives, not
   in the official docs.
4. "Bazel-friendly architecture" is a distinct topic from "using Bazel".
5. Recent papers, blog posts and conference talks (BazelCon, Build Meetup)
   carry current best practice that the model's training data lacks.
6. Breadth first: grasp the whole landscape, then research each topic
   individually, then re-research from the expert's vantage point.

The scouts must find what this list does not name. Candidates the frame
suspects but did not verify: Bzlmod migration and lockfile hygiene; module
extension purity and `reproducible`; repository-rule hermeticity (`getenv`,
`watch`, unsandboxed fetches); hermetic toolchains (cc autodetection, host
Python, host Node); Windows; IDE and LSP support (rust-analyzer, Pyright,
tsserver under Bazel); BUILD generation with Gazelle; target determination in
CI (`bazel-diff`, target-determinator); test size, sharding, flakiness and
`--runs_per_test`; BwoB and `--remote_download_*`; action-key determinism
(timestamps, absolute paths, `PYTHONHASHSEED`, archive metadata); cache
poisoning from untrusted PRs; `glob` misuse; `select()` explosion; macros
versus rules versus symbolic macros; stardoc and docs freshness; buildifier
warnings as a taxonomy; `--incompatible_*` churn; JVM memory and analysis-time
performance; dual build systems during migration (Cargo/uv/pnpm alongside
Bazel); Buck2 and Pants as the comparison set.

## The artifact set (hypothesis)

Per `research-lang/references/rule-distillation.md`: rules carry standards,
skills carry procedures. Hex workers read rules, not skills, so anything a
reviewer or builder needs while editing belongs in a rule.

| Artifact | Kind | Carries |
|---|---|---|
| `bazel-quality` (working name) | Glob-scoped rule + support directory | The standards: Starlark and BUILD hygiene, Bzlmod and module extensions, repository rules, `.bazelrc` and flags, caching and RBE, hermeticity, testing, CI, performance, architecture; one depth file per language (`rust`, `python`, `javascript-typescript`, `cpp`) |
| `bazel-adopt` (working name) | Skill | The procedure: take an existing polyglot repository into Bazel — measure, pick the wrap-or-split strategy per language, restructure toward Bazel-friendly boundaries, stand up the gate |
| `bazel-diagnose` (working name) | Skill | The procedure: find why a build is slow, non-hermetic or missing the cache — profile, execution log, `aquery`, cache-hit analysis, action-key diffing |
| `bazel-essentials` | Bundle | The above, members untagged |

Open glob question for the map. Names the build system guarantees:
`**/BUILD.bazel`, `**/BUILD`, `**/*.bzl`, `**/MODULE.bazel`, `**/.bazelrc`,
`**/.bazelversion`, `**/WORKSPACE`, `**/WORKSPACE.bazel`, `**/*.bzlmod`?
(verify). Names convention chooses: `*.bazelrc`, `.bazelignore`,
`MODULE.bazel.lock` (166 KB in `rules_ocx`; loading a rule while editing it is
noise). The `globs-must-not-miss` decision says wide plus a tight index beats
narrow. Whether the per-language depth files should also load on `Cargo.toml`,
`pyproject.toml` or `package.json` inside a Bazel repository is a map question,
because those globs already belong to sibling sets.

## Constraints the shipped artifacts must meet

- Rule IDs `BZL-<FAMILY>-nn`. `BZL-` is reserved for this set. A prefix
  belongs to exactly one rule set.
- Index under 200 lines. Skill body under 500 lines. Depth files carry a table
  of contents past 100 lines and never point at each other.
- Every rule carries a verification: a buildifier warning name, a
  `bazel query`/`cquery`/`aquery`/`mod` command, a grep over BUILD or `.bzl`
  files, or a named reading heuristic. Every verification states which way
  empty output reads.
- Version-specific guidance names the Bazel major (7, 8, 9) and the ruleset
  version it applies to, dated.
- Portable: no fleet paths, no ocx-internal names in the shipped files. The
  `rules_ocx` mechanisms are worked examples of a pattern, never the pattern.
- House voice of the sibling sets: traps, not maps.
- Written under the `docs-quality` plain-English limits where they apply to
  prose (short sentences, one idea each).

## Corrections

Appended by later waves. Where a correction disagrees with the body above,
the correction wins.

### Wave 1 grounding and scouting (2026-09-05)

Sources: `bazel-audit/config-inventory.md`, `bazel-audit/starlark-code-shape.md`,
`bazel-audit/build-contracts-and-ci-posture.md`, `bazel-audit/fleet-bazel-readiness.md`,
and the nine scouts under `bazel-topic-map/`. 13 workers, 0 dropped, 281
sources across the scouts, ~370 candidate rows before deduplication.

1. **The fleet table is wrong in method.** `find` counted four stale sprint
   worktrees under `creeptd-ng/.worktrees/` as code. True counts: creeptd-ng
   has 13 `Cargo.toml`, 3 `build.rs`, 3 `package.json` (not 65/15/6).
   `grimoire/src/command/build.rs` is the `grim build` subcommand, not a Cargo
   build script: grimoire has 0 build scripts and no `[workspace]` section.
   `arcana` has no root `pyproject.toml` (Python lives under `arcana/nox/`);
   `index` is a bun-locked VitePress site with Python confined to `bot-tools/`.
   ocx, grimoire and ocx-mirror are one dependency lineage, not three
   independent repos: ocx and grimoire vendor the same two git submodules and
   ocx-mirror vendors all of ocx as a submodule, path-depending two levels
   into it. creeptd-ng has two services using `sqlx::query!` with no `.sqlx/`
   offline cache: a live-database build dependency. 0 MSRV pins fleet-wide;
   3 of 6 Rust repos have no `rust-toolchain.toml`.
2. **The era is one major behind.** As of 2026-09-05 Bazel 9 is the Active
   LTS (9.2.0) and Bazel 8 is in Maintenance (8.8.0); `rules_ocx` pins 8.7.0.
   Bazel 9.0 shipped 2026-01-20: WORKSPACE support code is deleted (not
   disabled), `--enable_workspace` is a no-op, `--incompatible_autoload_externally`
   defaults empty so every `cc_*`/`java_*`/`py_*`/`sh_*`/`proto_library` needs
   an explicit `load()`, `--repo_contents_cache` is stable and gated on a
   module extension's `reproducible = True`, and `compatibility_level` is a
   documented no-op on 8.6+/9.1+. Current rulesets: rules_js 3.4.1 (3.0 in
   Feb 2026 dropped Bazel 6, WORKSPACE, pnpm < 9), rules_python 2.3.3,
   rules_rust 0.74.0 (2026-08-28, still shipping crate_universe lockfile fixes),
   rules_ts requires an explicit `transpiler=` since 2.0. `--experimental_remote_merkle_tree_cache`
   does not exist; the live flag is `--experimental_remote_discard_merkle_trees`.
   `--incompatible_strict_action_env` now defaults true.
3. **`rules_ocx` is a positive exemplar, not a cautionary tale.** 0 `rule()`
   declarations in production: the public surface is 4 `repository_rule()` +
   1 `module_extension()`. 51 of 51 production attrs carry `doc =`. 9
   `getenv` and 4 `watch` sites funnel through 2 tested helpers; both
   `download` sites carry `sha256`. 0 real `**` globs, 1 real `select()`.
   Module-extension purity is documented in a source comment. The frame's
   suspected pain points (glob misuse, `select()` explosion, repo-rule
   hermeticity) have no supporting evidence in this repo. Real smells: the 4
   repository-rule `_impl` functions have zero `analysistest` coverage of
   their own orchestration; `repo_utils.bzl` (1,602 lines) spans 7 concerns;
   generated BUILD content is raw string concatenation in 4 places, invisible
   to buildifier; docs freshness runs only on the 8.7.0 CI leg; no
   `MODULE.bazel.lock` freshness guard; 31 of 45 normative claims in
   `AGENTS.md` + `starlark.md` carry no re-runnable verification.
4. **The `.bazelrc.user` C toolchain override is inert, not a live bug.** The
   repo compiles zero `cc_*` targets. Latent trap, recorded as such. The
   credential in that file is a finding independent of Bazel: `--credential_helper`
   has been stable since Bazel 7.0.
5. **RBE is structurally out of reach for `rules_ocx`, by design.** The
   launcher model resolves absolute host-store paths (the nixpkgs model, per
   its README), which remote execution cannot reproduce. RBE guidance in the
   shipped set is for the adopting monorepo, not for this ruleset. BCR-parity
   is 4 platforms × 2 Bazel versions = 8 shards, not 4. The Examples job runs
   uncached with no stated rationale, unlike its two siblings.
6. **The Bazel toolchain is already an OCX product.** `bazel`, `bazelisk`,
   `buildifier`, `buildozer` and `bazel-lsp` are published OCX packages
   (`ocx-contrib/mirror-bazelbuild`, `mirror-bazel-lsp`), invisible to any
   `.claude`/`.agents` grep. Dev-tool provisioning has three competing
   patterns (rules_multitool, `bazel_env.bzl`, the OCX extension) and no
   source declares a winner. `ocx-contrib/create-mirror` runs real Bazel
   dialect Starlark for package smoke tests and has hit dialect bugs
   (top-level `if`/`for` statements) that `rules_ocx` never surfaced.
7. **Hypothesis 1 (per-language guides) is neither supported nor refuted by
   the fleet.** No fleet repo uses `cc_*`, `py_*`, `js_*` or `rust_*` rules.
   The per-language guides ground on the rulesets' own docs and the
   practitioner corpus. Key facts that reshape them: rules_python's uv
   integration only speeds up `pip compile`; it does not consume `uv.lock`
   and `pylock.toml` is unshipped, so the fleet's uv-everywhere posture does
   not carry over. `ts_project` builds succeed with type errors by design;
   only the generated `typecheck_test` gates. rules_js requires pnpm because
   its virtual store is the only layout Bazel actions can reproduce.
   crate_universe keeps two lockfiles (`Cargo.lock`, `cargo-bazel-lock.json`)
   that drift; `CARGO_BAZEL_REPIN=1` is the one command every source repeats.
   rules_cc ships no hermetic toolchain; `BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1`
   is the only way off autodetection.
8. **Hypothesis 3 (pain points live in blogs) is half right.** The fleet's own
   research note cites official docs 4× more than blogs. The scouts found the
   pain in GitHub issues and BazelCon talks as much as in blogs. And Bazel's
   own `remote/ci` doc is stale (WORKSPACE-era `rbe_autoconfig`), so official
   docs are not uniformly the safer source either.
9. **Practitioners disagree on target selection.** Aspect calls `bazel-diff`
   "very incorrect" and recommends one whole-repo green pipeline; Tinder
   reports 93 percent CI time savings from it at BazelCon 2025. Unresolved;
   the map must state both and pick a default with the assumption named.
10. **Adoption is a decision, not a premise.** Roughly 11 percent of adopters
    abandon Bazel around year two; RabbitMQ removed it 2025-03; the 2026
    consensus is that small, single-language or JS-only repos often should
    not adopt. Symbolic macros' lazy evaluation, their headline performance
    promise, was unshipped as of 2025-11-20.
11. **Line count calibration.** An identical-intent `wc -l` produced 5,851
    against the frame's 5,855. Four-line drift, noted.

### Decisions taken by the orchestrator after the map (2026-09-05)

`bazel-topic-map.md` lists eight questions for a human, each with a default.
The owner delegates detail and oversees direction, so the defaults are adopted
here with the assumption stated. Each is reversible by editing one artifact.
Three remain the owner's and are marked.

| # | Question | Decision | Assumption |
|---|---|---|---|
| 1 | Pilot Bazel in a fleet repo | **Owner.** No pilot assumed. `bazel-adopt` names `bob` as the candidate (9 crates, clean DAG, no Python or TypeScript, no CI to preserve). | Artifacts ground on upstream sources plus `rules_ocx`. |
| 2 | Move `rules_ocx` from 8.7.0 (Maintenance) to 9.x (Active) | **Owner.** Pin stays. Artifacts carry dated guidance for 8 and 9 side by side. | The stardoc goldens match only 8.7.0; moving costs the docs-freshness signal. |
| 3 | Target determination vs whole-repo green | Whole-repo green is the default. Selection becomes the default above the target count the wave-3 CI dive names. | No fleet repo is at monorepo scale (creeptd-ng is 13 crates); both tools document correctness gaps. |
| 4 | Cross-set pointers into `rust-cargo`, `python-packaging`, `typescript-packaging` | Ship `bazel-essentials` self-contained. Propose the three one-line pointer edits as separate work. | The "edit only `Cargo.toml`, forget to repin" miss stands until they land, and is recorded in the map (M-I-02). |
| 5 | `MODULE.bazel.lock` in the glob | In. | A conflicted lockfile is the highest-value moment for the rule; cost is one index load. |
| 6 | Migrate the cache write credential to `--credential_helper` | **Owner.** Rule states the helper as MUST for a new setup, SHOULD for an existing one. Fleet fix filed separately. | Stable since Bazel 7.0. |
| 7 | Ship `cpp.md` with no fleet consumer | Ship it, marked in the file as grounded on upstream sources only. | `rules_ocx`'s audience is Bazel monorepo maintainers; C++ is where hermeticity is hardest. |
| 8 | Claim `**/*.star` and `**/*.scl` | Yes. | Extension globs cannot miss; the dialect bug shipped twice in `ocx-contrib`. |

### Wave 2 consolidations (2026-09-05)

Sources: `bazel-starlark-and-build.md`, `bazel-bzlmod-and-repo-rules.md`,
`bazel-caching-rbe.md`, `bazel-hermeticity-determinism.md`,
`bazel-architecture-monorepo.md`, `bazel-typescript.md` and their 15 dives
(265 sources, 216 primary). 173 rules, 106 MUST. Where a line below disagrees
with an earlier correction, this one wins.

1. **The buildifier gate is already hard.** Map conflict 18 and
   `starlark-code-shape.md:64` read `lint_mode = "warn"` as non-blocking.
   Tracing `buildifier.go` and running v8.5.1 against a formatted file with one
   `depset-union` violation gives exit 4 regardless of mode, and `rules_ocx`'s
   chain (`taskfile.yml` → `bazel run //:buildifier.check` → `ci.yml`)
   suppresses nothing. Caveat: `buildifier_prebuilt`'s runner wraps the
   binary in `find -exec … +`, so the documented exit codes 0–4 collapse to
   one pass/fail bit. Buildifier ships 99 warning categories (not ~84), 98 on
   by default, 43 citing a flag, and 7 of those cited flags no longer exist
   in Bazel source. The "Flag in Bazel" column is provenance, not a switch.
2. **`--incompatible_strict_action_env` defaults false on every Bazel 8.x and
   true only from 9.0.0** (per-tag reads of `BazelRuleClassProvider.java`).
   Correction 2 above overstated it. `rules_ocx`'s 8.7.0 legs inherit
   `LD_LIBRARY_PATH` and the client `PATH`; its 9.x legs do not; nothing
   announces the split.
3. **`--repo_contents_cache` is keyed on `repository_ctx.repo_metadata()`**
   (Bazel 8.3.0+), not on the extension's `reproducible = True`, which buys
   lockfile exclusion only. It shipped on by default in 8.3.0 and was walked
   back to opt-in in 8.4.0 after a regression; no source states it was
   re-enabled. Not "stable". Also: `LOCK_FILE_VERSION` is 28 on master and 24
   in the fleet's committed lock; the schema's shape moves, not only its
   number. No rule may cite a lockfile version from documentation.
4. **Glob list gains a fifteenth entry: `**/REPO.bazel`.** On Bazel 8+ it
   carries `ignore_directories()`, the mechanism that keeps the directory walk
   out of pnpm's `node_modules`. Bazel's own file-name contract; cannot miss.
5. **`rules_ocx` has a live lockfile defect no wave-1 audit read:**
   `.gitattributes:5` sets `MODULE.bazel.lock merge=union`. A JSON-unaware
   line driver writes no conflict markers, so Bazel's own conflict-marker
   detection never fires and a merged lockfile can silently carry both sides.
   Also: no lockfile freshness gate anywhere; three of four repository rules
   read `ctx.os` and none sets `configure = True`.
6. **Exit code 39 is unconditional since Bazel 7.0** and reachable on a
   cache-only, locally executing build, because the `toplevel` BwoB default
   leaves intermediate outputs as CAS references. Second phantom flag:
   `--incompatible_remote_use_new_exit_code_for_lost_inputs` was deleted
   2025-02. `--credential_helper` must be configured from a non-repository rc
   file, never a committed `.bazelrc` (bazelbuild/bazel#30439, intended).
   The "remote execution is a non-goal" passage is `README.md:266-270`.
7. **The "Offline-determinism job" name overclaims.** It proves cold-store
   correctness (warm fetch, offline refetch, empty-store fails); it compares
   no action keys and would pass unchanged with a non-deterministic action.
   Windows CI legs exist (3 of 9 test shards plus a BCR-parity target), so
   `processwrapper-sandbox` and the missing `--output_user_root` bind today.
8. **Versions.** rules_ts is 3.10.1 (2026-08-21); its released `MODULE.bazel`
   declares no `bazel_compatibility` floor while `main` carries `>=7.7.0`.
   `inherit_attrs` on `macro()` is a Bazel 8.0.0 feature that the 9.0.0
   release notes misdate. Symbolic macros: correct for typing, visibility
   and naming; still no performance win (lazy evaluation unshipped).
9. **Generated Starlark is the largest blind spot in `rules_ocx`:** 8 write
   sites (not 4), two of which generate a `.bzl` a consumer loads; the unit
   tests over the rendered strings assert substrings only, under a comment
   that claims "Must be valid Starlark". Every grep-based verification in the
   shipped set must state that generated-repo BUILD text is out of its reach.
10. **Map fixes.** M-G-05's verification does not exist as written; the
    runnable form is `gazelle_test` (mode defaults to `diff`). M-G-24
    (lockfile as an editable file) belongs to `BZL-MOD`, not `BZL-ARCH`. The
    package-per-directory rule lives on `configure/best-practices`, not
    `concepts/build-files`. Conflict 8 is one-directional and needs the other
    half: a bazel.build prose page can be ahead of the numbered releases too
    (`transitive_visibility` on HEAD, absent from 8.1.0 and 9.1.0).
11. **Per-language glob cost is larger than the map said.** Nine of the 27
    `BZL-JS` rows verify against `package.json`, `pnpm-lock.yaml`,
    `pnpm-workspace.yaml` or `tsconfig.json`. Decision 4 stands; the Q4
    pointer edit into `typescript-packaging.md` is what closes it. Two fleet
    packages are bun-locked with no `npm_translate_lock` ingestion path:
    `bazel-adopt` says "convert to pnpm or do not adopt", no bun branch.

### Wave 3a consolidations (2026-09-05)

Sources: `bazel-python.md` (BZL-PY, 30 rules, 23 MUST) and `bazel-testing.md`
(BZL-TEST, 25 rules, 14 MUST) and their 5 dives (87 sources, 75 primary).

1. **Python hermeticity under Bzlmod is not opt-in.** The frame, the brief
   and map row M-J-01 were wrong: rules_python's own `MODULE.bazel` registers
   a hermetic prebuilt soft-default toolchain for any root module that never
   calls `python.toolchain()`. The host-PATH autodetecting toolchain is a
   WORKSPACE-era fallback. The real risk is an unpinned ROLLING default (3.11
   at the 2.3.3 tag, 3.14 on `main` four months later), so the rule is "pin
   explicitly", not "register at all". A zero grep count means "hermetic but
   unpinned", never "non-hermetic".
2. **uv dates.** `pip.parse(uv_lock=)` is `versionadded 2.2.0` (2026-06-30),
   refined 2.3.0 (2026-08-07) to drop workspace and root members; map
   conflict 4 said 2.1.0. Three of the fleet's seven `uv.lock` files declare
   a root member (`source = { virtual = "." }`), exactly what 2.3.0 stopped
   exposing. `pip.parse` gained `pyproject_toml=` at 2.3.0 but needs an exact
   `==X.Y.Z` pin; every fleet `requires-python` is a `>=` range.
3. **rules_python doc bug.** Its multi-platform PyPI example and a 1.0.0
   CHANGELOG entry write the libc `config_setting` value as `muslc`; the flag
   enum is `musl`. A `config_setting` copied from the official doc never
   matches.
4. **Precompiling.** `--precompile` resolves `auto` to disabled in current
   source; issue #2212 (named by the map as "open years later") closed in one
   month; the real still-open caveat is #2445 (action conflict on shared
   `srcs` with differing `exec_properties`, open since 2024-11-26). The
   `script` bootstrap never became the default; `system_python` (venv per
   target since 2.0.0) is the shipped default and `PYTHONSAFEPATH` override
   is `script`-only. `sys.path` order flipped at 1.7.0 (2025-10-11) to
   `[stdlib, app paths, site-packages]`.
5. **Gazelle Python is loud, not silent.** Map row M-J-13 said generation
   silently fails to resolve third-party imports; with
   `python_validate_import_statements` at its default an unresolvable import
   is a generation-time error naming three remediations.
6. **`analysistest.make()` cannot target a repository rule or a module
   extension.** Map row M-E-10, `starlark-code-shape.md:272` and correction 3
   above share the category error. Restate the gap as "zero offline
   orchestration tests" for the four `_impl` functions; the technique that
   works is the fleet's own fake-ctx `unittest` pattern (BZL-TEST-15).
7. **The test contract did not move between 8 and 9.** The 8.7.0 and 9.1.0
   test-encyclopedia snapshots are byte-identical except for a new implicit
   `test` exec group on `@bazel_tools//tools/test:default_test_toolchain_type`.
   Any other Bazel-9 test-contract claim is fabricated. The Build
   Encyclopedia's `shard_count` prose is stale against the shipped
   implementation in both snapshots; no artifact may cite it as the sharding
   spec.
8. **Fleet Python, day one of any migration:** the two acceptance harnesses
   locate their binary through an environment variable with a
   `test/bin/<tool>` fallback (2 of 2), a naive `py_test(srcs=…)` over their
   223 pytest files would produce two permanently green targets that execute
   nothing, and `ocx/test`'s `pythonpath = [".", "src"]` carries a live
   `scenarios` basename collision that resolves correctly only by accident.

### Wave 4a follow-up dives (2026-09-06)

Sources: ten dives under `bazel-followups/` (230 sources, 190 primary),
commissioned by the wave-2 and wave-3a consolidations. Revisers fold these
in; the corrections below are the ones that change earlier text.

1. **`bazel analyze-profile` was deleted at 9.0.0** (`ProfileCommand.java`
   removed) while Bazel's own frozen 9.1.0 docs snapshot still lists it.
   `bazel dump --skyframe` enum values were renamed at 9.0.0
   (`working_set` → `active_directories`) and the live memory page shows the
   old names. Skymeld defaults true on 8.7.0 and 9.2.0; it is not an opt-in to
   recommend. `--execution_log_sort` applies to binary and JSON logs, never
   compact; `--restrict_to_runner` belongs to `execlog:parser`, `--sort` to
   `execlog:converter`.
2. **Exit-code flag refinement.** `--incompatible_remote_use_new_exit_code_for_lost_inputs`
   is present and default true through 8.8.0 and deleted only at 9.0.0. Wave-2
   correction 6's "deleted 2025-02" is the PR date, not the release.
3. **Coverage is Bazel-wide, not ruleset-specific.** `collect_coverage.sh`
   runs inside the test action's own spawn and timeout for every language
   (`StandaloneTestStrategy.java`), so rules_js's "post-processing consumes
   the test budget" generalises. `bazel coverage` silently auto-computes
   `--instrumentation_filter` from the named test targets' own packages, not
   from the code under test. `--experimental_split_coverage_postprocessing`
   and `--experimental_fetch_all_coverage_outputs` default FALSE on 8.8.0 and
   9.2.0, contradicting the wave-3a dive. C++ coverage emits raw `.profdata`
   unless `--experimental_generate_llvm_lcov`. rules_python's bundled coverage
   wheel covers CPython 3.9–3.14 only; outside that, empty coverage with an
   analysis-time warning as the only trace.
4. **The test exec group predates 9.** `test.<key>` scoping existed at 8.8.0;
   only the mandatory implicit `default_test_toolchain_type` requirement is
   new at 9.0.0 (`build_setting_default = True` through 9.2.0).
5. **Repository rules cannot be invoked outside extension evaluation on
   either major**, with different error text: 8.7.0 says "repository rules
   can only be used while evaluating a WORKSPACE file", 9.2.0 says "repo
   rules can only be called from within module extension impl functions". A
   repository rule's own `fail()` path IS reachable offline through a `rule()`
   harness with `analysistest.make(expect_failure = True)`; the invocation
   core is not. `environ=` on `repository_rule` and `module_extension` is
   deprecated in the 8.7.0 API doc ("migrate to getenv"). Only rules_python
   (2.3.3) ships a versioned ctx-mock library; 6 of 7 other surveyed rulesets,
   crate_universe included, ship zero offline fake-ctx tests.
   rules_bazel_integration_test 0.37.1 declares no `bazel_compatibility`.
6. **Generators.** `aspect_gazelle_js` 1.2.1 is a plain BCR dep, no CLI
   needed, but never emits `transpiler=` and relies on the repo-wide
   `default_to_tsc_transpiler` flag BZL-JS-13 flags; its pnpm-lock parser does
   not read pnpm 12's format (aspect-gazelle#461 open). `gazelle_rust` is one
   maintainer at v0.1.0. No Gazelle ecosystem wires `gazelle_test` by default;
   `aspect_gazelle(with_check = True)` produces an `sh_binary`, not a test.
   bazel-gazelle core v0.54.0 is the maturity baseline. Maturity: Go and proto
   production; Python production with a pytest wrapper; JS/TS usable with
   care; Rust experimental.
7. **Protobuf.** A bare `proto_library` fails on Bazel 9 (autoload empty).
   `--@protobuf//bazel/toolchains:prefer_prebuilt_protoc` moved to
   `//bazel/flags:…` and flipped default true at protobuf 34.0; protobuf's
   `bazel_compatibility >= 8.0.0` first appears at BCR 35.0. `ts_proto_library`
   is deprecated in rules_ts 3.10.1's own docstring. rules_go's `nogo` is
   neither aspect nor macro: it runs inside the compile action.
8. **Python typing and entry points.** rules_python has no first-party
   IDE/typing story (issue #1401, open since 2023). The CI gate is
   `rules_mypy` (bazel-contrib, v0.41.0), an aspect wired through `.bazelrc`;
   no maintained Pyright integration exists. `experimental_index_url` is
   deprecated in 2.3.3 source in favour of `pip.default.index_url`.
   `py_console_script_binary` parses the wheel's `entry_points.txt`, never
   `pyproject.toml`, and handles a single-level `module:attr` only.
   PYTHONSAFEPATH parity for `system_python` has a stalled 14-month PR
   (#2122) with maintainer support, not silence. `py_zipapp_binary`'s
   `zipper.py` hardcodes the same 1980-01-01 epoch as the fleet's hand-rolled
   `build_pyz.py`.
9. **JS.** rules_js's GitHub `/releases/latest` returns v2.9.3, an old 2.x
   patch tagged 110 minutes after v3.4.1; a naive latest-release check picks
   the wrong major. Vitest has a community ruleset (`fremtind/rules_vitest`,
   7 months stale, admitted unsolved ESM bug); `bun test` and
   `@vscode/test-electron` have no Bazel path; Playwright has a BCR-published
   `mrmeku/rules_playwright` and a same-named unrelated 0-star project. Editor
   support: plain `pnpm install` at the source root plus tsconfig `paths`
   (rules_js `docs/faq.md`); `path_mapping.md` and
   `use_execroot_entry_point.md` are unrelated to editors.
10. **Platforms.** darwin-sandbox does block network via `(deny network*)`
    on 8.7.0 and 9.2.0, with a localhost caveat (#11325) and a nested-jail
    fallback. Windows has no working sandbox: `windows-sandbox` (BuildXL)
    exists in source, off by default, needs a `BazelSandbox.exe` Bazel never
    ships. Directory-shaped runfiles entries become NTFS junctions
    unconditionally; only file-shaped ones are gated on
    `--windows_enable_symlinks`. rules_python forces `--enable_runfiles` on
    Windows since 1.9.0 via a transition. rules_rust 0.74.0's intro disclaims
    reliable Windows support. BZL-HERM-27 cites bazelbuild/bazel#11482 for a
    long-name copy fallback; that issue's root cause is a DLL basename
    collision, so the citation needs replacing while the rule stands.
11. **Cache servers.** All five surveyed servers hardcode
    `symlink_absolute_path_strategy` and `digest_functions` (bazel-remote and
    BuildBuddy OSS: ALLOWED; Buildfarm and NativeLink: DISALLOWED; Buildbarn:
    neither declared). Repository-cache GC is bazelbuild/bazel#22516, open
    since 2024-05 with zero comments; the repository cache updates mtime, not
    atime, on every hit, so an `-atime` pruning heuristic is the wrong
    primitive. The only first-hand compression numbers are cost-side, in
    issue #18997. BES and remote endpoints must share authentication per
    Bazel's own BEP doc.
12. **Adoption.** arXiv:2405.00796 verified: 31.23 percent is of the
    CI-adopting subset, not of all 383 projects. The ~11 percent abandonment
    figure is McIntosh's BazelCon 2024 talk and sits inside a 1.5 percent
    adoption rate over 35,000 projects. No source gives a target-count
    threshold for target selection; Aspect's own anchor (2M SLOC, 500
    engineers on whole-repo shared-green) argues against one existing at
    fleet scale. Neither Aspect nor EngFlow publishes adoption criteria.
    `bazel mod graph/show_repo/explain` exist identically on 8.7.0 and 9.1.0
    docs; no 9.2.0 doc snapshot exists (Bazel archives per LTS minor).

### Wave 3b consolidations (2026-09-06)

Sources: `bazel-rust.md` (BZL-RUST 30, 21 MUST), `bazel-cpp.md` (BZL-CC 30,
12 MUST), `bazel-ci-and-target-selection.md` (BZL-CI 30, 17 MUST),
`bazel-flags-and-versions.md` (BZL-FLAG 30, 22 MUST) and their 10 dives (176
sources, 137 primary). All twelve families now have a consolidation: 348
rules, 215 MUST.

1. **Correction 9 overstated Tinder.** The vendor's own material attributes
   93 percent P100 savings to bazel-diff PLUS Buildkite dynamic pipelines,
   "a 54 percent improvement over bazel-diff alone", at 300+ targets, 1.5M
   lines, 40–60 minute whole-repo builds. The map's conflict 1 quotes a
   bazel-diff README concession that does not exist. Decision 3's threshold is
   now named: about 40 minutes median whole-repo CI wall-clock as the lead
   signal, about 300 rule targets as the tripwire. No fleet repo is within an
   order of magnitude (a Bazelified creeptd-ng estimates at 30–60 targets).
2. **crate_universe gates drift on every ordinary build.** `determine_repin()`
   fails the build on digest mismatch whenever `lockfile` is set and
   `CARGO_BAZEL_REPIN` is unset, so no `--lockfile_mode`-style opt-in is
   needed; omitting `lockfile` makes it return true unconditionally and every
   build re-splices with no gate. A bzlmod non-root module cannot repin at
   all. rules_rust's own live docs (`extensions.bzl` on main, the rendered
   bzlmod page) still print `bazel sync --only=crates`, a command Bazel 9.0.0
   deleted; the replacement is `bazel fetch --repo=@<repo>`. cargo-bazel's
   lockfile write is a non-atomic `fs::write`. 7 of ~32 entries in 0.74.0 are
   crate_universe fixes landed in the six weeks before 2026-09-05. Bazel's
   `bazel-lockfile-merge` jq driver is schema-specific and must never be
   pointed at `cargo-bazel-lock.json`. rules_ocx's `.gitattributes:4` also
   sets `ocx.lock merge=union`.
3. **`cargo_build_script` parses and discards `cargo:rerun-if-changed`.** The
   fleet's `ocx_cli/build.rs` vergen fallback fires on every Bazel build
   (`CARGO_MANIFEST_DIR` is a runfiles path with no `.git`), so `ocx version
   --format json` would silently omit `commit`; the fix is
   `--workspace_status_command` plus `rustc_env_files` stamping. rules_rust's
   core rules declare the cc toolchain `mandatory = False` since #1601 (2022);
   `cargo_build_script`'s `use_cc_toolchain` still defaults true. The four
   `astral-sh/uv` git+rev crates have a native `SourceAnnotation::Git` path;
   the fork-as-submodule path dependencies have none.
4. **`layering_check` does not "silently stop" unsandboxed.** Inverted: #21592
   was a spurious FAILURE via the legacy dotd checker, fixed in 7.3.0. The
   permanent fact is direct-only module-map staging plus Clang skipping an
   unresolvable module map. The "compatibility limited to rules_go, rules_rust
   and rules_foreign_cc" sentence belongs to toolchains_llvm, not
   hermetic_cc_toolchain. `--experimental_reuse_sandbox_directories` was
   renamed `--reuse_sandbox_directories` (old spelling a silent alias);
   BZL-HERM verdict 13 needs that fix. The fleet's C++ surface compiles
   nothing: `find_ocx` declares `LANGUAGES NONE`.
5. **`--sandbox_default_allow_network=false` cannot reach a repository
   rule.** It is `execution`-tagged and governs sandboxed build and test
   actions; `repository_ctx.download/execute` run in the loading phase, never
   sandboxed (bazelbuild/bazel#7764). Map row M-H-08's premise is false and
   BZL-HERM-02 needs the clause.
6. **Version floors and cadence.** rules_js 3.4.1 and rules_lint 2.9.0
   declare `bazel_compatibility >= 7.6.0`; rules_ts 3.10.1, rules_python and
   rules_rust declare none at their tags. `rules_ocx` declares none either
   though it publishes to the BCR (owner question). LTS cadence measured: 12.0
   months 7→8, 13.4 months 8→9; the 2020 "9 months Active" and 2021 "roughly
   every nine months" posts are stale, and the live release page dropped the
   fixed-duration framing. BCR's `incompatible_flags.yml` can LAG a flag
   already flipped (`--incompatible_disable_autoloads_in_main_repo` sits under
   `last_green`/`rolling` while 9.0.0 lists it as flipped). 6 of 8 flags in
   the canonical 2022 "always-on" rc post return zero hits in the current CLI
   reference. Ground truth for autoload readiness is `AutoloadSymbols.java`
   at `release-9.0.0`, not buildifier.
7. **Fleet CI gaps the four groups agree on:** no `bazelisk --strict` or
   `--migrate` leg (the 9.x leg tests flags 9 already flipped, not the next
   major's); no `--incompatible_strict_action_env` pin across a matrix that
   spans both defaults; `--remote_timeout=60` duplicated in two files with
   no rationale, equal to the documented default; no `--lockfile_mode=error`
   leg; `.claude/rules/release.md:10-12` still says BCR submission is manual
   while `release.yml` automated it; buildifier never runs over the
   `.bazelignore`d `examples/` and `e2e/` trees; BCR-parity's 8 shards are
   documented nowhere.
8. **Map fixes.** M-I-13 half wrong (git crates have a native path); M-I-09's
   premise (a rust-analyzer size boundary exists) unsupported; M-L-16 half
   owned by BZL-ARCH-17; M-F-05 misses the double-gate shape the fleet runs.
   BZL-ARCH-29's "every CI leg" clause needs a BZL-HERM-22 carve-out where
   the generated file's shape is Bazel-major-dependent: one authoritative leg
   plus a comment naming the major is the correct shape.

### Measurement wave (2026-09-06)

Sources: six artifacts under `bazel-measurements/`, real Bazel 8.7.0, 8.8.0
and 9.2.0 binaries run in scratch workspaces on this host (WSL2, kernel
6.18.33.2, 31 GB RAM, 32 vCPU; spawn strategy measured as `linux-sandbox`
with working unprivileged user namespaces). Every conclusion that could
differ on a CI runner carries that caveat in the artifact. Where a measurement
disagrees with any earlier block, the measurement wins.

1. **Exit code 39 never surfaced as the outer exit code.** The lost-input
   condition fires exactly as BZL-CACHE verdict 5 describes (a `toplevel`
   cache hit leaves intermediates as CAS references; eviction plus a local
   action needing one triggers the error text) on 8.7.0 and 9.2.0, but with
   the default 5 eviction retries the build self-heals inside the same
   invocation (new invocation ID, local re-execution, exit 0), and with
   retries 0 it fails generically with exit 1. `--remote_download_all`
   removes the exposure; `--remote_download_minimal` bites identically to
   `toplevel`. BZL-CACHE-12's exit-code claim is contradicted; the mechanism
   stands.
2. **A cache outage is non-fatal without an executor.** With the HTTP cache
   refused, all four combinations of `--remote_local_fallback` and
   `--incompatible_remote_local_fallback_for_remote_cache` produced a WARNING
   and a full local build with exit 0 on both majors. BZL-CACHE-26's "hard
   fail on cache outage" is contradicted for the cache-only shape.
3. **The two "phantom" remote flags exist on 8.x.**
   `--experimental_remote_merkle_tree_cache` (default false) and
   `--incompatible_remote_use_new_exit_code_for_lost_inputs` (default true)
   are present on 8.7.0 and 8.8.0 and absent only on 9.2.0; bazelbuild/bazel#25334
   was closed unmerged. Wave-2 correction 6 and wave-4a correction 2 must be
   read as "deleted at 9.0.0", never "never existed".
4. **Lockfile schema moves inside a major.** `bazel mod deps` produces
   `lockFileVersion` 24 on 8.7.0 (matching the fleet's committed lock
   exactly) and 28 on 8.8.0 and 9.2.0, adding a `factsVersions` key. A
   Maintenance patch bump rewrites the lock. `--lockfile_mode=error` after a
   `bazel_dep` version bump with a stale lock exits 37 with an internal
   `IllegalStateException` ("Cannot fetch a file without a checksum in
   ENFORCE mode… please report") on both majors, not the clean mismatch
   message BZL-MOD-02 assumes.
5. **`--repo_contents_cache`** is opt-in on 8.7.0 and 8.8.0 and on by default
   at 9.2.0 (`{--repository_cache}/contents`, confirmed by a fetch creating
   it). `getenv()` does not exclude a rule from the LOCAL cache; the explicit
   `repo_metadata(reproducible = True)` return is the observed gate, and
   `repo_metadata()` works on all three versions.
   `--experimental_remote_repo_contents_cache` is a STARTUP option (default
   false) from 8.8.0, invisible to `help build --long`; one worker that
   searched only command options reported it absent. `rules_ocx`'s extension
   is dynamically pure: removing `reproducible = True` and re-running `mod
   deps` under changed `OCX_MIRRORS` and `HOME` left all five lock-entry
   fields byte-identical. `mod tidy` drifts nothing there.
   `fetch --force --configure` re-runs only `configure = True` rules.
6. **`transitive_visibility` exists on 9.2.0 only** (absent 8.7.0 and 8.8.0,
   "unexpected keyword argument"), takes a single `package_group` label, not
   a list or the `//visibility:public` sentinel. The mixed
   `values=`/`constraint_values=` ambiguous `select()` match (#14604) is
   still a fatal error on both majors, with a deprecation warning on
   `values=` at 9.2.0. Bare `py_library`, `sh_binary`, `cc_library` and
   `proto_library` all fail on 9.2.0 (`cc_library` through a dedicated
   removed-rule stub naming `buildifier --lint=fix`); pinned fixes:
   rules_python 2.3.3, rules_shell 0.8.0, rules_cc 0.2.22, protobuf
   36.1.bcr.1. `depset + depset` is a hard load-time error on both majors.
7. **Buildifier gate, measured.** `buildifier_prebuilt`'s runner is
   `find | xargs buildifier` under `set -euo pipefail`; nonzero propagates
   but xargs remaps 1–125 to 123, so exit 4 never reaches `bazel run`. It
   DOES reach the `.bazelignore`d `examples/` and `e2e/` trees (a planted
   violation there fails identically), so the "buildifier never runs over
   ignored trees" smell in blocks 2 and 6 is wrong. `positional-args` needs
   a BUILD file and a bare identifier call; it never fires on
   `unittest.make(_impl)` or inside `.bzl`. Exit is 4 in every
   mode×lint cell except (formatted, lint off). The shipped `buildifier_test`
   rule cannot validate generated Starlark: sandboxed mode false-passes
   through a `WORKSPACE=""` template bug and `no_sandbox = True` scans only
   the source tree. `+unsorted-dict-items` yields 2 real findings in
   `extensions.bzl`, not 4.
8. **Action keys and logs.** A genrule's action key does not depend on the
   workspace's absolute path: a `--disk_cache` warmed at path A served every
   action at path B on both majors, and the compact log's `digest` field was
   identical. The linux-sandbox instance slot number is not stable across
   invocations, so any action reading `$PWD` differs run to run; the
   execution log cannot see output non-determinism (identical inputs and
   args, different `sha256sum` of `bazel-out`), only a two-clean-build digest
   diff catches it. `--experimental_output_paths=strip` is opt-in per action
   via `supports-path-mapping`; 9.2.0 dropped the `content` mode.
   `--execution_log_json_file` emits concatenated pretty-printed objects with
   no separator. `--incompatible_strict_action_env` false on 8.7.0 and true
   on 9.2.0 confirmed by env capture (8.7.0 leaks `LD_LIBRARY_PATH` and the
   client `PATH`; nothing else ambient). `HOME` is unset in the action env
   regardless.
9. **Sandbox on this host.** Default linux-sandbox remounts the whole host
   root read-only (~130 mount points), exposing `/usr/lib`, `/home` and
   `/etc/hostname`. `--experimental_use_hermetic_linux_sandbox` runs on both
   majors; a bare shell needs `/usr`, `/bin`, `/lib` and `/lib64` mounted
   (usrmerge host; `/usr` alone is insufficient).
   `--sandbox_default_allow_network=false` blocks under linux-sandbox;
   `requires-network` restores while sandboxed; `no-sandbox` forces `local`,
   which has no namespace to revoke. Tags: `no-sandbox` and `local` run
   unsandboxed; `no-cache` and `local` skip the disk cache; `no-remote-cache`
   and `no-remote` keep local caching; in the log `no-cache` is
   `cacheable=false` but still `remotable=true`, `local` is both false.
10. **Operational.** The shared `/tmp` tmpfs (16 GB) filled to 100 percent
    once during the wave; one worker relocated its output root off tmpfs and
    recorded the deviation. About 1.5 GB of finished measurement scratch
    remains under the session scratchpad; a cleanup was declined and it is
    left for the owner. rules_ocx was never modified.

### Wave 4b follow-up dives (2026-09-06)

Sources: four dives under `bazel-followups/` commissioned by the wave-3b
consolidations (flags, ci, rust, cpp). Only the corrections that change
earlier text are listed; the revisers fold the rest.

1. **PROJECT.scl coexists with rc files; it does not replace them.**
   Discovery walks up a target's package path for a file literally named
   `PROJECT.scl`, innermost match wins. `--enforce_project_configs` defaults
   true on every tag from 8.7.0 (not a 9-only concern) but is a no-op unless
   the file declares configs or buildable units. A buildable unit may
   reference `--config=<name>` only when the name comes from the command line
   or an invocation policy, never from any real `.bazelrc` layer, so a
   committed `build:<name>` block cannot be delegated to. `--scl_config` and
   `--enforce_project_configs` are experimental and absent from the generated
   CLI reference at 9.2.0. No shipped ruleset consumes `PROJECT.scl`.
2. **BCR's `incompatible_flags.yml` lag is an oversight, not a policy.** It
   is a forward-warning list (`bazelisk --migrate`), has four commits ever,
   last touched 2025-07-25, and carries exactly one stale entry; the other
   9.0-flipped flags are scoped correctly. Wave-3b correction 6's "can LAG"
   stands; "structural" does not.
3. **`--incompatible_use_new_cgroup_implementation` enforces nothing by
   itself.** It extends cgroup use from memory-only to memory+CPU on both v1
   and v2, but creates no cgroup unless `--experimental_sandbox_limits` or
   `--experimental_sandbox_memory_limit_mb` is set, and on any delegation
   failure (containers, hosted runners) it degrades silently to "no limits,
   exit 0" logged at INFO. The only verification is `--sandbox_debug
   --subcommands` and a grep for the linux-sandbox `-C <dir>` argument.
4. **Runfiles and labels.** `--incompatible_compact_repo_mapping_manifest`
   (true from 9.0.0) merges rows sharing a mapping into a wildcarded entry;
   rules_shell 0.5.0 (2025-06-12) and rules_python 2.0.0 already parse it,
   so no live skew window exists. Bazel's canonical Bash runfiles library
   moved out of `bazelbuild/bazel` into rules_shell in 2025-02 (an alias
   remains); a bazel-only search reads as a removal. `Label.workspace_name`
   is deprecated behind the default-true
   `--incompatible_enable_deprecated_label_apis`; `Label.repo_name` is the
   replacement. `rules_ocx`'s launchers build already-canonical
   rlocationpaths, so the manifest encoding is correctness-irrelevant there.

Artifact set after the map: one rule `bazel-quality` with the twelve depth
files the map names (`BZL-LARK`, `BZL-MOD`, `BZL-HERM`, `BZL-CACHE`, `BZL-TEST`,
`BZL-CI`, `BZL-ARCH`, `BZL-FLAG`, `BZL-RUST`, `BZL-PY`, `BZL-JS`, `BZL-CC`), two
skills `bazel-adopt` and `bazel-diagnose`, one bundle `bazel-essentials`. No
`performance.md` (a wave, not a topic: standards split to the file that owns
each check, procedures go to `bazel-diagnose`), no `adoption.md`, no
`windows.md`. Glob: the fourteen build-system-guaranteed names in the map.

### Wave 5 convergence round (2026-09-06)

Sources: three measurement artifacts under `bazel-measurements/`
(`bazel9-gate-tags-visibility-and-flag-probes`,
`hermeticity-second-half-mounts-tool-args-and-globs`,
`arch-live-graph-generated-semantics-and-lockfile-error`) and one research
dive under `bazel-followups/`
(`bcr-playbook-flag-archaeology-rewind-and-js-gaps`). Output roots were on
real disk under `~/.cache/bazel-measure-scratch/`. Every HERM, ARCH and
TEST row the round touched was confirmed on 8.7.0 and 9.2.0; the items below
change earlier text.

1. **`--experimental_remote_cache_chunking_function` never existed.** Zero
   hits on 8.7.0, 8.8.0 and 9.2.0; the cited PR #30585 is closed unmerged.
   The real flag is `--experimental_remote_cache_chunking`, a plain boolean
   (default false, FastCDC-2020, no selector), present unchanged on all three
   tags — it predates 8.8.0. Corrects BZL-CACHE-28 and the measurement wave's
   correction 7 where it names the selector.
2. **`--rewind_lost_inputs` is present at 8.7.0**, default false, hidden
   (`documentationCategory=UNDOCUMENTED`) until 9.2.0 where it becomes
   REMOTE-documented; empirically functional on the 8.7.0 binary. The
   ceiling is a hard-coded `MAX_REPEATED_LOST_INPUTS = 20` in
   `ActionRewindStrategy.java` at every tag through 9.2.0 (the 21st loss
   fails, hence the `#21` text); the tunable
   `--experimental_max_repeated_lost_inputs` exists only on main after 9.2.0.
   With eviction retries at 0, neither rewind off nor rewind on recovers a
   downstream local action whose never-materialised upstream intermediate was
   evicted under default toplevel BwoB: both exit 1. Corrects BZL-CACHE-12's
   "absent from 8.7.0"; the earlier NEW-CACHE-36 proposal demotes.
3. **Two commits, not one PR, removed the remote flags.** `91b1e8e2`
   (2025-02-20, closing PR #25334 unmerged) deleted
   `--incompatible_remote_use_new_exit_code_for_lost_inputs`; `30ca50950f`
   (2025-10-14, closing PR #25650) deleted
   `--experimental_remote_merkle_tree_cache*` as a side effect of a
   Merkle-tree construction rewrite. Neither touches eviction retries. The
   9.0.0 release notes' removed-flags appendix names the exit-code flag and
   omits the Merkle-tree one. Corrects the measurement wave's attribution.
4. **The `Expect: 100-continue` / explicit `Content-Length` workaround was
   fixture-side.** Bazel's `HttpCacheClient` Javadoc states uploads never use
   `Expect: 100-continue` (unchanged 8.7.0 to 9.2.0) and sets no such header;
   `buchgr/bazel-remote`'s PUT path relies on Go's `net/http` to supply
   `Content-Length: 0`, which the Python `http.server` fixture did not.
   Retract NEW-CACHE-37.
5. **buildifier_prebuilt fixed the false-pass at 8.5.1.3** (`[[ -n
   "$WORKSPACE" ]]` replaces `${WORKSPACE+x}`); **8.5.1.4** replaces the
   `find | xargs` pipeline with `find -exec {} +`, which also retires the
   exit-123 remap. The gate at the fleet's 8.2.0.2 pin behaves identically
   under Bzlmod-only 9.2.0: loads, exit 123, reaches `.bazelignore`d trees.
   BZL-LARK-01 corrects its gate text and new BZL-LARK-31 carries the pin
   floor (BZL-LARK-24 is the `analysistest` vacuous-pass rule and is
   untouched); LARK-09/25/26 confirm.
6. **The loading phase catches what buildifier cannot.** `bazel query //...`
   (exit 7) and `bazel build --nobuild //...` (exit 1) catch all four
   semantic-defect fixtures on both majors: an undefined name fails static
   resolution even in dead code ("compilation of module"); a bad `load()`
   target or a bad builtin argument fails only when the statement executes
   ("initialization of module"). Buildifier is blind to all three
   `.bzl`-content defects. The gate needs a loading-phase step, not only
   buildifier — promotes BZL-LARK-30 and the LARK-25/26 gate text.
7. **The `--lockfile_mode=error` crash has a shape.** Exit 37 with the
   `IllegalStateException` in `YankedVersionsFunction` fires only when an
   EXISTING dependency's locked version changes (bump or downgrade). A lock
   stale because `MODULE.bazel` gained a brand-new `bazel_dep` produces the
   clean documented "Missing checksum for registry file … run `bazel mod deps
   --lockfile_mode=update`" message, also exit 37. `bazel mod deps` alone
   reproduces the crash; an explicit `--registry` changes nothing. Refines
   BZL-MOD-02.
8. **BCR visibility playbook.** `docs/bcr-policies.md`, the repository's
   automated reviewer and 15 sampled merged PRs agree: default-private
   package, exactly one public target per entry point. Verification
   `bazel query 'attr(visibility, "//visibility:public", //...)'` works on
   both majors under `query` and `cquery`; `visible()` computes a stricter
   universe-wide predicate and is unsupported under `cquery`; only `cquery`
   enforces visibility on edges. New rule (BZL-MOD-34 or next free).
9. **aspect_gazelle_js decides pnpm membership from `pnpm-lock.yaml`
   `importers:` keys only**, never from `pnpm-workspace.yaml` globs. An
   npm-only package directory gets no `npm_link_all_packages` and no public
   package target; every third-party import resolves to
   `Resolution_NotFound`, a hard named failure under the default
   `js_validate_import_statements=error`. `creeptd-ng`'s mixed shape requires
   full pnpm conversion; no other lockfile ingestion path exists. New rule
   (BZL-JS-33 or next free).
10. **`@vscode/test-electron` under Bazel is solved, with costs.**
    `angular/angular` runs `vscode-ng-language-service`'s suite as a `js_test`
    tagged `e2e`, `no-remote-exec`, `requires-network`: VS Code downloaded
    live per clean run, host-provisioned Xvfb through an npm wrapper, and an
    EROFS workaround for the user-data socket via a host-tmpdir `mkdtemp`.
    Corrects BZL-JS-29's "structural non-starter".
11. **The two unmeasured cache tags, measured.** `no-remote-cache-upload`
    suppresses only the ActionCache PUT; the CAS content PUT still fires.
    `external` is test-only: with `--cache_test_results=yes` the tagged test
    re-runs every time while its untagged sibling shows `(cached)`; it has
    zero effect on a plain build action. Both are indistinguishable from
    default against `--disk_cache` alone. BZL-TEST-08 is now measured.
12. **`package(transitive_visibility = …)` ships at exactly 9.0.0** (9.0.0
    and 9.1.0 accept the `package_group`-label syntax). BZL-ARCH-34's
    "Applies to" reads 9.0.0+; its open question closes.
13. **Mount-pair source changes bust nothing.** Changing
    `--sandbox_add_mount_pair`'s source directory (same in-sandbox path) is a
    null build in-session (no re-check at all) and a stale disk-cache hit
    across `--expunge`; a control run proves the sandbox reads the new source
    when forced to execute. `constant-glob` and
    `--incompatible_disallow_empty_glob` are disjoint: pattern shape versus
    zero-match count; only the flag catches the load-bearing wildcard-plus-
    empty case. Strengthens BZL-HERM-26 and -19.
14. **Action keys.** `$$(pwd)` inside a genrule `cmd` is recorded literally
    and is key-stable across checkouts; `--action_env=WS=$PWD` and
    `--define=WS_PATH=$PWD` destabilise the key only for an action that
    consumes the value. The rules_python 2.3.3 hermetic toolchain needs the
    same four mounts (`/usr`, `/bin`, `/lib`, `/lib64`) and nothing more.
    Confirms BZL-HERM-31/-10/-24/-26.
15. **Live graph arithmetic.** A legacy macro adds two query-visible labels
    per call; an aspect adds zero under any invocation; a naive
    `native.sh_test` breaks on 9.2.0 through autoload removal until an
    explicit rules_shell `load()` is added. Confirms BZL-ARCH-30. The
    `requires-network` / `no-sandbox` rows hold on 9.2.0 (BZL-HERM-02).

Not settled by this round (ship as documented gaps): the runtime effect of
`--experimental_remote_cache_chunking` against a server advertising
SplitBlob/SpliceBlob; rewind together with the default retry budget of 5; the
commit introducing `--experimental_max_repeated_lost_inputs`; darwin/Windows
tag and sandbox behaviour; a full changelog audit of buildifier_prebuilt
8.2.0.2 to 8.5.1.4; TLS/DNS and non-glibc shared libraries under the
hermetic sandbox; `--sandbox_add_mount_pair` on 8.8.0/9.0.0/9.1.0; whether a
`cquery` visibility run scales on a BCR-sized module.

**Convergence verdict.** Four workers yielded two new rules (MOD, JS), two
promotions (LARK) and four corrections (CACHE), all on already-revised files;
every HERM, ARCH and TEST row was confirmed. Yield is falling and no new
failure mode surfaced outside the CACHE flag archaeology. The program folds
this round into the six touched files with a light, row-scoped revision and
then declares convergence; the not-settled list above ships as documented
gaps in the depth files.

### Artifact set as shipped (2026-09-06)

Authored after convergence: `rules/bazel-quality.md` (163 lines; the gate,
19 non-negotiables, `BZL-CORE-01..03`, routing by task) with twelve depth
files under `rules/bazel-quality/` carrying 328 of the corpus's 412 rule
IDs (246 MUST; BZL-LARK-13 retired in review as a duplicate of BZL-ARCH-08; every drop and demotion is recorded in the authoring
receipts, `scratchpad/author-results.json`, and the IDs are never reused),
`skills/bazel-adopt/` (5 references) and `skills/bazel-diagnose/` (6
references), `bundles/bazel-essentials.toml`, four docs companions,
`publish.toml` and `taskfile.yml` wiring. Glob list: the fifteen names in
the map plus `**/.bazelrc.*`. Drafters reported one label error in this
frame (block 9 item 5 named BZL-LARK-24; corrected in place to
BZL-LARK-01/-31) and no live contradiction between the revised
consolidations and blocks 7 to 9. Fourteen corpus IDs the depth files did
not ship are cited nowhere in the artifacts; their substance is stated
inline in the skills where a procedure needed it.

