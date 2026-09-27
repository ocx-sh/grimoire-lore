---
title: code-docs audit — decision records, tests, git history, path-scoped rules
agent: research-lang subagent (code-docs-audit)
model: claude-sonnet-5
scope: fleet-wide audit of the "why" stores outside inline comments — decision records, code↔record pointers, test naming, git history, path-scoped rules — across the 21-repo real fleet under /home/mherwig/dev
method: >
  Read-only. Filesystem scans via `find` + `git -C <repo> ls-files` (tracked-file
  truth respects .gitignore and skips submodules); pattern extraction and
  classification via ad-hoc Python (no shared library beyond stdlib re/csv/json);
  git history via `git log --pretty=format:...`. Exact commands are inlined next
  to each result below. Scripts used are named in each section; all live under
  `/tmp/claude-1000/.../scratchpad/code-docs-audit/` (session-local, not part of
  this repo). comment_census.py (the shared classifier) was not re-run here —
  the comment:code ratio is the frame's domain (code-docs-frame.md); this audit
  covers records/tests/history/rules only.
date_researched: 2026-09-27
---

# code-docs audit: decision records, tests, git history, path-scoped rules

## Contents

1. [Headline numbers](#headline-numbers)
2. [Decision-record stores per repo](#1-decision-record-stores-per-repo)
3. [Code → record](#2-code--record)
4. [Record → code (rename rot)](#3-record--code-rename-rot)
5. [Tests as documentation](#4-tests-as-documentation)
6. [Git history as a store](#5-git-history-as-a-store)
7. [Path-scoped agent rules as a store](#6-path-scoped-agent-rules-as-a-store)
8. [Smells (ranked)](#smells-ranked)
9. [Patterns worth encoding](#patterns-worth-encoding)
10. [Contradictions of the frame](#contradictions-of-the-frame)
11. [Gaps](#gaps)

## Headline numbers

- **15/21** fleet repos have at least one decision-record artifact (ADR/plan/ruling/subsystem doc); 6 (`find_ocx`, `setup-ocx`, `setup-grimoire`, `grimoire-index`, `bob`, `grimoire-lore`'s own repo beyond `.claude/state`) have none.
- **ocx**: 96 tracked ADRs (median 443 lines, max 2,899), 33 tracked plans, 14 subsystem docs — all 100% tracked. **arcana**: 23 tracked ADRs, 100% tracked, cleanest store in the fleet.
- **7,608** short decision-ID references (`C-`/`WP-`/`DEC-`/`DX-`/`RUL-`/`ADR-` + digits) in ocx's tracked source (365 files); **2,597** in arcana's; **893** in grimoire's. The same anti-pattern criticized in ocx exists fleet-wide.
- Sampled 30 distinct `C-NNN` IDs referenced in ocx `crates/`: **0/30** resolve to exactly one tracked document; all 30 appear in ≥2 tracked `.md` files, several (`C-011`, `C-012`, `C-018`) in 20–32 files each, and `C-011` is spot-verified to name **at least 4 unrelated decisions** across those files.
- 15-record rename-rot sample: **76/169 (45%)** of code paths cited by decision records no longer exist at the cited path, concentrated in one structural refactor (the `ocx_lib` crate split) that invalidated several ADRs' path citations at once.
- Git history: ocx commit bodies have a **median of 17 lines** and 92% of the last 300 commits carry a body; `backup/*-prefinalize` / `*-presquash` refs exist and are the actual mechanism that keeps pre-rewrite history reachable.
- Test names are overwhelmingly full-sentence behaviour descriptions fleet-wide (manually verified in ocx and grimoire, e.g. `an_unfinished_setup_on_a_completed_swap_names_the_exit`), and a subset of guard-like comments sit **directly on a `#[test]` function's own doc comment** — the guard and its proof are the same unit.
- `docs-and-tracing.md` still carries no `paths:` frontmatter in ocx today (`.claude/rules/rust-quality/docs-and-tracing.md`) — the prior critique's objection #7 is re-verified, unresolved.

## 1. Decision-record stores per repo

Method: `find <repo> -type f -iname 'plan_*.md' -o -iname 'adr_*.md' -o -iname '*ruling*.md' -o -iname 'subsystem*.md'` plus a search for `adr/adrs/decisions/.adr` directories and `.claude/state/`, each path checked with `git -C <repo> ls-files --error-unmatch <path>` for tracked status. Script: `demand1_records.tsv` build (inline in this session) + `format_scan.py` for status/format fields. **Correction applied**: arcana's first pass counted 113 "ADRs"; 90 of those were an untracked dogfood clone of `ocx-sion` sitting at `arcana/.tmp/dogfood/ocx-sion/.claude/artifacts/*.md` — plain `.tmp/` (no dash) isn't covered by the fleet's stated `.tmp-*` exclusion pattern. Excluded by hand below; **this is itself a finding**, see Smells.

| Repo | Location(s) | Count | Tracked | Median lines | Max lines |
|---|---|---:|---:|---:|---:|
| ocx | `.claude/artifacts/adr_*.md` | 96 | 96/96 | 443 | 2,899 |
| ocx | `.claude/artifacts/plan_*.md` | 33 | 33/33 | 248 | 4,724 |
| ocx | `.claude/rules/subsystem-*.md` | 14 | 14/14 | 240 | 686 |
| ocx | `.claude/artifacts/rulings_*.md` | 1 | 1/1 | 833 | 833 |
| arcana | `.agents/adrs/adr_NNNN_*.md` | 23 | 23/23 | 819 | 2,599 |
| arcana | plans (various) | 16 | 16/16 | 586 | 1,564 |
| grimoire | `.agents/adr/adr_*.md` | 41 | 41/41 | 247 | 1,315 |
| grimoire | plans | 32 | 32/32 | 318 | 1,297 |
| grimoire | subsystem docs | 8 | 8/8 | 120 | 693 |
| ocx-mirror | `.claude/artifacts/adr_*.md` (own) | 15 | 15/15 | — | — |
| ocx-mirror | `external/ocx/.claude/artifacts/*` (ocx submodule at `v0.6.3`, pinned `51f35e1`) | 96 | n/a (submodule, not walked by `ls-files`) | 436 | 2,899 |
| ocx-mirror | plans (own) | 47 | 2/47 | 240 | 4,724 |
| index | `.claude/artifacts/adr_*.md` | 8 | 8/8 | 471 | 745 |
| ocx-catalog | ADR/plan/subsystem | 1/1/4 | 1/0/4 | 89–351 | — |
| ocx-indexbot | ADR/plan | 1/1 | 1/1 | 163/306 | — |
| grimoire-vscode | ADR/plan | 2/4 | 2/0 | 257/317 | — |
| vscode-ocx | ADR/plan/subsystem | 2/1/4 | 2/1/4 | — | — |
| creeptd-ng | plan/subsystem | 4/7 | 4/7 | 110/77 | — |
| rules_ocx | ADR/plan | 1/1 | 1/1 | 382/354 | — |
| kate-middlechild | ADR-dir/plan/subsystem | 1/1/7 | 1/1/7 | — | — |
| ocx-sdk-python, ocx-mirror-sdk | subsystem only | 2 each | 2/2 each | ~95 | — |
| find_ocx, setup-ocx, setup-grimoire, grimoire-index | none | 0 | — | — | — |

`.claude/state/`: every repo that has one carries only agent bookkeeping (`subagents.jsonl`, `plans/` — usually empty at rest) and is gitignored fleet-wide, verified for ocx: `.gitignore:39` = `.claude/state/`. ocx-mirror is the outlier with 31 files at `.claude/state/` (median 302 lines) — heavier local scratch than any other repo, all untracked.

**Format** (`format_scan.py`, regex over 444 tracked ADR/ruling files): 361/444 (81%) combine MADR's `## Decision Drivers` with Nygard's `## Context`/`## Decision` headers — a fleet-wide **custom MADR/Nygard hybrid**, not either textbook format. 52 are Nygard-only, 28 are fully free-form, 3 are MADR-only.

**Status**: of 444 records, 168 "Accepted", 94 "Proposed", 14 explicit "Superseded", 67 have no status line at all (mostly plans/rulings, which don't use the ADR template). An explicit `Supersedes:`/`Superseded By:` field exists in 336/444; 230 of those are `N/A`, and **106 name a real predecessor or successor document** — e.g. `ocx:.claude/artifacts/adr_infrastructure_patches.md:1` supersedes the shipped `adr_two_env_composition.md`. Lifecycle tracking is real, not decorative, for about a quarter of the corpus.

## 2. Code → record

Method: `scan_refs.py` — walks `git -C <repo> ls-files`, filters to source extensions, regexes for (a) short IDs `\b(C|WP|DEC|DX|RUL|ADR)-[0-9]+[a-z]?\b`, (b) decision-record filenames (`adr_*.md`, `plan_*.md`, `rulings?_*.md`, `subsystem*.md`, `decisions?_*.md`, `design_spec_*.md`, `handover_*.md`), (c) issue/PR numbers `#[0-9]{2,6}`. First pass walked the filesystem directly and was **badly inflated** by build/scratch dirs not on the fleet's exclusion list (`.vscode-test/` alone added 991M and ~4,100 spurious issue-style hits in grimoire-vscode; `external/` submodule checkouts added ~7,600 spurious hits in ocx-mirror; `.agents/` worktree copies inflated ocx and arcana). Rewritten to enumerate `git ls-files` only — the numbers below are the corrected run.

| Repo | ID-style hits | files w/ ID | filename-style hits | files w/ fileref | issue/PR-style hits |
|---|---:|---:|---:|---:|---:|
| ocx | 7,608 | 365 | 987 | 348 | 957 |
| arcana | 2,597 | 55 | 1 | 1 | 6 |
| grimoire | 893 | 51 | 199 | 94 | 207 |
| ocx-catalog | 361 | 107 | 16 | 15 | 25 |
| ocx-mirror (tracked only) | 673 | 96 | 66 | 49 | 129 |
| ocx-sdk-python | 147 | 25 | 0 | 0 | 4 |
| ocx-indexbot | 206 | 66 | 18 | 9 | 9 |
| grimoire-vscode | 57 | 11 | 0 | 0 | 7 |
| grimoire-indexer | 44 | 14 | 1 | 1 | 2 |
| grimoire-lore | 27 | 2 | 0 | 0 | 57 |
| index | 16 | 3 | 6 | 3 | 9 |
| creeptd-ng | 0 | 0 | 58 | 38 | 11 |
| rest (rules_ocx, find_ocx, vscode-ocx, setup-ocx, setup-grimoire, ocx-mirror-sdk, kate-middlechild, grimoire-index, bob) | 0 | 0 | ≤2 each | — | ≤6 each |

**False-positive check** (spot-read ≥3 hits per pattern, as required):
- `\bDX-[0-9]+\b` **without** a word boundary matched `SPDX-2.3` (`ocx:crates/ocx_sign/src/verify/pipeline.rs:6169`) — 2 of 3 first hits were false; fixed by adding `\b`. Word-bounded counts above are clean (spot-checked 5 `\bC-[0-9]+\b` hits at random, e.g. `ocx:crates/ocx_store/src/file_structure.rs:104`, `ocx:crates/ocx_console/src/progress.rs:248` — all genuine).
- One filename-style hit was a false positive from a test fixture, not a real pointer: `arcana:nox/tests/unit/test_workspace.py:552` cites `plan_x.md`, a generic placeholder name in a unit test, not a decision-record reference.
- `C-1429`/`C-1424` etc. in `grimoire:.agents/skills/hex-retro/scripts/retro.py:48,54,78,93,140,1078,1337,1607,1694` looked at first like noise (out-of-range numbers for the `C-NNN` convention seen in ocx) but are genuine plan-contract-ID references — just to a plan that was never committed anywhere in the tracked tree (see Smells).

**Resolution rate**, sampled 30 distinct `C-NNN` IDs from ocx `crates/` (`id_resolution.py`, random seed 42, checked against every tracked `.md` file in ocx): **0/30 resolve to exactly one file**; all 30 appear in 2–32 tracked files. Spot-verified `C-011` names at least four unrelated decisions across its 56 tracked hits: a `PushAccess` field-privacy rule (`ocx:.claude/artifacts/review_plan_index_claim_spec_r3.md:25`), a hardened-`reqwest::Client` SSRF guard (`ocx:.claude/artifacts/plan_real_sigstore_stack.md:135`), a `task schema` regeneration gate (`ocx:.claude/artifacts/plan_extra_ca_certs.md:226`), and a `composer::integrations_cross` decision (`ocx:.claude/artifacts/adr_package_integrations.md:512`) — the same short ID, four different meanings, 45 in-code citations of `C-049` alone across 14 files (`ocx:crates/ocx_shell/src/shell/coexistence.rs:7`, `ocx:crates/ocx_announce/src/claim/owners.rs:4`, `ocx:crates/ocx_package_manager/src/tasks/render_toolchain.rs:31` among them) that a cold agent cannot disambiguate from the code alone.

**Dead pointers, re-verified**:
- `plan_toolchain_activation.md` is cited 27 times across 15 files in `ocx/crates/` (e.g. `ocx:crates/ocx_config/src/env.rs`, `ocx:crates/ocx_package_manager/src/composer.rs`) but the file was renamed to `adr_toolchain_activation.md`; the old name resolves nowhere in the tracked tree. Exactly the prior critique's finding, unchanged.
- `plan_index_v1.md`, referenced from `index:.claude/artifacts/adr_catalog_docs_colocation.md:272,392` as `../state/plans/plan_index_v1.md`, does not exist on disk — `.claude/state/` is gitignored in that repo too, same pattern as ocx's `.gitignore:39`.
- `ocx-indexbot:src/ocx_indexbot/__init__.py:14-15` cites `adr_index_bot_and_workflow_security.md` and `adr_locked_observation_index_format.md`, neither tracked *in ocx-indexbot* — both actually live in the separate `index` repo (`index:.claude/artifacts/adr_index_bot_and_workflow_security.md`). Not dead, but **cross-repo**: unresolvable from ocx-indexbot alone with no fleet-wide index telling an agent where to look.

## 3. Record → code (rename rot)

Method: 15 tracked ADRs sampled across 7 repos (`rename_rot.py`), extracted every backtick-quoted `path/like.ext` token, checked exact existence, then checked whether the same filename exists deeper in the tree (shorthand — doc uses a crate-relative fragment) before calling it truly gone.

| Record | Path mentions | Exact match | Shorthand-resolves | **Truly gone** |
|---|---:|---:|---:|---:|
| `ocx:adr_oci_registry_mirror.md` | 9 | 2 | 0 | **7** |
| `ocx:adr_crate_split_workspace.md` | 50 | 18 | 7 | **25** |
| `ocx:adr_cli_high_low_layering.md` | 9 | 5 | 0 | **4** |
| `ocx:adr_ci_env_export_flag.md` | 4 | 2 | 2 | 0 |
| `ocx:adr_index_claim_command.md` | 33 | 12 | 6 | **14** |
| `arcana:adr_0002_system_design.md` | 6 | 0 | 0 | 2 (rest were cross-doc `../research/*` refs, excluded) |
| `arcana:adr_0019_retro.md` | 7 | 4 | 2 | 1 |
| `arcana:adr_0002_execution_scheduling_recursion.md` | 4 | 0 | 0 | 0 (all cross-doc) |
| `grimoire:adr_catalog_freshness_revalidation.md` | 10 | 5 | 2 | 3 |
| `grimoire:adr_managed_context_block.md` | 3 | 1 | 0 | 2 |
| `grimoire:adr_registry_browse_filters.md` | 10 | 7 | 0 | 3 |
| `ocx-mirror:adr_dist_mirror_sync.md` | 3 | 2 | 0 | 1 |
| `index:adr_catalog_docs_colocation.md` | 14 | 3 | 0 | **7** |
| `ocx-catalog:adr_tooling_and_quality_gate_2026-08-22.md` | 0 | — | — | 0 |
| `ocx-indexbot:adr_forge_neutral_owners.md` | 12 | 1 | 4 | **7** |
| **Total** | **169** (repo-relative only) | 62 | 23 | **76 (45%)** |

**Root cause, not independent rot**: the four worst records (`adr_oci_registry_mirror.md`, `adr_crate_split_workspace.md`, `adr_cli_high_low_layering.md`, `adr_index_claim_command.md`) all cite `crates/ocx_lib/src/...`. That crate **no longer exists** — `ls /home/mherwig/dev/ocx/crates/` today lists `ocx_oci`, `ocx_config`, `ocx_index`, `ocx_announce`, etc., 21 crates, none named `ocx_lib`. One structural refactor (the crate split, itself the subject of `adr_crate_split_workspace.md`) invalidated dozens of path citations across at least four separate decision records simultaneously. `crates/ocx_lib/src/oci/client.rs` (cited by `adr_oci_registry_mirror.md`) has no successor findable anywhere in the current tree by filename. This is a systemic rename-rot mode the cleanup skill should check for directly (grep every tracked ADR for `crates/<removed-crate-name>/` after any crate rename/split), not something a per-record staleness check would catch in isolation.

## 4. Tests as documentation

Method: `extract_tests.py` — `#[test]\n fn NAME`, `def test_NAME(`, `it()/test()` string literals, over `git ls-files`; 40-name random sample per repo (seed 3), heuristically classified (`classify_tests.py`) into behaviour/constraint-named, structure-named (`test_<word>[_<n>]`), or opaque. **The heuristic is a first pass, not a manual read of all 21×40**; ocx and grimoire samples were read by hand to check it.

| Repo | Tests found (total) | Sampled | Behaviour-named | Structure-named | Opaque |
|---|---:|---:|---:|---:|---:|
| ocx | 9,267 | 40 | 37 | 0 | 3 |
| grimoire | 4,078 | 40 | 40 | 0 | 0 |
| ocx-mirror | 1,564 | 40 | 39 | 1 | 0 |
| ocx-indexbot | 1,359 | 40 | 38 | 2 | 0 |
| arcana | 1,453 | 40 | 40 | 0 | 0 |
| grimoire-vscode | 1,018 | 40 | 38 | 1 | 1 |
| creeptd-ng | 917 | 40 | 38 | 2 | 0 |
| ocx-catalog | 922 | 40 | 40 | 0 | 0 |
| grimoire-indexer | 671 | 40 | 40 | 0 | 0 |
| ocx-sdk-python | 671 | 40 | 37 | 3 | 0 |
| kate-middlechild | 280 | 40 | 40 | 0 | 0 |
| setup-ocx | 142 | 40 | 36 | 3 | 1 |
| ocx-mirror-sdk | 136 | 40 | 35 | 5 | 0 |
| vscode-ocx | 78 | 40 | 39 | 1 | 0 |
| rules_ocx | 39 | 39 | 39 | 0 | 0 |
| grimoire-lore | 32 | 32 | 30 | 1 | 1 |
| index | 34 | 34 | 34 | 0 | 0 |
| bob | 21 | 21 | 21 | 0 | 0 |
| find_ocx, setup-grimoire, grimoire-index | 0 | — | — | — | — |

Manually read (not just heuristic) from ocx and grimoire samples confirm the pattern is real: `offline_view_preserves_patch_config` (`ocx:crates/ocx_package_manager/src/tasks/patch_discovery.rs:1921`), `an_unfinished_setup_on_a_completed_swap_names_the_exit` (`ocx:crates/ocx_cli/src/command/self_group/update.rs:228`), `resolve_registries_for_tui_propagates_a_broken_global_config_t4` (`grimoire:src/command/tui.rs:289`), `t2_resolve_cur_dir_component_returns_traversal_attempt` (`grimoire:src/install/path_anchor.rs:1826`). Some names embed a short scenario code alongside the sentence (`de6`, `j6`, `t2`, `t4`, `s012`) — these read as test-matrix case numbers, not decision-record IDs, but the convention is close enough to the `C-NNN` scheme to blur under a quick read.

**Tests naming an ADR/constraint directly**: `s012_a_tool_named_ocx_is_admitted_in_every_ascii_case` (`ocx:crates/ocx_project/src/config.rs:3124`) carries a doc comment that names both `S-012` and `C-015` and explains *why* the assertion checks presence-not-absence. This is the strongest pattern in the sample — see Patterns worth encoding.

**15 guard-like comments vs. tests** (`ocx`, comments matching `must not|must never|SAFETY|invariant|do not|ordering|never `, random sample seed 5, then located the nearest enclosing `fn` and searched the file's `#[cfg(test)]` region for that name):

| Guard citation | Attached to | Test linkage |
|---|---|---|
| `ocx:crates/ocx_project/src/config.rs:3121` | `#[test] fn s012_...` | **is** the test's own doc comment |
| `ocx:crates/ocx_index/src/chained_index.rs:2337` | `#[test] fn tag_present_blob_missing_...` | is the test's own doc comment |
| `ocx:crates/ocx_sign/src/verify/identity.rs:320` | `#[test] fn a_key_only_policy_never_matches_...` | is the test's own doc comment |
| `ocx:crates/ocx_setup/src/lib.rs:1839` | `#[test] fn apply_managed_config_first_...` | is the test's own doc comment |
| `ocx:crates/ocx_shell/src/shell/reconcile/plan.rs:2602` | `#[test] fn the_inked_line_survives_...` | is the test's own doc comment |
| `ocx:crates/ocx_project/src/project_lock.rs:269` | `#[test] fn two_projects_do_not_contend_...` | is the test's own doc comment |
| `ocx:crates/ocx_package_manager/src/tasks/garbage_collection.rs:313` | `#[test] fn reachable_config_blob_..._survives_gc` | is the test's own doc comment |
| `ocx:crates/ocx_store/src/file_structure/package_store.rs:472` | prod fn `record_origin` | referenced 4× in file's `#[cfg(test)]` region |
| `ocx:crates/ocx_announce/src/forge/git_push_options.rs:113` | prod fn `render_option` | referenced 1× in test region |
| `ocx:crates/ocx_package_manager/src/composer.rs:266` | prod fn `compose_companion` | referenced 5× in test region |
| `ocx:crates/ocx_index/src/chained_index.rs:1035` | prod fn `fetch_manifest` | referenced 91× (heavily-used core fn) |
| `ocx:crates/ocx_shim/src/core.rs:470` | prod fn `is_pinned_identifier` (private, 2-clause guard: digest format + no-leading-dash) | **no `#[cfg(test)]` block anywhere in this file** — no unit test found by this method |
| `ocx:crates/ocx_oci/src/copy.rs:487` | inline match-arm comment, not a `fn` signature | method could not attribute a name |
| `ocx:crates/ocx_store/src/file_structure/blob_store.rs:660` | inline comment inside a fn body | method could not attribute a name |
| `ocx:crates/ocx_sign/src/sign/pipeline.rs:106` | inline comment inside a fn body | method could not attribute a name |

7/15 guards are literally a test's own rationale (covered by construction); 4/15 sit on production code with a locally-verified caller in the test module; 1/15 (`is_pinned_identifier`) has no locally-findable test; 3/15 the method couldn't resolve to a function name (inline comments, not attributable — see Gaps).

## 5. Git history as a store

Method: `git_history.py` — `git -C <repo> log -n300 --pretty=format:'\x1e%H\x1e%s\x1e%b\x1d'`, body presence/length, known-trailer detection (`Co-authored-by:`, `Signed-off-by:`, `Reviewed-by:`, `Fixes:`, `Refs:`, `Closes:`), issue/PR-number presence, and a reason-word heuristic (`because|so that|to avoid|to prevent|in order to|since |otherwise|this fixes|the reason|why`). ocx and grimoire both have ≥300 commits; the two smaller repos are `creeptd-ng` (316 total, used 300) and `rules_ocx` (77 total, used all 77 — fewer than 300 exist).

| Repo | Commits sampled | With body | Median body lines (of those) | Known trailer | Issue/PR ref | Reason-word in body |
|---|---:|---:|---:|---:|---:|---:|
| ocx | 300 | 277 (92%) | **17** | 2 (1%) | 69 (23%) | 107 (36%) |
| grimoire | 300 | 281 (94%) | 12 | 234 (78%) | 21 (7%) | 69 (23%) |
| creeptd-ng | 300 | 189 (63%) | 7 | 3 (1%) | 1 (0%) | 17 (6%) |
| rules_ocx | 77 | 58 (75%) | 9.5 | 1 (1%) | 9 (12%) | 11 (14%) |

Sample body carrying a genuine why (`ocx:2691d3c1638e75b7830fcd68784a2d23a66a0802`, `fix(exec): log package exec --rm cleanup instead of printing status lines`): explains that `Removed`/`Kept` lines went through `ui().status`, which bypasses `--log-level` on an interactive terminal, names the fix, and records the verification command run and a known pre-existing failure it doesn't gate on. grimoire's 78% trailer rate is almost entirely `Signed-off-by: Michael Herwig <contact@michael-herwig.de>` (e.g. `grimoire:7b180c40840a946dab25940e04d71dedd440ea3c`), not `Co-authored-by`.

**Flow effects on survival**: `git -C /home/mherwig/dev/ocx for-each-ref 'refs/heads/backup/*'` lists real, currently-armed backup refs — `backup/exec-resolution-record-prefinalize-20260905`, `backup/exec-resolution-record-prerebase-20260904`, `backup/frozen-config-293-prerebase`, `backup/no-consent-presquash`, `backup/oci-sign-verify-pre-rebase`, `backup/main-0.4`, `backup/pre-integrations-rename` among 10+ others. These confirm the fleet's rewrite flows (`hex-finalize`, pre-rebase, pre-squash) are real and frequent enough to need a standing backup-ref convention (`hex-state.md`'s "armed backup ref" check exists for exactly this). **What this means for the "why" store**: history a task-checkpoint amend or hex-finalize rewrite discards from the branch tip is not gone — it is reachable from the matching `backup/*` ref — but only for as long as that ref stays armed, and only if an agent knows to look there; the rewritten branch tip's own `git log` will not show it.

## 6. Path-scoped agent rules as a store

Method: `scan_rules.py` — every tracked `.claude/rules/**/*.md` (and `rules/**/*.md`) file, YAML frontmatter parsed for a top-level `paths:` key.

| Repo | Rule `.md` files | With `paths:` glob | Median size (glob'd) | Max size |
|---|---:|---:|---:|---:|
| ocx | 261 | 42 | 167 | 687 |
| ocx-mirror | 210 | 20 | 141 | 366 |
| grimoire-lore | 184 | 17 | — | — |
| grimoire | 130 | 35 | 134 | 694 |
| creeptd-ng | 22 | 16 | — | — |
| grimoire-indexer | 26 | 3 | — | — |
| index | 23 | 8 | — | — |
| kate-middlechild | 20 | 14 | — | — |
| vscode-ocx, ocx-catalog, ocx-sdk-python | 12–13 each | 10 each | — | — |
| ocx-mirror-sdk | 14 | 10 | — | — |
| ocx-indexbot, bob | 15/21 | 2 each | — | — |
| grimoire-vscode | 8 | 6 | — | — |
| rules_ocx, find_ocx, setup-ocx, setup-grimoire, arcana, grimoire-index | 0–5 | 0 | — | — |

Content: path-scoped rules split cleanly into **subsystem invariants** (`ocx:.claude/rules/subsystem-cli.md` — `paths: [crates/ocx_cli/src/**]`, "Thin CLI shell. Use clap at `crates/ocx_cli/src/`...") and **language/quality conventions** (`arch-principles.md`, `docs-quality.md`, `python-quality.md`, etc., globbed on their language's extensions).

**Code pointing at a rule file**: yes, and concretely — `grimoire:.claude/hooks/post_tool_use_tracker.py:32-35` names `subsystem-file-structure.md`, `subsystem-cli-commands.md`, `subsystem-cli-api.md`, `subsystem-cli.md` by filename (a hook that presumably nudges the agent to re-read the relevant subsystem doc after touching a matching path — the direction this program should reuse: code/tooling that resolves the path-scoped rule for the file just touched, rather than a comment praying an agent remembers to look).

**Re-verified from the prior critique**: `ocx:.claude/rules/rust-quality/docs-and-tracing.md` still has **no `paths:` frontmatter** today — confirmed absent from both ocx's and grimoire-lore's `with_paths_glob` list. It is still a depth file reached only through `rust-quality.md`'s routing table, not loaded automatically on `**/*.rs`. The critique's objection #7 (2026-09-27, same-day prior research) holds unchanged; any DOC-2x amendment this program lands there inherits the same non-auto-load problem unless the frontmatter is added.

## Smells (ranked)

1. **Short decision-IDs collide across unrelated decisions, at scale.** `C-011` names ≥4 different decisions across 56 tracked ocx files; 0/30 sampled `C-NNN` IDs resolve to a single document; 7,608 such references sit in ocx's tracked source alone. This is the single biggest gap between "a decision record exists" (healthy, see Contradictions) and "a comment pointing at one is followed correctly" (not verifiable from the ID alone).
2. **A structural refactor invalidates path citations in bulk, not one at a time.** The `ocx_lib` crate split left 4+ ADRs citing a crate that no longer exists (45% rot rate in the 15-record sample); a cleanup or check that verifies one record at a time will miss that these all point at the same underlying cause.
3. **The fleet's own tooling carries the anti-pattern it will be asked to forbid.** `grimoire:.agents/skills/hex-retro/scripts/retro.py:48,54,78,93,140,...` cites `C-1424`/`C-1427`/`C-1429`/`C-1433`/`C-1434`/`C-1437` — a plan-contract-ID scheme with **zero** tracked defining document anywhere in the repo (`git ls-files | xargs grep -l C-1429` finds only the code file itself, twice, at the `.agents/` and `.claude/` mirrored paths). Whatever plan produced these IDs was never committed.
4. **Cross-repo pointers with no fleet-wide index.** `ocx-catalog:src/theme/utils/cas.ts:16` and `ocx-indexbot:src/ocx_indexbot/__init__.py:14-15` name ADRs that live in a *different* repo (`index`) with no local copy and no fleet-level lookup; "the file this comment names must be tracked" (the prior critique's proposed check) has to be fleet-aware, not per-repo, or it will flag genuine cross-repo pointers as dead.
5. **Untracked full-repo copies inside a repo's own scratch dir break naive fleet counts.** `arcana/.tmp/dogfood/ocx-sion/.claude/artifacts/*` (90 files) is a complete untracked clone of another repo's decision-record store sitting inside arcana, and `.tmp/` (no dash) is not covered by the fleet's stated `.tmp-*`/`.probe-*` exclusion list. A naive `find` over decision records anywhere in the fleet double-counts by this route; `git ls-files`-based methods (used for demands 2, 4, 5, 6 here) are immune, filesystem-`find`-based ones (demand 1) are not.
6. **`docs-and-tracing.md` is still not path-scoped.** Re-verified unchanged from the prior research: no `paths:` frontmatter, reached only through a routing table, so "every agent writing Rust sees it" remains false today.
7. **ocx-mirror's own plans are almost entirely untracked** (2/47 tracked) even though its ADRs and subsystem docs mostly are (15/15, ~1/15) — an inconsistent tracking policy inside one repo, not just across repos.

## Patterns worth encoding

- **Guard-comment-as-test-docstring.** `ocx:crates/ocx_project/src/config.rs:3121-3124` — the doc comment sits directly on `#[test] fn s012_a_tool_named_ocx_is_admitted_in_every_ascii_case()`, names two decision IDs, states the constraint, and explains why the assertion checks presence rather than absence. The guard and its proof are inseparable; nothing can drift out of sync because there is only one artifact. 7/15 sampled guard comments in ocx already follow this shape. This is the single strongest concrete instance of the eval sketch's "a test named for the constraint" survival condition — worth a `code-docs` rule that actively prefers this placement over a guard comment on production code with a same-file-but-separate test.
- **Long, full-sentence test names as the default fleet style.** Confirmed by hand in ocx and grimoire, not just the heuristic: names like `resolve_base_url_refuses_a_scheme_outside_the_closed_set` and `an_omitted_host_is_the_canonical_host_not_a_different_one` are the norm, not the exception, in both Rust `#[test] fn` names and Python `test_*` names. A code-docs rule that says "a test name is a spec sentence" is describing the fleet's existing behavior, not proposing a new one — cheap to ratify, and it means test names are already doing meaningful "why/what" work that some inline comments duplicate.
- **A rule file the code points at by name, resolved by a hook, not by an agent's memory.** `grimoire:.claude/hooks/post_tool_use_tracker.py:32-35` maps touched paths to `subsystem-*.md` rule filenames programmatically. This is the discoverability direction demand asks about — "code → record, in both directions" — done as tooling instead of a comment. Worth reusing: the code-docs cleanup skill could ship an equivalent hook/check that, given a touched path, prints which `paths:`-scoped rule(s) cover it, rather than relying on a comment to remember.
- **`backup/*-prefinalize` / `*-presquash` refs as the actual "history survives" mechanism.** Not a comment convention, but directly relevant to any rule claiming "history is available via git blame": it's available only through these refs once a rewrite has happened, and only while they stay armed. A code-docs rule that tells agents "the why may be in git history" should also tell them to check `git for-each-ref refs/heads/backup/*` for the current branch, not just `git log`/`git blame` on the tip.
- **The MADR/Nygard hybrid template (`## Metadata` + `## Decision Drivers` + `## Context`/`## Decision`) is the fleet's real, self-invented ADR format**, used in 81% of the 444-record sample across ocx, arcana and grimoire independently. Any decision-record guidance this program ships should describe *this* format, not point agents at MADR or Nygard's canonical templates, since the fleet has already converged on its own variant.

## Contradictions of the frame

- **The decision-record store itself is healthier than the frame implies.** The frame's premise is that comments carry too much of the "why" that should live in records instead; this audit's data says the records exist, are mostly tracked (96/96 ADRs in ocx, 23/23 in arcana), are getting genuine lifecycle tracking (106/444 records name a real supersedes/superseded-by relationship), and have converged on a consistent house format across three independent repos. **The actual failure mode is not "no decision-record store" — it's "the short-ID pointer scheme that's supposed to connect code to that store doesn't resolve."** Any fix aimed at "write more/better ADRs" is aimed at the healthy half; the fix belongs on the `C-NNN`-in-comment convention and on keeping paths current after structural refactors.
- **H5 ("cold agents seldom read git history or decision records unprompted") is not addressed by this audit and should not be treated as supported by it.** Everything above measures whether the stores are *discoverable and consistent*, not whether an agent actually consults them cold — that is the eval's job, not this one's. Do not cite section 5's git-history numbers as evidence for or against H5.
- **The prior critique's "C-049 is defined in no tracked file" was already corrected in the same document** ("two unrelated tracked meanings"); this audit's fresh count (45 in-code citations, 2 confirmed distinct meanings — dry-run "writes nothing" semantics in `render_toolchain.rs` and bot-detection in `owners.rs`, both citing `subsystem-package-manager.md`) doesn't contradict the critique, it sharpens it: the collision is worse in citation count than either the original synthesis (~2 meanings implied dead) or a quick re-read would suggest.
- **The critique's "33 `plan_*.md` files are tracked in `.claude/artifacts/`, so 'plans are gitignored' is overstated" and the original synthesis's "plans live under `.claude/state/`, which `.gitignore` excludes" are both true, about two different directories** — `.claude/artifacts/plan_*.md` (33/33 tracked) and `.claude/state/plans/*.md` (gitignored, `.gitignore:39`, currently empty in ocx but not empty in `index`, where it holds the dead `plan_index_v1.md` this audit found). Neither side of that prior disagreement was wrong; they were talking past each other about different plan locations, and both directories coexist in the same repo.

## Gaps

- Test-naming classification was heuristic (regex) for 19/21 repos; only ocx and grimoire's 40-name samples were read by hand to validate the heuristic. The heuristic likely over-classifies as "behaviour" wherever a name is merely long, not necessarily descriptive — treat the fleet-wide table as directional, the two hand-checked rows as ground truth.
- The 15-guard-vs-test check ran on ocx only; 3/15 items landed on inline comments the method couldn't attribute to an enclosing function (a match arm, mid-body comments) rather than a genuine "no test found" result — those 3 are unresolved, not negative. Not repeated on other repos for time.
- Git history (demand 5) covers the 4 repos the demand specified; no data here on the other 17 repos' history discipline.
- No fleet-wide canonical index of decision records exists to check cross-repo pointer resolution systematically; the cross-repo cases in section 2/Smells are spot-checked, not exhaustively enumerated.
- ID-reference counts here (demand 2) count *all* occurrences of a pattern in tracked source, not comment-lines-only as the prior research's classifier did; the two methods triangulate (this audit: 4,368+242+115+114+608 = 5,447 word-bounded `C-`/`WP-`/`DEC-`/`DX-`/`RUL-` hits in ocx `crates/*.rs`; prior critique: ~4,237 comment-lines-only) but are not the same measurement — don't average them.
- comment_census.py (the shared classifier) was not invoked in this audit; the comment:code ratio and its per-language breakdown is the frame document's responsibility, not re-verified here.
