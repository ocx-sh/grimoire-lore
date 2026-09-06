---
title: Bazel/Starlark AI-config inventory — fleet audit, phase 0
agent: research-lang (bazel program, grounding wave)
model: sonnet
scope: >
  Every existing rule, skill, agent, ADR, research note, plan, or AGENTS/CLAUDE
  file across /home/mherwig/dev that touches Bazel or Starlark; the AGENTS.md +
  starlark.md normative ledger for rules_ocx; the overlap surface against
  sibling lore rule sets; the documented ocx-as-Bazel-dependency contract;
  and the frame's candidate concerns with no existing config.
method: >
  Read-only. `find`/`grep -n`/`wc -l` over /home/mherwig/dev, excluding
  .agents/worktrees, node_modules, .git, target, .agents (fleet-grep pass
  only). Every command is inlined next to its result below — re-run from
  /home/mherwig/dev unless a `cd` is shown. No file outside this document was
  created or modified.
date_researched: 2026-09-05
---

# Bazel/Starlark AI-config inventory

## Table of contents

- [Headline numbers](#headline-numbers)
- [1. Fleet-wide inventory](#1-fleet-wide-inventory)
  - [1a. rules_ocx — the only Bazel repo](#1a-rules_ocx--the-only-bazel-repo)
  - [1b. ocx (website + design artifacts) — prior art for consumption](#1b-ocx-website--design-artifacts--prior-art-for-consumption)
  - [1c. Rest of the fleet](#1c-rest-of-the-fleet)
- [2. AGENTS.md / starlark.md normative ledger](#2-agentsmd--starlarkmd-normative-ledger)
- [3. Sibling lore rule-set overlap surface](#3-sibling-lore-rule-set-overlap-surface)
- [4. Bazel as a consumer of ocx — the contract](#4-bazel-as-a-consumer-of-ocx--the-contract)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)

## Headline numbers

| # | Number | Command |
|---|---|---|
| 1 | **1** Bazel repository in the fleet (`rules_ocx`); **5,851** lines of `.bzl`/`BUILD.bazel`/`MODULE.bazel` (frame said 5,855 — 4-line drift, immaterial) | `cd rules_ocx && find . -path ./bazel-bin -prune -o -path ./bazel-out -prune -o -path ./bazel-testlogs -prune -o -path ./bazel-rules_ocx -prune -o -path ./.git -prune -o -path ./.agents -prune -o -path ./dist -prune -o \( -name "*.bzl" -o -name "BUILD.bazel" -o -name BUILD -o -name MODULE.bazel \) -print0 \| xargs -0 cat \| wc -l` |
| 2 | **8** rules_ocx AI-config files directly governing Bazel/Starlark: `AGENTS.md` (303 ln), `CLAUDE.md` (1 ln, import shim), 4 `.claude/rules/*.md` (39+17+11+84=151 ln), 1 skill (177 ln), 1 ADR (382 ln), 1 research note (69 ln), 1 plan (354 ln), `hex.md` (66 ln, 5 Bazel-touching lines) | `wc -l AGENTS.md CLAUDE.md .claude/rules/*.md .claude/skills/update-dist/SKILL.md .agents/adr/*.md .agents/research/*.md .agents/plans/*.md .agents/memory/hex.md` |
| 3 | **0** Bazel mentions in rules_ocx's `.claude/hooks/*.py` (966 ln) — the commit-message and pre-push hooks are Bazel-agnostic | `grep -c -i bazel .claude/hooks/*.py` |
| 4 | **0** rules carrying a `BZL-` prefix anywhere in the lore catalog today — the frame's reserved prefix is free | `cd grimoire-lore && grep -rhoE '^\| ?[A-Z]{2,10}-[0-9]{2}' rules/*.md \| sed -E 's/[0-9]+$//' \| sort -u` → `CI- LINT- REL- TOOL-` only |
| 5 | **0** mentions of Bazel, a build system, a lockfile, hermeticity, reproducibility, or CI caching that are actually about Bazel in the 6 sibling rule sets (808 ln combined) — the overlap surface is *conceptual* (lockfile/CI-cache patterns), never literal | `grep -n -i -E "bazel\|build system\|lockfile\|hermetic\|reproducib\|cache\|caching\|CI" rules/{rust-cargo,python-packaging,typescript-packaging,rust-quality,python-quality,typescript-quality}.md` |
| 6 | **≥60** files under `/home/mherwig/dev/ocx/.claude/artifacts/*.md` mention "bazel" (case-insensitive); **13** files under `ocx/website/src/docs/**` do | `cd ocx && grep -li bazel .claude/artifacts/*.md \| wc -l` (60); `find website/src/docs -name '*.md' \| xargs grep -li bazel \| wc -l` (13) |
| 7 | **388** raw fleet-wide hits for `.claude/`/`.agents/` files mentioning "bazel" outside `rules_ocx` and `ocx`; **221** after excluding six directories that are git **worktrees** of `ocx`/`index` (`ocx-sion`, `ocx-soraka`, `ocx-evelynn`, `index-claims`) or vendored `external/ocx` copies — i.e. **~43%** of the raw count is worktree/vendor duplication, not distinct content | see [1c](#1c-rest-of-the-fleet) for the exact loop + counts |
| 8 | **4** OCX packages that are literally Bazel's own toolchain, shipped through the OCX package manager: `bazel`, `bazelisk`, `buildifier`, `buildozer` (plus `bazel-lsp` in a sibling mirror) — none of these live under `.claude/`/`.agents/`, so the fleet-wide grep above **misses them entirely** | `find /home/mherwig/dev/ocx-contrib/mirror-bazelbuild -maxdepth 1 -type d` |
| 9 | **1** skill in the fleet (`ocx-contrib/.claude/skills/create-mirror`, 1,364 ln + 227-ln Starlark reference) documents a real Bazel-`.bzl`-dialect Starlark authoring trap, independent of rules_ocx | see [Patterns worth encoding](#patterns-worth-encoding) §1 |
| 10 | **37** distinct normative claims enumerated from `AGENTS.md` + **8** from `starlark.md` = **45** ledger rows; **31/45 (69%)** carry no inline, re-runnable verification in the text itself | [§2](#2-agentsmd--starlarkmd-normative-ledger) |

## 1. Fleet-wide inventory

### 1a. rules_ocx — the only Bazel repo

All paths relative to `/home/mherwig/dev/rules_ocx/`.

| Path | Lines | Activation | Digest |
|---|---|---|---|
| `AGENTS.md` | 303 | Always-on (single source of truth per its own "Agent notes", `AGENTS.md:296-297`) | Architecture (one module extension, 4 tag classes, `@ocx_tool` sha256-pinned binary, project/package tiers), 5 numbered invariants, the "two-tier ocx CLI contract" (JSON shapes, sysexit table, config/sigstore precedence ladders, `OCX_ENV_CLASSES`), workflow, dogfooding, spec/plan/ADR conventions, product. Full normative ledger in [§2](#2-agentsmd--starlarkmd-normative-ledger). |
| `CLAUDE.md` | 1 | Always-on | `@AGENTS.md` — a one-line import shim, deliberately kept that way (`AGENTS.md:296-298`: "Edit only AGENTS.md — CLAUDE.md is a one-line `@AGENTS.md` import shim and must stay that way"). |
| `.claude/rules/starlark.md` | 40 | Auto-loaded by Claude Code (`AGENTS.md:299-301`); no path glob — repo-wide | Starlark style & structure. Public API = `//ocx:defs.bzl` + `//ocx:extensions.bzl`; everything else under `ocx/private/` is unloadable. Docstrings feed stardoc; `bazel test //docs/...` catches drift. buildifier-clean gate. Repository rules own all host/env I/O (`repository_ctx.getenv`, `watch()`); module extensions stay pure. Parse only documented `--format json` shapes, 3 named exceptions. A named `analysistest`/`expect_failure` gotcha (guard-fragment/call-site collision) — see [patterns](#patterns-worth-encoding). Full row-by-row ledger in §2. |
| `.claude/rules/mirror-auth.md` | 19 | Auto-loaded, no glob | Documents a real gap, not a rule to follow: mirror downloads (`OCX_INSTALL_DIST_URL`/`OCX_INSTALL_MIRROR_URL`) assume anonymous read — `ctx.download`/`ctx.download_and_extract` pass no credentials (`mirror-auth.md:1-6`). Future fix named exactly: `ctx.download(auth=…)` + `read_netrc`/`use_netrc` from `@bazel_tools//tools/build_defs/repo:utils.bzl` (`mirror-auth.md:10-11`) — standard Bazel idiom, no new machinery. Corroborated against the `ocx` installers 2026-09-02 (`mirror-auth.md:17-18`). |
| `.claude/rules/release.md` | 12 | Auto-loaded, no glob | 5-step release procedure: `task verify` green → `git-cliff --bump` (pre-1.0: feat bumps minor, breaking does NOT bump major, `release.md:4-5`) → bump `version` in `MODULE.bazel` → tag+push → BCR submission is **manual today**, `.bcr/` holds templates, follow `bazel-contrib/publish-to-bcr` "when automating" (`release.md:10-11`). |
| `.claude/rules/dist-snapshot.md` | 86 | Auto-loaded, no glob | The `dist/dist.json` vendored-snapshot procedure and its supply-chain guards: additions-only refresh, per-row bar (stable channel, 64-lowercase-hex sha256, host-allowlisted URL, single-segment tag/filename), coverage floor (≥8 targets, no regression vs the committed snapshot), and a **3-generation URL-traversal-guard history** narrated in full (`dist-snapshot.md:40-53`) — worth quoting for the authoring pass as a concrete "blocklist vs allowlist" case study. No override flag anywhere; a mismatch is investigated by hand. |
| `.claude/skills/update-dist/SKILL.md` | 177 | Skill (invoked by name/description match: "update or bump ocx, pin a new ocx version…") | Procedure skill wrapping `scripts/bump_ocx.py`. Restates the dist-snapshot guards as a refusal table with exact meanings, then adds the **verification step the rule file itself lacks**: force a real fetch with an empty `--repository_cache` (`SKILL.md:100-111`) because `task verify` alone can pass on a cached download. Names two couplings that "fail open, so no test in this repo catches a drift" (`ambient_config_paths()`, `sigstore_trust_root_path()`) — an explicit acknowledged verification gap, not a silent one. |
| `.agents/adr/adr_0001_policy-tag-and-env-classes.md` | 382 | ADR (Accepted, 2026-09-02) | Root-only `ocx.policy` tag class + env-var classification (site/translucent/explicit/pinned). Decision drivers explicitly Bazel-architectural: "Extension impls must stay a pure function of tags… all env and host access belongs to repository rules" (`adr_0001:75-76`); "Public API is a one-way door… cannot be renamed after a release" (`adr_0001:71-72`). Considered-options table cites ecosystem precedent (`module.is_root` pattern) via the linked research note. |
| `.agents/research/research_bazel-policy-surfaces.md` | 69 | Research note (dated 2026-09-02, expires 2027-03-01) | Surveys `module.is_root` root-tag enforcement across rules_python/rules_go/toolchains_llvm/rules_rust/rules_scala — "most rulesets *silently ignore* a non-root customization; none in the sample `fail()`" (`research_bazel-policy-surfaces.md:12`) — rules_ocx deliberately breaks with ecosystem convention for a security-policy tag. Flags an **unconfirmed** claim: no doc/source found for zip-slip/symlink-escape protection in `download_and_extract` (`:14`) — live risk noted as low today, "re-verify before extracting anything less trusted." |
| `.agents/plans/plan_ocx-0-6-0-adoption.md` | 354 | Plan (State: done, hex-review round 2 Approve 2026-09-03) | The execution plan that produced the ADR above; WP2 is "policy + env classes." Historical/closed — not itself a standing rule, but shows the review bar the fleet already applies to Bazel-adjacent changes (27/27 converged review items). |
| `.agents/memory/hex.md` | 66 (5 Bazel-touching) | Team-shared swarm memory, committed | Two operational Bazel facts not written anywhere else: (1) stardoc cannot build in a fresh agent worktree on this host — no `cc1plus` — so `bazel run //docs:update` must run from the main checkout (`hex.md:9`, `:47`); (2) `.bazelignore` **must** list `.agents/worktrees` because Bazel does not read `.gitignore`, or `bazel test //...` globs into a live worktree's own `examples/` and fails (`hex.md:50-51`) — confirmed live in the committed `.bazelignore` (`examples`, `e2e`, `.agents/worktrees`). |
| `.agents/templates/{adr,plan,research,spec}.md` | 834 (0 Bazel-specific) | Templates, referenced by convention (`AGENTS.md:277-279`) | Generic hex templates; no Bazel content of their own. Listed for completeness per the audit's instructed scope; contribute nothing to the ledger. |
| `.bazelrc` (committed) | 14 | Not AI config, but the ground truth the rules above describe | `common --enable_platform_specific_config`; Windows needs `startup --windows_enable_symlinks` + `common:windows --enable_runfiles` (sh_test runfiles); `build --incompatible_disallow_empty_glob`; `try-import %workspace%/.bazelrc.user` (`.bazelrc:1-14`). |
| `.bazelrc.user` (gitignored) | 494 B | N/A | **Not read beyond confirming its existence and encoding** (`file` reports UTF-8 text) — per task instruction, holds a cache-write credential the frame already describes; no line of it is quoted here. CI writes remote-cache config into this same file at build time — see `.github/actions/remote-cache/action.yml:17-36`, which appends `build --remote_cache=…`, `--remote_timeout=60`, and either `--remote_header=authorization="Basic $BAZEL_CACHE_AUTH"` (push) or `--remote_upload_local_results=false` (PR/fork, read-only). |
| `.bazelversion` | 1 | N/A | `8.7.0` — matches the frame. |
| `.bazelignore` | 3 | N/A | `examples`, `e2e`, `.agents/worktrees` — the third entry is the hex.md-documented fix for worktree glob leakage. |
| `.github/workflows/ci.yml` | — | CI, not AI config | Confirms the frame's job list: `test` (3 OS × Bazel matrix via `USE_BAZEL_VERSION`, `ci.yml:41-45`), `examples` (live registry, `ci.yml:64-81`), `bcr-parity` (4 platforms incl. Rosetta, **deliberately no cache** — "has to build exactly what BCR's own presubmit builds… A cache hit here" would mask that, `ci.yml:98-99`), `pin-completeness`, `offline` (**deliberately no cache** — "asserts hermetic offline behaviour, which a network-backed cache would mask", `ci.yml:171-172`). No `--remote_executor` anywhere — confirms "No remote execution" from the frame. |

### 1b. ocx (website + design artifacts) — prior art for consumption

`grep -li bazel /home/mherwig/dev/ocx/.claude/artifacts/*.md` → 60 files; `grep -c -i bazel` ranks `research_publish_to_bcr_anatomy.md` highest (45 hits — a full reconstruction of the `bazel-contrib/publish-to-bcr` pipeline at pinned commits, written as prior art for ocx's own `ocx package announce` lane, **not** a rules_ocx-consumption document). The other 59 files' Bazel mentions are overwhelmingly single-digit and comparative (BCR as a design precedent for OCX's own index/registry work, Starlark named as the language BCR/Buck2 use). None of the 60 contain build-authoring guidance for a Bazel *consumer* of ocx beyond what §4 already extracts from the website docs.

`website/src/docs/**` — 13 files, all comparative or embedding-primitive mentions; digested in full in [§4](#4-bazel-as-a-consumer-of-ocx--the-contract) since that is exactly the consumer contract this axis asks for.

Ranked by mention density (`grep -c -i bazel .claude/artifacts/*.md | sort -t: -k2 -rn`), the top 10 of the 60:

| File | Hits | Verdict |
|---|---|---|
| `research_publish_to_bcr_anatomy.md` | 45 | BCR publish-pipeline reconstruction, prior art for `ocx package announce` — see above, not a consumption doc |
| `research_run_command_conventions.md` | 9 | Comparative — argv-vs-shell conventions across CI systems incl. Bazel actions |
| `research_project_env_declaration.md` | 8 | Comparative — env-injection precedent survey, Bazel `--define`/`--action_env` named alongside GH Actions |
| `research_interpolation_token_grammar.md` | 8 | Comparative — token-grammar precedent survey |
| `research_content_addressed_storage.md` | 8 | Comparative — CAS design precedent, Bazel's own CAS/remote-cache named as one data point |
| `adr_cli_high_low_layering.md` | 8 | Comparative — CLI layering precedent |
| `research_sparse_index_formats.md` | 7 | BCR's `metadata.json`/`source.json` format as index-design precedent — digested in [§4](#4-bazel-as-a-consumer-of-ocx--the-contract) |
| `adr_exec_resolution_record.md` | 7 | Comparative |
| `adr_announce_publisher_surface.md` | 7 | Comparative — names `publish-to-bcr` as the shape `ocx package announce` follows |
| `research_deprecation_telemetry_patterns.md` | 6 | Comparative |

The remaining 50 files each carry 1-6 mentions, uniformly comparative (BCR/Starlark named as one data point among several ecosystems). None of the 60 was found to contain build-authoring guidance beyond what §4 already extracts.

The full 60-file list (re-derive with `cd ocx && grep -li bazel .claude/artifacts/*.md`):

```
adr_announce_publisher_surface.md         adr_custom_platform.md
adr_cli_high_low_layering.md              adr_declared_binaries_metadata.md
adr_interpolation_token_grammar.md        adr_layer_layout_config.md
adr_lock_records_physical_address.md      adr_oci_referrers_discovery.md
adr_oci_referrers_signing_v1.md           adr_package_dependencies.md
adr_package_entry_points.md               adr_package_integrations.md
adr_package_test_scripting.md             adr_platform_libc_os_features.md
adr_project_env_declaration.md            adr_project_toolchain_config.md
adr_public_index_registry_indirection.md  adr_three_tier_cas_storage.md
adr_two_env_composition.md                adr_variants.md
adr_windows_cmd_argv_injection.md         adr_windows_exe_shim.md
analysis_issue_triage_2026-08-29.md       design_spec_announce_initiative.md
plan_docker_images.md                     pr_faq_oci_referrers_discovery.md
pr_faq_oci_referrers_signing_v1.md        pr_faq_project_toolchain.md
prd_oci_referrers_discovery.md            prd_oci_referrers_signing_v1.md
prd_windows_exe_shim.md                   research_batbatbut_mitigations.md
research_blob_retention_policy.md         research_content_addressed_storage.md
research_cosign_sigstore_notation.md      research_deprecation_telemetry_patterns.md
research_execution_record_formats.md      research_exit_codes.md
research_index_announce_bots.md           research_interpolation_token_grammar.md
research_lazy_digest_fetch_and_gc.md      research_lazy_shim_prior_art.md
research_layer_extraction_layout.md       research_libc_detection_robustness.md
research_lockfile_design_patterns.md      research_lockfile_domain.md
research_package_integrations.md          research_project_env_declaration.md
research_publish_to_bcr_anatomy.md        research_publish_to_bcr_transfer.md
research_run_command_conventions.md       research_sparse_index_formats.md
research_windows_shim_signing.md          research_zip_artifact_classes.md
review_pr-87_quality.md                   review_r1_arch_package_copy.md
review_r3_slice1_architect.md             system_design_windows_exe_shim.md
```

### 1c. Rest of the fleet

Command (excludes `.agents/worktrees`, `node_modules`, `.git`, `target`; searches `.claude/` and `.agents/` files fleet-wide, `rules_ocx` and `ocx` excluded since covered above):

```sh
cd /home/mherwig/dev
for d in */; do d="${d%/}"; [ "$d" = rules_ocx ] && continue; [ "$d" = ocx ] && continue
  find "$d" -maxdepth 5 \( -path "*/.agents/worktrees*" -o -path "*/node_modules*" -o -path "*/.git*" -o -path "*/target*" \) -prune \
    -o \( -path "*/.claude/*" -o -path "*/.agents/*" \) -type f -print
done | xargs grep -liE bazel
```

**388 hits.** Six directories are git worktrees of another repo in the fleet or a vendored copy, confirmed via `cat <dir>/.git` (a worktree's `.git` is a file containing `gitdir: …/.git/worktrees/<name>`, not a directory):

| Directory | What it is | Hits contributed |
|---|---|---|
| `ocx-sion`, `ocx-soraka`, `ocx-evelynn` | Live git worktrees of `ocx` (`cat ocx-sion/.git` → `gitdir: /home/mherwig/dev/ocx/.git/worktrees/ocx-sion`) | 76 + 66 + 18 = 160, duplicating `ocx`'s own `.claude/artifacts/*.md` |
| `index-claims` | Live git worktree of `index` | part of the remainder below |
| `ocx-mcp/external/ocx`, `ocx-mirror/external/ocx` | Vendored (non-worktree) copies of the `ocx` repo tree | duplicate the same `.claude/artifacts/*.md` files digested in [1b](#1b-ocx-website--design-artifacts--prior-art-for-consumption) |

After excluding `external/ocx`, `index-claims/`, `ocx-evelynn/` (grep pattern `-vE "external/ocx|index-claims/|ocx-evelynn/"`; `ocx-sion`/`ocx-soraka` fall out too once the by-repo table is read) the count drops to **221**, then breaks down as:

| Repo | Hits | Verdict |
|---|---|---|
| `ocx-sion` / `ocx-soraka` | 76 / 66 | Worktrees of `ocx` — duplicate content, excluded from further digest |
| `arcana` | 18 | Comparative only — "hierarchical execution performance" research names Bazel's build-graph/caching model alongside other orchestrators as a precedent; no Bazel-authoring content |
| `ocx-contrib` | 14 | **Real, new content** — the `create-mirror` skill's Starlark-dialect reference (`references/starlark-api.md`) and the `mirror-bazelbuild`/`mirror-bazel-lsp` package definitions live here (the latter two are not under `.claude/`/`.agents/` so the grep above does not even count them — see headline #8). Digested in [Patterns worth encoding](#patterns-worth-encoding). |
| `index-fix67`, `index` | 11 + 11 | `index-fix67` is a separate, slightly stale clone of `ocx-sh/index.git` (same remote, 4 fewer artifact files than `index` — `diff -rq index/.claude/artifacts index-fix67/.claude/artifacts`); both sets of hits are the sparse-index research already covered in [§4](#4-bazel-as-a-consumer-of-ocx--the-contract) (BCR named as index-format prior art, not a consumer contract) |
| `grimoire-lore` | 9 | This repo's own prior research. `research/rust-ecosystem/starlark-cluster.md:242,343,468` evaluates the `starlark` Rust crate as an *embeddable scripting engine* candidate (competing against `rhai`) — mentions Bazel only as Starlark's origin ecosystem, carries no Bazel build-system guidance. The other 8 hits (`docs-page-types.md`, `rust-state-and-resources*`, `rust-type-architecture/workspace-and-crate-splitting.md`, `rust-security/supply-chain-security.md`, `ai-agentic-coding/arcana-digest.md`) are single incidental mentions in unrelated Rust/docs research. |
| `ocx-mirror` | 7 | `research_bazelbuild_assets.md` (339 ln) — the spec for mirroring `bazel`/`buildifier`/`buildozer` binaries; digested under headline #8 and [§4](#4-bazel-as-a-consumer-of-ocx--the-contract) |
| `ocx-save` | 5 | Separate clone of `ocx-sh/ocx.git` — duplicate of `ocx`, excluded from further digest |
| `ocx-marketing` | 1 | `.agents/product-marketing.md` + prose docs name Bazel as one of the audiences/integrations OCX targets — positioning language, not build guidance |
| `grimoire`, `grimoire-duo`, `grimoire-wt-opencode-jsonc` | 1 each | Single incidental mentions (`research_state_portability_v2.md`, same research note present in 3 near-identical repo copies) |

**Net:** outside `rules_ocx`, the only genuinely new Bazel/Starlark-authoring material in the fleet's AI config is `ocx-contrib`'s `create-mirror` skill (a Starlark-dialect gotcha reference) and `ocx-mirror`'s mirror spec for Bazel's own binaries. Everything else is either duplication (worktrees/clones/vendored copies) or comparative prose that names Bazel without teaching anything about it.

## 2. AGENTS.md / starlark.md normative ledger

Columns: **Portable?** — `yes` (a general Bazel/bzlmod pattern), `no` (ocx-specific plumbing with no generic lesson), `param` (portable once the ocx-specific names are parameterised). **Verification named?** — a concrete command/procedure the text itself points at, or "—" if none.

| # | Claim | Where | Portable? | Verification named | Gap |
|---|---|---|---|---|---|
| 1 | One module extension, 4 tag classes (`download`/`project` root-only, `package`, `policy` root-only ≤1) | `AGENTS.md:9-10` | param | — | No `bazel query` or grep named to confirm tag-class shape matches source |
| 2 | Extension impl is a pure function of tags → `reproducible = True` | `AGENTS.md:10-11` | **yes** — general bzlmod hygiene rule | — | No test named that would fail if impurity crept in |
| 3 | All host detection happens in repository rules, never in the extension | `AGENTS.md:11` | **yes** | Same as invariant 3 below | Same gap |
| 4 | `@ocx_tool` sha256-enforced per vendored `dist/dist.json` | `AGENTS.md:13-14` | param — "pin binary fetches by digest" generalizes | `task dist:check` (named in dist-snapshot.md, not here) | Cross-file: AGENTS.md states the claim, dist-snapshot.md carries the check |
| 5 | Floor `ocx >= 0.6.0` (`MIN_OCX_VERSION`) | `AGENTS.md:16` | no | — | — |
| 6 | Mirror knobs `OCX_INSTALL_DIST_URL`/`OCX_INSTALL_MIRROR_URL`, env-only, no attrs | `AGENTS.md:19-20` | no | — | — |
| 7 | Self-verifying manifest convention: last path segment `<64-hex>.json` is digest-enforced, any other name unverified | `AGENTS.md:21-24` | **yes** — "fail-open naming convention is a supply-chain smell" generalizes | — | Explicitly documented as fail-open with no test (starlark.md:20-24 repeats this) |
| 8 | Project tier command sequence: `lock --check → pull → env → inspect --closure` | `AGENTS.md:26-27` | no | — | — |
| 9 | Package tier command sequence + PATH-scan fallback when `binaries_complete=false` | `AGENTS.md:28-33` | no | — | — |
| 10 | Shared `OCX_HOME`; repo rules unsandboxed by design (content-addressed store is the win) | `AGENTS.md:34-35` | **yes** — "repository rules are unsandboxed; that's inherent to Bazel, not a bug" is a portable teaching point | — | — |
| 11 | `isolated_home`/`no_config` opt-outs and exactly what each does and doesn't prune | `AGENTS.md:35-39` | no | — | — |
| 12 | Policy tier: root-only, ≤1, explicit-only env vars, cannot *enable* verification (only ocx's own `[[trust.policy]]` can) | `AGENTS.md:40-54` | param — "a security-posture tag class must be root-only and `fail()` on violation" generalizes (research note corroborates as *against* ecosystem norm) | — | — |
| 13 | **Invariant 1**: never re-implement OCX internals in Starlark; CLI `--format json` is the only interface | `AGENTS.md:58-62` | **yes** — "delegate to the tool's own CLI, never parse its internal formats" is a universal repository-rule lesson | — | — |
| 14 | **Invariant 2**: `DEFAULT_OCX_VERSION` and `dist/dist.json` bump together | `AGENTS.md:63-64` | no | `bump_ocx.py` refuses a pin the snapshot can't support (skill, not here) | — |
| 15 | **Invariant 3**: extension impls take no `module_ctx.os`, no getenv — repository rules only | `AGENTS.md:65` | **yes** — this *is* the bzlmod purity rule, stated as an invariant | — | No lint/query named that would catch a violation mechanically |
| 16 | **Invariant 4**: every sysexit reachable from a repo rule maps to a `fail()` naming the fix; exit 75 retried before failing; 82 deliberately absent | `AGENTS.md:66-72` | **yes** — "map subprocess/tool exit codes to actionable `fail()` text" generalizes to any repo rule wrapping a CLI | — | No test enumerated that walks the sysexit table and asserts coverage |
| 17 | **Invariant 5**: repo rules watch ambient config tiers except lazy `ocx.package(bins=…)`; unconditional shell-activation consent stamping documented as a side effect with an upstream ask (`ocx-sh/ocx#400`) | `AGENTS.md:73-101` | no | — | Longest, most fragile invariant — no verification at all, only prose |
| 18 | `ocx --format json env` shape: `.entries` only is safe to parse; `type` outside 3 known kinds is shape drift → `fail()` | `AGENTS.md:105-121` | param — "typed-shape-drift-is-a-fail(), never a silent skip" generalizes | — | — |
| 19 | Lazy composition refused on every eager path (`EAGER_LAZY_MODE`) | `AGENTS.md:122-132` | no | — | — |
| 20 | `package install`/`which` shapes, incl. a documented breaking change (0.5.8: object not bare string) | `AGENTS.md:133-141` | no | — | — |
| 21 | `inspect --closure` shape; `closure` omitted for unresolved binding is shape drift, not a mapped sysexit | `AGENTS.md:142-158` | param | — | — |
| 22 | `ocx lock --check`: exit 0/65/78, offline | `AGENTS.md:159` | no | — | — |
| 23 | Root flags before subcommand: `--format json --project <toml>` | `AGENTS.md:160` | no | — | — |
| 24 | Full sysexit table, 12 codes, each with retry/no-retry and reachability notes | `AGENTS.md:161-178` | no (numbers are ocx's) but the **pattern** (a pinned, tested exit-code contract) is `yes` — mirrors the sibling rust-quality/python-quality "pinned exit-code contract" convention exactly | — | — |
| 25 | Config precedence ladder (system → user-config-dir → `$OCX_HOME` → managed-config snapshot → `OCX_CONFIG` → `--config`), incl. a documented Windows gap (drive-relative `/etc` path, not watched) | `AGENTS.md:179-185` | **yes** — the ladder *shape* (flag > env > file-tiers > default) is a portable repo-rule config-precedence idiom | — | Windows gap explicitly called "documented gap, not an absent tier" — no test |
| 26 | Sigstore trusted-root 6-rung ladder; rung 3 pruned by `no_config`, rungs 2/4 not | `AGENTS.md:186-200` | param | "Re-verify on every bump" (procedural, in update-dist skill) | Two of six rungs fail open per starlark.md — see row 33 below |
| 27 | `[patches]` is a site-config-only tier, invisible in `package install` JSON, `lock --check` never covers it | `AGENTS.md:201-210` | no | — | — |
| 28 | `OCX_ENV_CLASSES`: one table keyed by var name, 4 classes (site/translucent/explicit/pinned), replacing "four structures that can disagree" | `AGENTS.md:211-249` | **yes** — "classify env vars once in one table, not scattered lists" is a directly reusable Starlark-authoring pattern (see [Patterns](#patterns-worth-encoding)) | — | — |
| 29 | `task verify` = lint + unit tests + examples; run after any change | `AGENTS.md:253` | no (task-runner specific) | Is itself the verification for everything above it | — |
| 30 | `bazel test //...` = unit tests (no network) + docs freshness | `AGENTS.md:254` | **yes** — pattern: fold docs-freshness into the same target as unit tests | `bazel test //...` | — |
| 31 | Examples are integration tests against the **live** registry; only `examples/package` exercises `ocx.policy()`, and only its acceptance, not its weakening effects | `AGENTS.md:255-260` | no | — | Explicit, named test gap: policy weakening (`allow_unverified=True`/`allow_yanked=True`) has **no** end-to-end coverage |
| 32 | `bazel run //docs:update` regenerates stardoc; CI `diff_test`s the committed output | `AGENTS.md:261` | **yes** — portable docs-freshness pattern | `bazel run //docs:update` / CI diff_test | — |
| 33 | Conventional Commits; never push; never commit to `main` | `AGENTS.md:263-264` | no (repo workflow, not Bazel) | — | — |
| 34 | buildifier is not yet in the ocx catalog → `buildifier_prebuilt` dev dependency | `AGENTS.md:273` | param — "some Bazel-ecosystem tools aren't (yet) provisionable through the same tool manager; fall back to the ruleset's own dev-dependency mechanism" | — | — |
| 35 | AGENTS.md is single source of truth; CLAUDE.md stays a 1-line shim | `AGENTS.md:296-298` | no (harness convention) | — | — |
| 36 | `.claude/rules/` holds focused procedure docs, auto-loaded by Claude Code | `AGENTS.md:299-301` | no | — | — |
| 37 | Non-interactive shell flags (`cp -f`, `rm -f`, `apt-get -y`) to avoid hanging agents | `AGENTS.md:302-303` | no | — | — |
| 38 | (starlark.md) Public API = `defs.bzl` + `extensions.bzl`; everything else under `ocx/private/` unloadable | `starlark.md:3-5` | **yes** — the `//pkg:public.bzl` + `pkg/private/` visibility split is a standard Bazel-library idiom | Bazel visibility enforcement (implicit, not named as a check) | No `bazel query` named to assert private symbols aren't loaded externally |
| 39 | (starlark.md) Every public symbol carries a docstring; stardoc renders `docs/`; drift fails `bazel test //docs/...` | `starlark.md:6-8` | **yes** | `bazel test //docs/...` | — |
| 40 | (starlark.md) buildifier-clean gate; attribute docs on every attr | `starlark.md:9` | **yes** | `task format` / CI check (named, not inlined as a command) | — |
| 41 | (starlark.md) Repository rules own all host/env interaction: `repository_ctx.getenv` for every var consulted, `watch()` on every label read | `starlark.md:10-12` | **yes** — core Bazel repository-rule correctness rule | — | No grep/query named to enumerate "every env var consulted" and confirm each has a matching `getenv`/`watch()` |
| 42 | (starlark.md) Parse only documented `--format json` shapes; never parse plain text or read `OCX_HOME` layout directly; 3 named, justified exceptions | `starlark.md:13-24` | **yes** — "wrap a CLI's structured output, never its prose, with named/justified exceptions" generalizes | — | The 3 exceptions are themselves unavoidable hard-codes that "fail open" (no error on drift) |
| 43 | (starlark.md) `manifest_sha256()` hard-codes upstream's `dist/<sha256>.json` naming convention outside the CLI entirely; fails open | `starlark.md:25-31` | param | "Re-verify list" (procedural, in update-dist skill) | — |
| 44 | (starlark.md) Map ocx sysexits to `fail()` naming the user-fixable command, e.g. exit 65 → run `ocx lock` | `starlark.md:32-33` | **yes** | — | — |
| 45 | (starlark.md) `analysistest`'s `expect_failure` can pass vacuously when the expected fragment also appears at the test's own call site (traceback echoes source lines); hold the fragment in a constant the call site can't spell, and confirm the test goes red when the guard is removed | `starlark.md:34-39` | **yes — a genuine, portable Bazel-testing gotcha, independent of ocx** | "confirm the test fails when the guard is removed" (a stated procedure, not a command) | This is exactly the kind of trap a `bazel-quality` rule should ship verbatim |

**Reading the ledger**: 18 of 45 rows (40%) are marked portable outright, another 8 (18%) portable-once-parameterised — so a little over half of AGENTS.md/starlark.md's normative content is raw material for a portable Bazel rule, not ocx-specific plumbing. But only 14/45 rows (31%) name any verification at all, and of those, most point *outward* (to `task verify`, a sibling skill, or a "re-verify by hand" procedure) rather than carrying an inline command the way the frame's shipped-artifact constraint demands. Row 45 (the `analysistest` gotcha) is the strongest single candidate for verbatim reuse: portable, mechanism-independent of ocx, and already phrased as a trap with a check.

## 3. Sibling lore rule-set overlap surface

Frontmatter globs (`grep -n paths: -A6`, then each file's own `- "**/…"` lines):

| Rule set | Globs |
|---|---|
| `rust-cargo.md` | `**/Cargo.toml`, `**/clippy.toml`, `**/rustfmt.toml`, `**/deny.toml`, `**/rust-toolchain.toml` |
| `python-packaging.md` | `**/pyproject.toml`, `**/uv.lock` |
| `typescript-packaging.md` | `**/package.json`, `**/tsconfig*.json`, `**/eslint.config.*`, `**/biome.json`, `**/biome.jsonc` |
| `rust-quality.md` | `**/*.rs` |
| `python-quality.md` | `**/*.py` |
| `typescript-quality.md` | `**/*.ts`, `**/*.tsx`, `**/*.mts`, `**/*.cts` |

`grep -n -i -E "bazel|build system|lockfile|hermetic|reproducib|cache|caching|CI"` over all six (808 ln total): **zero** hits for "bazel", "build system", "hermetic", or "reproducib" anywhere. Every hit is CI/lockfile/cache language about the *sibling ecosystem's own* tooling:

| File:line | Rule | Overlap surface a Bazel rule must not duplicate |
|---|---|---|
| `rust-cargo.md:125` (CI-04) | Every `cargo` invocation in CI carries `--locked` | The Bazel analogue is `bazel mod deps --lockfile_mode=error` / `MODULE.bazel.lock` verification — same *shape* (fail if the lockfile doesn't pin what's resolved), different mechanism. A `bazel-quality` rule states the Bzlmod-lockfile version of this once; it must not re-litigate `--locked` for Cargo. |
| `rust-cargo.md:130` (CI-09) | `Swatinem/rust-cache` restricted to `save-if: main` | Direct conceptual twin of rules_ocx's PR-vs-push remote-cache split (`.github/actions/remote-cache/action.yml:29-36` — read-only on PR, write on push). Bazel's guide should state the cache-write-scoping pattern generically; the Cargo-cache-action specifics stay in `rust-cargo`. |
| `python-packaging.md:38` (PY-PKG-05) | Lockfile committed and verified in CI: `uv lock --check` | Bzlmod's own "lockfile is stale" is `bazel mod deps --lockfile_mode=error`(analogue of `ocx lock --check`'s exit 65, `AGENTS.md:159`). Same pattern name ("lockfile-check gate"), not the same command — a Bazel rule references the pattern, never re-derives uv's semantics. |
| `typescript-packaging.md:95` (TS-PKG-13) | Exactly one lockfile kind per workspace, matching `packageManager` | If a Bazel repo also builds via `rules_js`/`rules_ts`, that repo's `package-lock.json`/`pnpm-lock.yaml` choice is `typescript-packaging`'s territory already — a Bazel-side rule that also globs `package.json` would double-load context on every edit (the frame's own open question). |
| `rust-quality.md:68` (rule 18) | Durable-write helper for any write to "a cache, lockfile, or install tree" — temp file in the target's parent, sync, rename, never truncate in place | Generic durable-write discipline; a Bazel repository-rule's own writes into `OCX_HOME`/`bazel-out` should point at this rule rather than restate it. |

**Net overlap risk**: none of the six sibling files says anything about Bazel today, so there is no existing duplication to fix — but every lockfile/CI-cache row above is a *pattern* a Bazel rule will need its own instance of (bzlmod lockfile, remote-cache read/write split, durable writes into the output base), and the naming discipline (`BZL-` prefix, distinct rule IDs) is what keeps a future editor from re-deriving `--locked` under a Bazel label.

## 4. Bazel as a consumer of ocx — the contract

Every documented commitment about a **Bazel rule or GitHub Action embedding `ocx`**, file:line, from `ocx/website/src/docs/**` and `rules_ocx`'s own contract section:

| Commitment | File:line |
|---|---|
| `ocx package exec`'s first argument is an OCI identifier; it never reads `ocx.toml`/`ocx.lock`, so behavior is directory-independent — "the right primitive for embedding in … Bazel rules" | `ocx/website/src/docs/faq.md:67` |
| Resolving a bare tag deterministically *without* a lockfile — "the GitHub Actions and Bazel case" — needs a bundled frozen index snapshot via `OCX_INDEX` | `ocx/website/src/docs/docker.md:81` |
| A local index subtree (root docs + dispatch objects, no layer archives, no binaries) is "small enough to ship *inside* a tool release. Bazel Rules, GitHub Actions, and DevContainer Features can bundle a frozen copy at release time and set `OCX_INDEX`" | `ocx/website/src/docs/in-depth/indices.md:319` |
| Same bundled-index commitment restated | `ocx/website/src/docs/in-depth/versioning.md:143`, `ocx/website/src/docs/in-depth/storage.md:193`, `ocx/website/src/docs/user-guide.md:313`, `:718` |
| `[env]`'s existence is justified by argv-array callers with no shell-prefix mechanism: "a GitHub Action, a Bazel rule, or a Python subprocess call" | `ocx/website/src/docs/reference/env-composition.md:137`, `:261`; `ocx/website/src/docs/user-guide.md:467`, `:494` |
| `--env KEY:path=…` exists specifically because an argv-building caller "has no way to splice `$PATH`… into a value it constructs" | `ocx/website/src/docs/user-guide.md:494` |
| Unsigned Windows shim (~138 KiB x86_64) is "fully functional" for "backend-automation use (CI, Bazel, devcontainers)"; SmartScreen friction is interactive-only | `ocx/website/src/docs/user-guide.md:241` |
| Starlark is named as Bazel's/Buck2's embedded config language when documenting OCX's own `tests/smoke.star` scripting host — deterministic, no `while`, empty sandbox by default | `ocx/website/src/docs/authoring/testing.md:153` |
| `target_platform` is named (not `host_platform`) specifically because "Bazel-style terminology distinguishes host from target" — naming precedent only, not a build commitment | `ocx/website/src/docs/reference/script-host-api.md:76` |
| **`ocx package test` runs starlark-rust in the real Bazel `.bzl` dialect** for package smoke tests — a genuine shared-runtime commitment, not just a naming echo | `ocx-contrib/.claude/skills/create-mirror/references/starlark-api.md:15` |
| `bazel`, `bazelisk`, `buildifier`, `buildozer` are themselves distributed as OCX packages (`ghcr.io/ocx-contrib/bazelbuild/*`), raw binaries, bundled-JRE build only (`bazel_nojdk-*` deliberately excluded — would need an undeclared host-JVM dependency) | `ocx-contrib/mirror-bazelbuild/bazel/mirror.yml:1-30`; decision rationale at `ocx-mirror/.claude/artifacts/plan_mirror_capability_cut.md:143-148` |
| `bazel-lsp` is mirrored too, in a sibling repo | `/home/mherwig/dev/ocx-contrib/mirror-bazel-lsp/bazel-lsp/` |
| rules_ocx's own two-tier ocx CLI contract (JSON shapes, sysexit table, env classification) is the **authoritative parse surface** any Bazel repository rule wrapping `ocx` must honor | `rules_ocx/AGENTS.md:103-249` (full text in [§2](#2-agentsmd--starlarkmd-normative-ledger)) |

**Where docs and code disagree**: none found — the website docs consistently describe the bundled-index / argv-composition pattern that `rules_ocx`'s own AGENTS.md then implements (project/package tiers calling `ocx --format json env`), and no website passage contradicts a rules_ocx invariant. The one soft tension is that the website markets "Bazel Rule" as an established embedding target (`user-guide.md:313`, `faq.md:67`) while `rules_ocx` is the *only* such rule in the fleet and is version-pinned to `ocx >= 0.6.0` specifically — i.e. the marketing copy is ahead of, but not contradicted by, the one implementation that exists.

## Smells (ranked)

1. **69% of the AGENTS.md/starlark.md ledger carries no inline verification** (31/45 rows, [§2](#2-agentsmd--starlarkmd-normative-ledger)) — directly in tension with the frame's own shipped-artifact constraint ("every rule carries a verification… states which way empty output reads"). The source material the authoring pass will mine is mostly narrative, not machine-checked; expect to *write* verifications, not extract them.
2. **Three stale-looking git worktrees sit as top-level sibling directories** (`ocx-sion`, `ocx-soraka`, `ocx-evelynn` — worktrees of `ocx`; `index-claims` — worktree of `index`), inflating any naive fleet-wide grep by ~1.75× (388 raw vs 221 after exclusion). Not Bazel-specific, but anyone re-running the axis-1 command without knowing this will over-count. Outside this audit's scope to clean up (read-only, output-file-only mandate); flagging for the owner's worktree-hygiene pass.
3. **The frame's own line-count (5,855) is unreproducible byte-for-byte** — this audit's identical-intent `find`+`wc -l` gets 5,851. A 4-line drift is immaterial but means "headline numbers" in the frame itself weren't pinned to a literal re-runnable command; this audit's are (§ Headline numbers).
4. **Two config-tier watches "fail open" by rules_ocx's own admission**, with no test catching drift: `ambient_config_paths()` and `sigstore_trust_root_path()` (`starlark.md:16-24`, restated as an unclosed gap in `update-dist/SKILL.md:155-169`). A relocated upstream convention silently stops covering anything — this is documented risk, not a hidden one, but it's real and unmitigated today.
5. **One invariant (5) carries more prose than the other four combined** (`AGENTS.md:73-101`, 29 lines) and encodes a genuinely subtle consent-stamping side effect with an open upstream issue (`ocx-sh/ocx#400`) as its resolution path. A rule this load-bearing with zero inline verification is the single highest-risk row in the ledger.
6. **The fleet-wide grep for "bazel" structurally misses the fleet's largest concrete Bazel-consumer fact**: `bazel`/`bazelisk`/`buildifier`/`buildozer`/`bazel-lsp` are OCX packages, but `mirror.yml`/`metadata.json`/`CATALOG.md` files live outside `.claude/`/`.agents/`, so no amount of grepping AI-config directories finds them. Any later map/glob decision that assumes "grep the AI-config dirs" will under-count Bazel-toolchain-as-package facts specifically.
7. **`OCX_ENV_CLASSES`'s "one table, not four structures that can disagree" pattern** (`AGENTS.md:211-249`) is exactly the kind of thing a `bazel-quality` rule should hold up as a positive example — but it currently only exists as ocx-specific prose, with no generic phrasing anywhere in the fleet. Worth lifting almost verbatim.

## Patterns worth encoding

1. **The Bazel `.bzl`-dialect statement-position trap** (`ocx-contrib/.claude/skills/create-mirror/references/starlark-api.md:13-58`): no top-level `if`/`for`/`while` *statements* — only expressions, assignments, `def`, `load()` are legal at module scope; a top-level `if` is a **parse-time** failure that reds every target at once. Confirmed as "a real bug class for this mirror fleet (a top-level `for` and later a top-level `if` both shipped broken)" — i.e., hit twice in production, independent of rules_ocx. The two legal workarounds (if-*expression* ternary; `def` + top-level call) are given with code. This is portable, mechanism-independent, and field-tested — a strong candidate for the shipped `bazel-quality` Starlark section, verbatim or near-verbatim.
2. **The `analysistest`/`expect_failure` vacuous-pass trap** (`rules_ocx/.claude/rules/starlark.md:34-39`): a Starlark failure's traceback echoes each frame's source line, so an expected-fragment string that also appears at the test's own call site matches the echo instead of the guard. Fix: hold the fragment in a constant the call site can't spell, and require every guard test be seen red once. Genuinely Bazel-testing-specific, not ocx-specific.
3. **One classified table over four scattered structures** (`AGENTS.md:211-249`, `OCX_ENV_CLASSES`): when a repository rule handles N environment variables with M different behaviors, encode it as one table keyed by variable name with a class column, not N ad-hoc lists/dicts that can silently drift apart. Directly reusable as a general "environment classification" authoring pattern for any module extension/repository rule pair.
4. **Sysexit-to-`fail()` mapping with retry semantics stated per code** (`AGENTS.md:161-178`, `starlark.md:32-33`): every exit code reachable from a repository rule gets a `fail()` naming the exact user-fixable command; retryable codes are named explicitly (75) and a code deliberately never reached from a repo rule is called out and *why* (82). This is the same shape as the sibling rust-quality/python-quality "pinned exit-code contract" — evidence the pattern generalizes across the whole fleet's AI config, not just Bazel.
5. **Root-only tag class enforced by `fail()`, against ecosystem convention** (`research_bazel-policy-surfaces.md:12`, `adr_0001:109-121`): most sampled bzlmod rulesets *silently ignore* a non-root customization of a root-only tag; rules_ocx `fail()`s instead, deliberately, because "a dependency's `ocx.policy(verify = False)` must be loud, not silently dropped." Worth stating as an explicit choice point in the shipped rule: silent-ignore is the ecosystem default, but a security-relevant tag should fail loud.
6. **CI cache-scope split by trust boundary** (`.github/actions/remote-cache/action.yml:17-36`; `ci.yml:98-99`, `171-172`): write-authorized remote cache only on `push` to `main`, read-only (`--remote_upload_local_results=false`) on PRs/forks; two jobs (BCR-parity, offline-determinism) *deliberately* run with no cache at all because a cache hit would mask exactly what they're proving. This is a directly reusable "when to turn caching off on purpose" pattern for the RBE/caching topic in the frame's artifact set.
7. **A three-generation blocklist-defeat narrative as a teaching case study** (`dist-snapshot.md:40-53`, `update-dist/SKILL.md:58-86`): a URL-traversal guard evolved from bare `startswith()` (defeated by dot-segment normalization on GitHub's server) to `startswith` + `..`-refusal (defeated by four more payload classes at once: backslash, `%5c`, extra segment, `%2f`) to a full allowlist regex + raw-path `startswith` + explicit `..` refusal. Excellent worked example for any "why allowlist beats blocklist" guidance in the Bazel repository-rule / mirror-authoring space, fully cited with exact defeating payloads.

## Contradictions of the frame

1. **"The only Bazel repository in the fleet is `rules_ocx`" is too narrow once Starlark (not the BUILD-file build system) is counted.** `ocx-contrib`'s `create-mirror` skill documents package smoke tests (`tests/smoke.star`) that run **starlark-rust configured to the actual Bazel `.bzl` dialect** — real Bazel-dialect Starlark, hit by real production bugs, with zero relationship to Bazel-the-build-system. A "Bazel expertise" program that only reads `rules_ocx` misses the fleet's second, independently-discovered source of Starlark-dialect gotchas.
2. **Bazel already has toolchain provisioning solved in this fleet, just not through `rules_ocx`.** `bazel`, `bazelisk`, `buildifier`, `buildozer`, and `bazel-lsp` are already OCX packages (`ocx-contrib/mirror-bazelbuild`, `ocx-contrib/mirror-bazel-lsp`), shipped and versioned independently of the module extension `rules_ocx` provides. If the per-language guides assume "provision Bazel's own tools via `rules_ocx`," that's contradicted by an existing, working, orthogonal mechanism (OCX mirrors + a Bazel repository rule pointed at `ocx.sh` directly, or plain `bazelisk`).
3. **The frame's implicit assumption that Bazel-authoring AI config lives under `.claude/`/`.agents/` is false for the fleet's most concrete Bazel-consumer artifact.** The `mirror.yml`/`metadata.json` package definitions that make `bazel` itself an OCX package live at the repo root of `ocx-contrib/mirror-bazelbuild/*`, invisible to every grep this audit's axis 1 instructs. A map/glob decision for the shipped rule set should not assume AI config is the only place Bazel-relevant fleet knowledge lives.
4. **No evidence supports the hypothesis that "the real pain points live in blog posts and migration retrospectives, not the official docs" — this audit found no blog/talk citations anywhere in the fleet's existing config to test that hypothesis against.** `research_bazel-policy-surfaces.md` cites `bazel.build` docs, a GitHub discussion, and one EngFlow blog post — a 4:1 official-to-blog ratio, the opposite direction from the hypothesis, though the sample (one research note) is too small to generalize from confidently.
5. **The frame states rules_ocx has "No remote execution."** Confirmed independently: no `--remote_executor` flag anywhere in `.bazelrc`, `.bazelrc.user`'s existence-only check, or any CI workflow. Not a contradiction — corroboration — but worth stating plainly since it's the one frame claim this audit could fully verify end to end.

## Gaps

Frame candidate concerns with **zero** existing config anywhere in the fleet (checked via the same grep/find passes above; a concern not listed here had at least the mentions already cited):

- Bzlmod migration and lockfile hygiene *for adopting a new repo into Bazel* — the fleet's only Bzlmod usage is `rules_ocx` itself, already Bzlmod-native from birth; no migration-*from*-WORKSPACE artifact exists anywhere.
- Repository-rule hermeticity beyond what rules_ocx documents about its own fetches (`getenv`, `watch`, unsandboxed fetches) — no *general* hermeticity guidance independent of the ocx-specific case exists.
- Hermetic toolchains (cc autodetection, host Python, host Node) — the frame's own flagged finding (`.bazelrc.user`'s zig-wrapper `CC` override, `layering_check` disabled) is the *only* toolchain-hermeticity data point in the fleet, and it's a host-specific workaround, not documented guidance.
- Windows-specific Bazel guidance beyond the two `.bazelrc` lines (`--windows_enable_symlinks`, `--enable_runfiles`) and the one documented config-tier gap (drive-relative `/etc` path).
- IDE/LSP support under Bazel (rust-analyzer, Pyright, tsserver) — zero mentions; `bazel-lsp` exists as a mirrored *package* (§4) but nothing documents wiring it to an editor.
- BUILD generation with Gazelle — zero mentions anywhere in the fleet.
- Target determination in CI (`bazel-diff`, target-determinator) — zero mentions; rules_ocx's CI runs full matrices, not diff-scoped.
- Test size, sharding, flakiness, `--runs_per_test` — zero mentions.
- BwoB and `--remote_download_*` — zero mentions (no RBE at all, per the corroborated frame claim above).
- Action-key determinism (timestamps, absolute paths, `PYTHONHASHSEED`, archive metadata) — zero mentions.
- Cache poisoning from untrusted PRs *in the Bazel-cache sense* — rules_ocx's PR cache is read-only by construction (`--remote_upload_local_results=false`), which is a mitigation but not a documented *concern*; no prose names the threat model.
- `select()` explosion, macros vs. rules vs. symbolic macros — zero mentions.
- Buildifier-warnings-as-a-taxonomy — buildifier is used (gate, `AGENTS.md:9`) but no file catalogs its warning classes.
- `--incompatible_*` flag churn between Bazel 8 and 9 — zero mentions anywhere, despite `rules_ocx`'s own CI matrix running 8.7.0/9.x/rolling.
- JVM memory and analysis-time performance — zero mentions.
- Dual-build-system migration (Cargo/uv/pnpm alongside Bazel) — zero mentions; nothing in the fleet runs two build systems side by side today.
- Buck2/Pants as a comparison set — zero mentions in any AI-config file (Buck2 appears once, in `ocx/website/src/docs/authoring/testing.md:153`, only as "Starlark is also used by Buck2," not a comparison of build systems).
