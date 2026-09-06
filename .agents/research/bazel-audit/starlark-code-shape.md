---
title: Starlark code shape — rules_ocx
agent: bazel-audit-starlark-code-shape
model: claude-sonnet-5
scope: /home/mherwig/dev/rules_ocx (root module, examples/*, e2e/bzlmod) — read-only
method: >
  wc -l / wc -c for line and byte counts; grep -c / grep -n / grep -o for symbol
  census (every count's exact command is inlined next to its result below);
  a small python regex + paren-balance script where grep-per-line cannot see a
  multi-line attr(...) or def(...) body (used for attr. doc= coverage and for
  the "no test references this function" cross-reference). File discovery via
  `find . -path ./.git -prune -o -path ./.agents/worktrees -prune -o \( -name
  '*.bzl' -o -name 'BUILD.bazel' -o -name 'MODULE.bazel' \) -print`, 30 files,
  saved once and reused for every grep so every count is diffable against the
  same file set. No bazel/buildifier invocation was made (would require a
  network fetch of uncached external repos — see "Lint posture"). All commands
  below are plain POSIX grep/wc/find, runnable from the rules_ocx repo root.
date_researched: 2026-09-05
---

# Starlark code shape — rules_ocx

Numbers-first audit of `/home/mherwig/dev/rules_ocx`'s Starlark/BUILD surface,
grounding a later bazel-quality authoring pass. Every claim below carries a
`file:line` citation and the command that produced it. `.bazelrc.user`'s cache
write credential is never quoted; its presence is described in prose only.

## Table of contents

- [Headline numbers](#headline-numbers)
- [1. Lines and files](#1-lines-and-files)
- [2. Symbol census](#2-symbol-census)
- [3. Largest files — cohesion](#3-largest-files--cohesion)
- [4. Test placement and kind](#4-test-placement-and-kind)
- [5. Lint posture](#5-lint-posture)
- [6. Stardoc coverage](#6-stardoc-coverage)
- [7. Coupling](#7-coupling)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)

## Headline numbers

| Number | Value | Command |
|---|---|---|
| Total `.bzl`+`BUILD.bazel`+`MODULE.bazel` lines, whole repo | **5,855** | `find . -path ./.git -prune -o -path ./.agents/worktrees -prune -o \( -name '*.bzl' -o -name 'BUILD.bazel' -o -name 'MODULE.bazel' \) -print \| xargs wc -l \| tail -1` |
| Root module only (excl. examples/e2e) | 5,534 | same file list minus `examples/*`, `e2e/*` |
| Real (non-example, non-test) `rule()` build-rule declarations | **0** | `grep -n ' = rule(' <files>` — the only 3 hits are `examples/cross_platform/transition.bzl:18` and two test fixtures in `ocx/tests/launcher_test.bzl:1148,1292` |
| `repository_rule()` declarations | 4 | `grep -n 'repository_rule(' <files>` |
| `module_extension()` declarations | 1 | `grep -n 'module_extension(' <files>` |
| `tag_class()` declarations | 4 | `grep -n 'tag_class(' <files>` |
| Production `attr.*()` declarations with `doc=` | 51/51 (100%) | paren-balance script, see §2 — all 5 undocumented attrs are in test/example scaffolding |
| Discrete `bazel test` targets | **~84** (76 analysistest/unittest + 2 dogfood sh_test + 2 diff_test + 4 example sh_test) | see §4 |
| Functions in `ocx/private` with zero name-match in `ocx/tests/*.bzl` | 21 of 58 (mostly indirectly covered — see §4) | paren-balance/grep script, see §4 |
| `native.` uses anywhere | **0** | `grep -n 'native\.' <files>` |
| Real `select()` calls in this repo's own build graph | **1** (`docs/BUILD.bazel:19`) | see §2 methodology note on generated-BUILD-as-string-templates |
| `bazel_dep()` count | 5 (2 runtime: `bazel_skylib`, `platforms`; 3 `dev_dependency`: `rules_shell`, `stardoc`, `buildifier_prebuilt`) | `grep -c 'bazel_dep(' MODULE.bazel` |
| `WORKSPACE`/`WORKSPACE.bazel` files | 0 | `find . -iname 'WORKSPACE*' -not -path './.git/*'` — pure Bzlmod, confirms frame |
| buildifier run | **not run** — no cached binary, would fetch `@buildifier_prebuilt` over network | see §5 |

## 1. Lines and files

```
wc -l .bazelrc BUILD.bazel MODULE.bazel ocx/BUILD.bazel ocx/defs.bzl ocx/extensions.bzl \
      ocx/private/*.bzl ocx/private/BUILD.bazel ocx/tests/*.bzl ocx/tests/BUILD.bazel \
      dist/BUILD.bazel docs/BUILD.bazel
```

| Group | Files | Lines | Command scope |
|---|---|---|---|
| **Public** (`ocx/defs.bzl`, `ocx/extensions.bzl`, `ocx/BUILD.bazel`) | 3 | 388 | `wc -l ocx/defs.bzl ocx/extensions.bzl ocx/BUILD.bazel \| tail -1` |
| **Private** (`ocx/private/*.bzl` + its `BUILD.bazel`) | 8 | 2,711 | `wc -l ocx/private/*.bzl ocx/private/BUILD.bazel \| tail -1` |
| **Tests** (`ocx/tests/*.bzl` + its `BUILD.bazel`) | 6 | 2,289 | `wc -l ocx/tests/*.bzl ocx/tests/BUILD.bazel \| tail -1` |
| **Dist** (`dist/BUILD.bazel`) | 1 | 4 | `wc -l dist/BUILD.bazel` |
| **Docs** (`docs/BUILD.bazel`) | 1 | 78 | `wc -l docs/BUILD.bazel` |
| **Root** (`MODULE.bazel`, `BUILD.bazel`, `.bazelrc`) | 3 | 64 | `wc -l MODULE.bazel BUILD.bazel .bazelrc \| tail -1` |
| Root module total | 22 | **5,534** | sum of above, matches `find`-based total minus examples/e2e |

Per-file breakdown, root module, sorted ascending (`wc -l <all root-module files> | sort -n`):

| Lines | File |
|---|---|
| 4 | `dist/BUILD.bazel` |
| 12 | `ocx/private/BUILD.bazel` |
| 14 | `.bazelrc` |
| 18 | `BUILD.bazel` |
| 18 | `ocx/BUILD.bazel` |
| 23 | `ocx/defs.bzl` |
| 32 | `MODULE.bazel` |
| 43 | `ocx/tests/BUILD.bazel` |
| 52 | `ocx/private/versions.bzl` |
| 69 | `ocx/tests/platforms_test.bzl` |
| 78 | `docs/BUILD.bazel` |
| 96 | `ocx/private/manifest.bzl` |
| 96 | `ocx/tests/package_test.bzl` |
| 97 | `ocx/private/download.bzl` |
| 117 | `ocx/private/platforms.bzl` |
| 164 | `ocx/tests/manifest_test.bzl` |
| 300 | `ocx/tests/policy_test.bzl` |
| 305 | `ocx/private/project.bzl` |
| 347 | `ocx/extensions.bzl` |
| 430 | `ocx/private/package.bzl` |
| 1,602 | `ocx/private/repo_utils.bzl` |
| 1,617 | `ocx/tests/launcher_test.bzl` |

**Examples and e2e** (each a self-contained Bzlmod root, excluded from the parent's own graph by `.bazelignore:1-2`):

| Dir | `.bzl`+`BUILD.bazel`+`MODULE.bazel` lines | `.bazelrc` | `MODULE.bazel.lock` (bytes) | Command |
|---|---|---|---|---|
| `examples/cross_platform` | 104 (25 `transition.bzl` + 50 `BUILD.bazel` + 29 `MODULE.bazel`) | 7 | 21,530 | `wc -l examples/cross_platform/{transition.bzl,BUILD.bazel,MODULE.bazel}` |
| `examples/package` | 95 (32 + 63) | 7 | 21,530 | `wc -l examples/package/{BUILD.bazel,MODULE.bazel}` |
| `examples/project` | 91 (48 + 43) | 7 | 21,530 | `wc -l examples/project/{BUILD.bazel,MODULE.bazel}` |
| `e2e/bzlmod` | 45 (11 + 34) | 6 | 25,763 | `wc -l e2e/bzlmod/{BUILD.bazel,MODULE.bazel}` |

All three example lockfiles are the same size (21,530 B) — same dependency shape (`bazel_skylib` + the `ocx` extension + one `@jq` package). Byte sizes: `wc -c <dir>/MODULE.bazel.lock`.

**Other tracked files, byte size only** (`wc -c .bazelignore .bazelversion MODULE.bazel.lock`):

| File | Bytes |
|---|---|
| `.bazelignore` | 31 |
| `.bazelversion` (root; 4 identical copies exist under examples/e2e, each also 6 B, all pinning `8.7.0`) | 6 |
| `MODULE.bazel.lock` | 166,136 (162.2 KiB) — matches the frame's "166 KB" |

Root module total confirmed two ways: the grouped sum above (5,534) and `find`'s flat 22-file `wc -l` tail (`Σ 5534`) agree exactly.

## 2. Symbol census

**Methodology caveat, read first**: `ocx_download`, `ocx_project_repo`, `ocx_package_repo` and `ocx_package_hub` each *author a BUILD.bazel file for the repo they create*, as a Starlark string (`_BUILD = """..."""` or `lines = [...]` joined). A raw `grep` for `glob(`, `select(`, `exports_files(`, `filegroup(`, `package(` inside `ocx/private/*.bzl` hits these string templates as often as real code. Every count below has been hand-verified against its source line to say which bucket it's in; the table separates "real" (evaluated in this repo's own analysis graph) from "template" (written into a *consumer's* generated repo, invisible to this repo's own `bazel build`/buildifier).

| Symbol | Count | Real vs template | Command / citation |
|---|---|---|---|
| `rule(` | 3 | all example/test scaffolding | `examples/cross_platform/transition.bzl:18`, `ocx/tests/launcher_test.bzl:1148,1292` — zero in production |
| `repository_rule(` | 4 | all real | `ocx/private/project.bzl:232`, `ocx/private/download.bzl:61`, `ocx/private/package.bzl:299,408` |
| `module_extension(` | 1 | real | `ocx/extensions.bzl:333` |
| `tag_class(` | 4 | real | `ocx/extensions.bzl:19,38,112,122` (`_download`, `_project`, `_policy`, `_package`) |
| `aspect(` | 0 | — | `grep -n 'aspect(' <files>` — no hits |
| `transition(` | 1 | real (example only) | `examples/cross_platform/transition.bzl:6` |
| symbolic `macro(` | 0 | — | `grep -n 'macro(' <files>` — no hits; the ruleset predates or opts out of symbolic macros |
| plain `def ` (top-level) | 115 total; **56 production** (`ocx/private/*.bzl` + `ocx/defs.bzl` + `ocx/extensions.bzl`) | — | `grep -c '^def ' <files>`, summed — see per-file table in §3 |
| `provider(` | 0 | — | `grep -n 'provider(' <files>` — no hits; no custom providers anywhere |
| `attr.*(` declarations | 56 | real | paren-balance scan (grep-per-line undercounts/overcounts across multi-line calls) |
| … with `doc=` | 51 (91%); **100% of the 51 in production files** | — | same script; the 5 undocumented are `examples/cross_platform/transition.bzl:21,22` and `ocx/tests/launcher_test.bzl:1150,1292,1302` |
| `fail(` | 47 | real (spread across private+extensions+one test file) | `grep -o 'fail(' <files> \| wc -l`; per-file: `repo_utils.bzl` 16, `extensions.bzl` 8, `package.bzl` 8, `platforms.bzl` 4, `project.bzl` 3, `download.bzl` 2, `manifest.bzl` 2, `launcher_test.bzl` 4 |
| `print(` | 1 | real, deliberate | `ocx/private/package.bzl:200`, guarded by `# buildifier: disable=print` at line 199 — a user-facing hint to copy a resolved digest, not debug noise |
| `ctx.getenv(`/`repository_ctx.getenv(` | 9 call sites | real | `grep -o 'ctx\.getenv(' ocx/private/download.bzl ocx/private/repo_utils.bzl \| wc -l` → `download.bzl:36,44`; `repo_utils.bzl:630,632`(×2 same line),`659,724,728` |
| `ctx.watch(`/`ctx.watch_tree(` | 4 call sites (3 `watch`, 1 `watch_tree`) | real | filtered for comment/docstring lines: `ocx/private/package.bzl:168` (`watch_tree`); `ocx/private/repo_utils.bzl:708,722,735` (`watch`). Raw grep gives 11 — 7 are prose mentions in comments/docstrings |
| `ctx.execute(` | 3 call sites | real | `ocx/private/repo_utils.bzl:780,796,919` — all inside `run_ocx`/`list_executables`, with an explicit CWE-426 rationale comment at `repo_utils.bzl:791-795` for the one `/bin/sh -c` retry-sleep call |
| `ctx.download(`/`ctx.download_and_extract(` | 2 call sites, **both carry `sha256=`** | real | `ocx/private/download.bzl:38` (`sha256 = manifest_sha256(dist_url)`), `:45` (`sha256 = row["sha256"]`). Note: `ocx.download(...)` elsewhere in the tree is the **tag-class DSL call** (`extensions.bzl`, user-facing MODULE.bazel syntax), a name collision with the Starlark API `ctx.download()` — do not conflate when grepping |
| `ctx.os.*` | 3 call sites | real | `ocx/private/project.bzl:131`, `download.bzl:33`, `package.bzl:156` — all `host_info(ctx.os.name, ctx.os.arch)` |
| `native.*` | 0 | — | `grep -n 'native\.' <files>` — zero anywhere, including BUILD.bazel files (which call native rules unprefixed, correctly) |
| `load(` statements | 47 | real | `grep -n '^load(' <files>`; full adjacency in §7 |
| `glob(` | 3 raw hits, **1 real** | 2 template | Real: `ocx/private/BUILD.bazel:10` (`glob(["*.bzl"])`). Template: `download.bzl:20` (inside `_BUILD` string, lines 17-26) and `package.bzl:293` (inside a `lines`-list BUILD template, `_ocx_package_repo_impl`) |
| `**` in any glob | 1, **and it is the template one** | template only | `ocx/private/package.bzl:293`: `glob(["content/**"], allow_empty = True)` is text written into a *consumer's* generated `@pkg` repo's BUILD.bazel — never evaluated by this repo's own Bazel invocation |
| `select(` | 8 raw hits, **1 real** | 7 template/prose | Real: `docs/BUILD.bazel:19` (`_NOT_WINDOWS`, Windows exclusion for the stardoc graph). Template: `package.bzl:397` (`"    actual = select({"`, string literal). The rest are docstring/comment prose mentioning `select()` |
| `visibility` (any form) | 12 raw hits | 9 real declarations + 3 template | `package(default_visibility=public)`: real at `ocx/BUILD.bazel:6`, `ocx/private/BUILD.bazel:6` (2); template at `download.bzl:18`, `package.bzl:368`, `repo_utils.bzl:1565` (3). `.bzl`-file `visibility([...])` load-gate: 7 real, one per private module — see §7 |
| `exports_files` | 5 raw hits, **1 real** | 4 template | Real: `dist/BUILD.bazel:4`. Template: `download.bzl:20`, `project.bzl:126,229`, `package.bzl:289` (all string literals feeding a generated repo's `BUILD.bazel`) |
| `genrule` | 2 | real (examples only) | `examples/project/BUILD.bazel:7`, `examples/package/BUILD.bazel:6` — zero in production |
| `sh_test(` | 6 | real | `ocx/tests/BUILD.bazel:23,31`; `examples/project/BUILD.bazel:19,39`; `examples/package/BUILD.bazel:14`; `examples/cross_platform/BUILD.bazel:36` |
| `sh_binary(` | 1 | real | `docs/BUILD.bazel:65` (`update`, regenerates stardoc markdown) |
| `diff_test(` | 1 call site → 2 targets | real | `docs/BUILD.bazel:39`, list-comprehension over 2-entry `_DOCS` dict |
| `analysistest`/`unittest` uses | 5 files, 76 test-impl functions total | real | `grep -c 'analysistest\.\|unittest\.' ocx/tests/*.bzl`: `package_test.bzl` 8, `platforms_test.bzl` 8, `manifest_test.bzl` 17, `policy_test.bzl` 23, `launcher_test.bzl` 86 (lines mentioning either API, not test count — see §4 for exact test-target counts) |
| `stardoc(` | 1 call site → 2 targets | real | `docs/BUILD.bazel:25`, over the same 2-entry `_DOCS` dict |
| `buildifier(` | 2 | real | `BUILD.bazel:6` (`buildifier.fix`), `:13` (`buildifier.check`) |
| `bzl_library(` | 3 | real | `ocx/BUILD.bazel:8,14` (`defs`, `extensions`); `ocx/private/BUILD.bazel:8` (`private`, `srcs = glob(["*.bzl"])`) |
| `filegroup(` (native) | 2 raw hits, **1 real** | 1 template | Real: `e2e/bzlmod/BUILD.bazel:8` (`jq_launcher`, build-only smoke test). Template: `download.bzl:22` inside `_BUILD` string. (`platform_filegroup(` — a custom rule, not native `filegroup` — is used for real at `examples/cross_platform/BUILD.bazel:24,30`) |

## 3. Largest files — cohesion

Top 5 `.bzl` files by line count (`wc -l` from §1, all `.bzl` files repo-wide):

1. **`ocx/tests/launcher_test.bzl` — 1,617 lines.** Single purpose: exhaustive `analysistest`/`unittest` coverage of `repo_utils.bzl`'s pure helpers. Functions: 3 hand-rolled `ctx` fakes (`_fs_ctx` L40-84, `_replay_ctx` L85-112, `_env_ctx` L113-197) feeding 34 `_*_test_impl` functions (L198-1553, one per behavior: env resolution, launcher rendering for sh/bat/lazy variants, bin discovery/scanning, quoting, sigstore path, guard cases, …) plus `launcher_test_suite` (L1557-1617) that also *generates* 34 data-driven `analysistest` targets from two dicts (`_MALFORMED_CLOSURE_REPORTS` 12 entries + `_MALFORMED_CLOSURE_CONTAINERS` 4 entries = 16 guard cases, plus `_GUARD_CASES` 18 entries = 18 more). Despite its size this file does one thing — it is comprehensive, not sprawling; the size is the cost of thoroughly testing a 1,602-line utility module through fakes rather than live `ctx`.
2. **`ocx/private/repo_utils.bzl` — 1,602 lines.** NOT single-purpose — this is the one file in the top 5 that fails a cohesion test. It bundles at least 7 distinct concerns behind one `visibility(["//ocx","//ocx/tests"])` gate: (a) the `OCX_ENV_CLASSES` table and `_env`/`_rows` (L12-119); (b) `SYSEXIT_HINTS` and retry constants (L121-221); (c) name/value validation — `valid_bin_name`, `check_bin_names`, `valid_env_key`, `sh_quote`, `bat_value`, `truthy`, `is_absolute_path` (L223-339); (d) ambient-config-path resolution — `ambient_config_paths` (L368-424); (e) policy resolution — `resolve_policy`, `policy_kwargs`, `policy_exports`, `sigstore_trust_root_path` (L499-598); (f) process orchestration — `make_ocx_env`, `ocx_bin`, `run_ocx`, `decode_json`, `closure_packages`, bin discovery (`list_executables` … `discover_bins`, `scan_bins`) (L604-1125); (g) launcher/BUILD-file rendering — `rlocation_path`, `stage_lazy_config`, `render_lazy_launcher`, `append_unique`, `fold_lists`, `render_launcher`, `render_env_bzl`, `render_launchers_build`, `write_launchers` (L1125-1602). Each concern is individually well-tested (see §4) and the file has no circular structure, but "everything three repository rules share" is not a cohesive unit — it is a shared-utils dumping ground. See Smells §1.
3. **`ocx/private/package.bzl` — 430 lines.** Single purpose: the two package-tier repository rules. `install_args` (L33), `_lazy_package` (L51), `pinned_ref` (L103), `resolve_platforms` (L121), `_ocx_package_repo_impl`/`ocx_package_repo` (L155-365), `_ocx_package_hub_impl`/`ocx_package_hub` (L367-430, the multi-platform `select()`-hub). Cohesive: everything here is either the single-package repo or the hub that aliases across per-platform single-package repos.
4. **`ocx/extensions.bzl` — 347 lines.** Single purpose: the module-extension DSL. 4 `tag_class()` declarations (L19,38,112,122), one dispatcher `_ocx_impl` (L213-331) that pattern-matches tag instances to the 4 repository rules from `repo_utils.bzl`/`download.bzl`/`project.bzl`/`package.bzl`, and the `module_extension()` registration (L333-347). Cohesive — it is purely the tag-to-repository-rule wiring layer, with host detection deliberately kept out (see Patterns §2).
5. **`ocx/private/project.bzl` — 305 lines.** Single purpose: the project-tier repository rule. `pull_args` (L33), `lazy_project_command` (L49), `_lazy_project` (L68), `_ocx_project_repo_impl`/`ocx_project_repo` (L130-305). Cohesive — one rule, one workflow (`lock --check` → `pull` → `env`).

**Verdict: 4 of the top 5 largest files are single-purpose; only `repo_utils.bzl` is a grab-bag**, and it is exactly the file every other private module (`project.bzl`, `package.bzl`) and the public `extensions.bzl` depends on — see §7.

## 4. Test placement and kind

| Kind | Location | Network | Count | Windows |
|---|---|---|---|---|
| Unit (`analysistest`/`unittest`, fake `ctx`, zero network ever) | `ocx/tests/{package,platforms,manifest,policy,launcher}_test.bzl` | none | 2+2+5+7+60 = **76** targets (see per-file suite bodies below) | runs everywhere; no `target_compatible_with` on any of them |
| Dogfood smoke (`sh_test`, real binaries, needs `@ocx_tool`/`@dev_tools` fetched) | `ocx/tests/BUILD.bazel:23-42` | **yes, on first fetch** — see contradiction below | 2 (`ocx_tool_test`, `dev_tools_test`) | runs everywhere |
| Docs freshness (`diff_test`, stardoc output vs committed `.md`) | `docs/BUILD.bazel:38-47` | none | 2 (`defs_docs_test`, `extensions_docs_test`) | **excluded** — `target_compatible_with = _NOT_WINDOWS` (`docs/BUILD.bazel:19-29,44`), because "stardoc's protobuf dependency does not compile under MSVC" (`docs/BUILD.bazel:17-18`) |
| Integration (`examples/*`, live `ocx.sh` registry) | `examples/{project,package,cross_platform}/BUILD.bazel` | yes, always (dogfooding the live registry, per `ci.yml:89`) | 4 sh_test (`project`: `tools_test` + `cross_env_test`; `package`: `jq_test`; `cross_platform`: `abi_test`) | 2 of the 4 (`cross_env_test` `examples/project/BUILD.bazel:47`, `abi_test` `examples/cross_platform/BUILD.bazel:49`) are Linux-only via `target_compatible_with = ["@platforms//os:linux"]` (the `file -b` ABI assertion needs a Linux runner — comment on each) |
| BCR-parity smoke (build-only, deliberately no test) | `e2e/bzlmod/BUILD.bazel:8-11` | yes (live registry) | 0 tests, 1 build target (`jq_launcher`) | runs everywhere; **deliberately has no `sh_test`** — `e2e/bzlmod/BUILD.bazel:5-7`: *"ponytail: build-only. Executing jq would pull from the ocx.sh registry across the whole BCR platform matrix (flaky); add an sh_test that runs the launcher if BCR CI proves reliable against the live registry."* — the repo already writes shortcut-with-upgrade-path comments in exactly the style this audit does |

Suite-by-suite test-target counts (`grep -n -A15 '_suite(name' ocx/tests/*.bzl`, reading each `unittest.suite(...)` call):

| File | Fixed `unittest.suite()` entries | Data-driven extra | Total |
|---|---|---|---|
| `package_test.bzl:86-96` | 2 (`pinned_ref_test`, `resolve_platforms_test`) | 0 | 2 |
| `platforms_test.bzl:59-69` | 2 (`host_info_test`, `mappings_test`) | 0 | 2 |
| `manifest_test.bzl:151-164` | 5 | 0 | 5 |
| `policy_test.bzl:285-300` | 7 | 0 | 7 |
| `launcher_test.bzl:1557-1617` | 26 | 34 (`*guards`, built from a loop over `_MALFORMED_CLOSURE_REPORTS`+`_MALFORMED_CLOSURE_CONTAINERS` (16) and `_GUARD_CASES` (18), `launcher_test.bzl:1058,1135,1184`) | 60 |
| **Total** | | | **76** |

**Which `ocx/private` functions have no test referencing them by name** (`grep`/paren-balance cross-reference of every top-level `def NAME(` against the full text of `ocx/tests/*.bzl`):

21 of 58 top-level private functions have zero name-match: `_env`, `_rows`, `valid_bin_name`, `valid_env_key`, `sh_quote`, `ocx_bin`, `_as_dict`, `scan_bins`, `rlocation_path`, `fold_lists`, `write_launchers`, `os_arch`, `_lazy_project`, `_ocx_project_repo_impl`, `_ocx_download_impl`, `_lazy_package`, `_ocx_package_hub_impl` (and `_ocx_package_repo_impl` at 1 reference — a comment only, `policy_test.bzl:189`).

Splitting that list by why it's untested:

- **Indirectly covered** (the function's *output* is exercised through a caller that *is* tested): `valid_bin_name` → via `check_bin_names` (`launcher_test.bzl:485` `_bin_name_guard_test_impl`); `sh_quote` → via `render_launcher`'s quoting tests (`launcher_test.bzl:609,639`); `_as_dict` → via `decode_json` tests; `scan_bins`/`rlocation_path`/`fold_lists`/`write_launchers` → via `discover_bins`/`render_launcher`/the launcher-rendering tests that consume their output. `_env`/`_rows` build the `OCX_ENV_CLASSES` constant, which `policy_test.bzl:34` (`_env_classes_table_test_impl`) tests directly by shape.
- **Genuinely uncovered by any unit test** — only exercised via live-registry integration tests or the dogfood `sh_test`: `ocx_bin` (resolves the pinned `ocx` binary via `ctx.path(Label(...))`, needs real `ctx`), `valid_env_key` (no direct assertion found), `os_arch` (thin wrapper, real usage covered via `ocx_platform_constraints_test` but not itself), and — the important one — **all 4 repository-rule `_impl` functions**: `_ocx_download_impl`, `_ocx_project_repo_impl`, `_ocx_package_repo_impl`, `_ocx_package_hub_impl`. None is wrapped in `analysistest.make()` against the real rule (only 2 `analysistest.make(` calls exist anywhere — `launcher_test.bzl:1169,1299` — and both target hand-written test-fixture rules, not the production ones). Their pure sub-logic is heavily tested; their *orchestration* (ctx.download → ctx.symlink → ctx.file ordering, env wiring, error propagation) is only proven by the examples/e2e integration tests hitting the live registry. See Smells §1.

## 5. Lint posture

- **What runs, where**: `taskfile.yml:22-34` (`task lint`) runs, in order: `{{.BAZEL}} run //:buildifier.check` (`taskfile.yml:25`), `actionlint`, `hawkeye check` (license headers), `lychee` (link check), `task dist:check`, `scripts/bump_ocx_test.py`. CI invokes the same via `ocx exec -- task lint` at `.github/workflows/ci.yml:31-32`, on every push and PR (the `lint` job, `ci.yml:17-32`) — a single Linux runner, not per-OS.
- **Mode**: two `buildifier()` targets in `BUILD.bazel:6-18` — `buildifier.fix` (`mode="fix"`, `lint_mode="fix"`, applies both formatting and lint autofixes; run by `task format`, `taskfile.yml:36-39`) and `buildifier.check` (`mode="diff"`, `lint_mode="warn"`; run by `task lint`). No `--warnings=` flag anywhere in the repo (`grep -rn 'warnings=' *.yml BUILD.bazel **/*.bzl` — no hits), so `buildifier.check` uses buildifier's **default warning set** unfiltered; `lint_mode="warn"` means lint findings print but do not fail the target — only formatting diffs (`mode="diff"`) fail it. So CI's lint gate is a hard format-check plus a soft (non-blocking) lint report.
- **Inline suppressions**: 4 `# buildifier: disable=` comments repo-wide (`grep -n 'buildifier:' <files>`): 3× `unused-variable` in `ocx/tests/launcher_test.bzl:72,100,159` (fake-`ctx` closures with intentionally-unused params) and 1× `print` in `ocx/private/package.bzl:199`, directly above the one deliberate `print(` call.
- **Is it clean now — buildifier not run.** No buildifier binary is reachable without a network fetch: `which buildifier` → not found; `~/.cache/bazel` does not exist (the `bazel-out` symlink in the repo root points at a `_bazel_mherwig` output base that isn't present, so no external repos are cached); `ocx exec -- which buildifier` → not found on the ocx-provisioned PATH either. Running `bazel run @buildifier_prebuilt//:buildifier` would trigger Bazel to fetch the `buildifier_prebuilt` module (a `dev_dependency` in `MODULE.bazel:18`) plus its platform-specific binary release — a network fetch, which the task instructions say to skip. **Report: not run, because no cached buildifier binary exists and running one would require an uncached network fetch.** The commands that *would* produce the warning-name/count table, for whoever runs this with network or a warm cache: `bazel run //:buildifier.check` (uses the repo's own target) or `buildifier -mode=check -lint=warn -r .` if a standalone binary is ever on `PATH`.

## 6. Stardoc coverage

Public surface (`ocx/defs.bzl:17-23`) re-exports 5 symbols: `ocx_download`, `ocx_project_repo`, `ocx_package_repo`, `ocx_package_hub`, `ocx_platform_constraints`. Because these are plain re-exports (`ocx_download = _ocx_download`), stardoc pulls documentation from the *original* declaration, not the re-export line:

| Symbol | Doc source | Has doc? |
|---|---|---|
| `ocx_download` | `repository_rule(doc = """...""")`, `ocx/private/download.bzl:61-79` | yes |
| `ocx_project_repo` | `ocx/private/project.bzl:232-234` | yes |
| `ocx_package_repo` | `ocx/private/package.bzl:299-301` | yes |
| `ocx_package_hub` | `ocx/private/package.bzl:408-410` | yes |
| `ocx_platform_constraints` | function docstring, `ocx/private/platforms.bzl:44-55` (Args/Returns sections) | yes |
| `ocx` (module extension) | `ocx/extensions.bzl:333-338` | yes |
| 4 tag classes (`download`,`project`,`policy`,`package`) | `ocx/extensions.bzl:19-20,38-39,112-113,122-123` | yes, all 4 |

**10/10 public declarations documented.** Combined with the 100% `attr.doc=` coverage in production files (§2), this is a complete stardoc-ready public surface.

**Freshness mechanism** (`docs/BUILD.bazel:12-47`): a `_DOCS` dict maps `{"defs": "//ocx:defs.bzl", "extensions": "//ocx:extensions.bzl"}` (L12-15). A list comprehension (L24-36) generates one `stardoc()` target per entry, `gen_<name>` → `<name>.gen.md`. A second comprehension (L38-47) generates one `diff_test(name = "<name>_docs_test", file1 = "<name>.gen.md", file2 = "<name>.md")` per entry, whose `failure_message` (L41) tells the developer to run `bazel run //docs:update`. That `update` target (`sh_binary`, L65-77) copies the generated files back over the committed ones via `$BUILD_WORKSPACE_DIRECTORY`.
- **Both doc tests are skipped on Windows** (`_NOT_WINDOWS`, L19-22,29,44) because stardoc's protobuf dependency doesn't compile under MSVC (comment, L17-18).
- **Both doc tests are also skipped on Bazel 9.x/rolling in CI**: `ci.yml:57-62` excludes `-//docs/...` whenever `matrix.bazel != '8.7.0'`, because "stardoc under Bazel 9+ emits extra `repo_mapping` attribute rows" that don't match the 8.7.0-generated golden files (comment, `ci.yml:58-60`). So the docs-freshness gate only actually runs on one of the three CI legs — see Smells §5.
- **Spot-check without running stardoc** (network-free): the doc strings for `ocx_download` and `ocx_project_repo` appear verbatim in the committed markdown — `grep -n 'Downloads a pinned ocx CLI release for the host platform' docs/defs.md` → line 49; `grep -n 'Provisions the toolchain declared in a workspace' docs/defs.md` → line 173; `grep -n 'Provisions tools through the OCX package manager' docs/extensions.md` → line 25. Consistent with the committed docs being current, though a full byte-for-byte freshness check needs a real stardoc run (not performed — see Gaps).

## 7. Coupling

Load graph, internal modules only (`grep -n '^load(' <files>`, multi-line loads read in full):

```
platforms.bzl     (leaf — no internal loads)
repo_utils.bzl    (leaf — no internal loads)
manifest.bzl      (leaf — no internal loads)
versions.bzl      → @bazel_skylib//lib:versions.bzl   (external only)

download.bzl      → manifest.bzl, platforms.bzl, versions.bzl
project.bzl       → platforms.bzl, repo_utils.bzl
package.bzl       → platforms.bzl, repo_utils.bzl

defs.bzl (public)       → download.bzl, package.bzl, platforms.bzl, project.bzl
extensions.bzl (public) → download.bzl, package.bzl, project.bzl, repo_utils.bzl, versions.bzl
```

A strict 3-layer DAG, zero cycles: leaves (`platforms`, `repo_utils`, `manifest`) → mid-tier orchestrators (`download`, `project`, `package`) → public façade (`defs`, `extensions`). Confirmed leaf status by absence: `grep -n '^load(' ocx/private/repo_utils.bzl ocx/private/platforms.bzl ocx/private/manifest.bzl` produces no output.

**Which public symbol reaches which private module** (direct loads only; both reach all 6 transitively):

| Public entry | Direct private loads |
|---|---|
| `ocx/defs.bzl` | `download.bzl`, `package.bzl`, `platforms.bzl`, `project.bzl` (not `repo_utils.bzl`/`manifest.bzl`/`versions.bzl` directly — only via those three) |
| `ocx/extensions.bzl` | `download.bzl`, `package.bzl`, `project.bzl`, `repo_utils.bzl`, `versions.bzl` (not `platforms.bzl`/`manifest.bzl` directly) |

**External loads** (`grep -n '^load(' <files>` filtered to `@`-prefixed): `@bazel_skylib` (`bzl_library.bzl` ×3, `unittest.bzl` ×5, `partial.bzl` ×1, `versions.bzl` ×1, `diff_test.bzl` ×1, `write_file.bzl` ×1), `@rules_shell` (`sh_test.bzl` ×4, `sh_binary.bzl` ×1), `@stardoc` (×1), `@buildifier_prebuilt` (×1), plus example-only `@tools_arm64//:env.bzl`. No load from any repo outside this fixed set.

**Load-visibility enforcement**: every private `.bzl` file (all 6, but not `versions.bzl`'s constants file — actually all 7 modules under `ocx/private/`) opens with `visibility(["//ocx", "//ocx/tests"])` (`project.bzl:31`, `download.bzl:15`, `platforms.bzl:10`, `versions.bzl:13`, `package.bzl:31`, `manifest.bzl:11`, `repo_utils.bzl:10`) — Bazel's `.bzl`-level `load()`-visibility function, gating who may `load()` the file at all, layered *on top of* the BUILD-target visibility from `package(default_visibility = ["//visibility:public"])` (`ocx/BUILD.bazel:6`, `ocx/private/BUILD.bazel:6`). The two mechanisms do different jobs: target visibility governs `deps =`/`bzl_library` graph reachability; `visibility()` governs `load()` statements specifically, and is what actually stops an external consumer from `load("@rules_ocx//ocx/private:repo_utils.bzl", ...)` even though the BUILD target is nominally public.

## Smells (ranked)

1. **The 4 repository-rule entry points have zero unit-test coverage of their own orchestration.** `_ocx_download_impl`, `_ocx_project_repo_impl`, `_ocx_package_repo_impl`, `_ocx_package_hub_impl` (§3 citations) are never wrapped in `analysistest.make()` — only their pure sub-helpers are. Correctness of the actual `ctx.download`/`ctx.execute`/`ctx.symlink`/`ctx.file` sequencing rests entirely on the live-registry example tests (`examples/*`) and 2 dogfood `sh_test` (`ocx/tests/BUILD.bazel:23-42`). This is exactly the surface the frame's "repository-rule hermeticity" candidate worries about, and it is the one place a hermeticity regression (wrong `ctx.watch()` ordering, a getenv read that should have been sandboxed) would ship without a fast, offline test catching it.
2. **`ocx/private/repo_utils.bzl` (1,602 lines) is a shared-utils grab-bag**, not a cohesive module — 7 distinct concerns under one file and one `visibility()` gate (§3). Every other private module and the public façade depends on it (§7), so it is both the largest file and the least single-purpose one. A refactor split (env/policy vs. process-exec vs. launcher-rendering vs. path/validation) would shrink the blast radius of any one change, at the cost of more `load()` lines.
3. **Generated BUILD-file content is authored as raw string concatenation**, invisible to buildifier and to any grep-based BUILD audit: `download.bzl:17-26`, `project.bzl:124-127,228-230`, `package.bzl:284-295,367-406`, and `repo_utils.bzl`'s `render_launchers_build`/`render_env_bzl`. A typo in a generated `package(default_visibility=...)` string would pass every static check in this repo and only surface when an example test actually builds the generated repo. This is a genuine blind spot a "grep the BUILD graph" heuristic must know to route around.
4. **`taskfile.yml:43`'s `test` task description — "Unit tests + docs freshness (no network)" — is imprecise.** `ocx/tests/BUILD.bazel:21-42` groups 2 dogfood `sh_test` targets into the same `//...` that the description calls network-free; those targets consume `@ocx_tool`/`@dev_tools`, external repos this same repo's own module extension fetches from the live `ocx.sh` registry (confirmed by the CI comment at `ci.yml:57` calling the same job "Unit tests, smoke tests, docs freshness"). On a clean checkout the first `bazel test //...` does need network (or a pre-warmed Bazel repo cache); only the 76 `analysistest`/`unittest` targets are unconditionally network-free. Code (the `BUILD.bazel` deps) is authoritative here; the taskfile description is the stale/optimistic side.
5. **Docs-freshness is only enforced on the Bazel 8.7.0 CI leg.** `ci.yml:57-62` excludes `//docs/...` whenever the matrix's Bazel isn't exactly `8.7.0`, because stardoc's output shape drifts across Bazel 8→9 (comment). Given the CI matrix explicitly runs `9.x` and `rolling` (frame era), a stardoc-output regression specific to those versions has no CI signal until the next `8.7.0` push.
6. **`e2e/bzlmod` is deliberately build-only** (`filegroup`, no `sh_test`) — self-flagged with a `ponytail:` comment (`e2e/bzlmod/BUILD.bazel:5-7`) naming the exact tradeoff (BCR-platform-matrix flakiness) and the upgrade condition ("if BCR CI proves reliable"). Low severity because it's explicit and reasoned, not silent — listed for completeness, not as a defect.

## Patterns worth encoding

1. **`.bzl`-file `visibility()` as a load-gate, layered under public BUILD-target visibility.** All 7 `ocx/private/*.bzl` files declare `visibility(["//ocx", "//ocx/tests"])` (§7) even though their BUILD package is `default_visibility = public`. Verification a rule can teach: `grep -L '^visibility(' ocx/private/*.bzl` should print nothing (empty = every private file is gated); a non-empty result names the ungated file.
2. **`reproducible = True` on a module extension is safe specifically because host/env detection never happens in the extension's own implementation function** — it happens inside the repository rules the extension merely instantiates (`extensions.bzl:6-10`: *"all host detection and environment access happens inside the repository rules... so the extension is marked reproducible"*). The teachable invariant for a Bazel-quality rule is not "reproducible extensions must not create host-dependent repos" (they can) but "an extension's own `impl` function must be a pure function of tag values; push all `ctx.os`/`ctx.getenv` reads down into the repository rules it calls." Verification: `grep -n 'ctx\.os\.\|ctx\.getenv(' ocx/extensions.bzl` should be empty even though `repository_rule` impls it dispatches to use both freely.
3. **Character allow-lists for everything that flows into a generated shell/batch script.** `valid_bin_name`, `valid_env_key`, `sh_quote`, `bat_value` (`repo_utils.bzl:223-317`) constrain input before it is interpolated into a launcher script, and the one raw-shell `ctx.execute(["/bin/sh","-c",...])` call carries an explicit CWE-426 rationale for using an absolute `/bin/sh` with a fixed `PATH` rather than trusting the inherited one (`repo_utils.bzl:788-795`). A repository-rule-hermeticity rule can cite this as the reference pattern for "never string-interpolate ambient/user-controlled values into a generated shell script without a validated character set."
4. **Generated BUILD content lives inside `.bzl` string templates, not `.bzl` code** — Smell §3 above, restated as a pattern to *teach forward*: any Bazel authoring guide for repository rules must call out that the generated repo's `BUILD.bazel` is opaque to buildifier/stardoc/grep-based audits, and its only real verification is an integration test that actually builds a target from the generated repo (as `examples/*` does here).
5. **Comprehensive `analysistest` coverage of pure Starlark helpers via hand-rolled `ctx` fakes**, not real repository-rule execution. `launcher_test.bzl:40-197`'s three fakes (`_fs_ctx`, `_replay_ctx`, `_env_ctx`) let 76 test targets run with zero network and zero sandboxing, including 34 data-driven error/guard-path cases generated from dict literals (`launcher_test.bzl:1058-1184`). This is the template for testing repository-rule logic without ever touching the network — the exact gap Smell §1 shows the repo hasn't closed for the impl functions themselves.
6. **100% `doc=`/docstring coverage on every production public declaration** (§2, §6: 51/51 attrs, 4/4 repository rules, 1/1 module extension, 4/4 tag classes) — a concrete, measured bar ("every `attr.*()` and every `rule()`/`repository_rule()`/`module_extension()`/`tag_class()` carries `doc=`") that a stardoc-coverage rule can check by the same paren-balance technique used here, rather than accepting sparse Bazel-ecosystem documentation as the norm.

## Contradictions of the frame

- **"Repository-rule hermeticity (`getenv`, `watch`, unsandboxed fetches)" is listed as a suspected pain point to investigate. Measured evidence points the other way for this repo**: 9 `getenv` call sites and 4 `watch`/`watch_tree` call sites total, all funneled through 2 documented, individually-tested helper functions (`make_ocx_env`, `ambient_config_paths`) rather than scattered ad hoc across the codebase, and both fetch call sites carry `sha256=`. `rules_ocx` is closer to a worked *example* of disciplined repository-rule hermeticity than a cautionary tale — the frame's candidate should be grounded in outside literature/case studies, not assumed present here.
- **"`glob` misuse" and "`select()` explosion" are listed as suspected pain points. Measured: 0 real `**` globs and 1 real `select()` call in this repo's entire own build graph** (§2) — the sole `**` glob and the sole other `select()` mention both live inside generated-repo BUILD-string templates, never evaluated by this repo's own Bazel invocation. This repo provides no supporting evidence for either candidate; if they matter for the shipped rule set, the evidence must come from elsewhere in the literature scan, not from the fleet's one Bazel repo.
- **"Module extension purity and `reproducible`" is listed as a candidate to verify. Measured: it is already correctly and deliberately handled** (`extensions.bzl:6-10,331`), with the purity boundary documented in a comment — see Patterns §2. This is a pattern to *encode as a positive example*, not a gap to close.
- **Requester hypothesis #1 ("per-language guides are the core deliverable") gets no support or refutation from this codebase — it is silent on the question by construction.** `rules_ocx` contains zero `cc_*`, `py_*`, `js_*`/`ts_*`, or `rust_*` rule usage anywhere (it is 100% repository-rule/module-extension mechanics for shelling out to an external package manager); the frame already knows this ("the rest of the fleet under `/home/mherwig/dev`... do NOT build with Bazel today"). Flagged here as a scope boundary this axis cannot cross, not a contradiction: per-language Bazel guidance must be grounded in canonical/upstream sources, never in this fleet's one Bazel repo.

## Gaps

- **Buildifier was not run** — no cached binary reachable offline (`which buildifier`, `ocx exec -- which buildifier`, `~/.cache/bazel` all come up empty), and running `bazel run @buildifier_prebuilt//:buildifier` would trigger an uncached network fetch of a `dev_dependency` module, which the task instructions say to avoid. No warning-name/count table exists for this repo as a result — see §5 for the exact commands that would produce one with network or a warm cache.
- **Docs-freshness was spot-checked, not fully verified.** Two docstring fragments were confirmed to appear verbatim in the committed `docs/*.md` (§6), but a byte-for-byte `diff_test` pass needs a real `stardoc` run, which needs the `@stardoc` module fetched — not attempted (same network constraint).
- **Nothing here was executed.** This is a 100% static audit (`grep`/`wc`/`read` only, no `bazel build`/`test`/`run`). Whether `bazel test //...` on a genuinely clean checkout actually blocks on network for the 2 dogfood `sh_test` (Smell §4) is inferred from the `MODULE.bazel`/`BUILD.bazel` dependency structure, not observed live.
- **The coupling graph (§7) covers only this checkout's static `.bzl` `load()` graph.** It does not cover the *runtime* repository graph the extension builds (`@ocx_tool` → `@dev_tools`, package hubs → per-platform package repos) — those are created at fetch time from OCI registry content and aren't visible to a static grep of the checked-out source.
- **Only one Bazel repository exists in the fleet, so nothing here can be cross-checked against a second real codebase.** Every number above describes `rules_ocx` specifically; generalizing any of it (especially the Smells and Patterns) to "how Bazel repos generally look" needs the wider literature/example scan the frame calls for, not a second fleet data point that doesn't exist.
