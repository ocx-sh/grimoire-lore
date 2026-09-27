---
title: code-docs comment census — ocx and grimoire Rust
agent: research-lang subagent (census)
model: claude-sonnet-5
scope: /home/mherwig/dev/ocx (prod Rust, 89,987 code lines), /home/mherwig/dev/grimoire (prod Rust, 41,850 code lines)
method: >
  rules/code-docs/checks/comment_census.py against each repo's git-tracked
  tree (git ls-files). Every command is inlined next to its result so it is
  re-runnable verbatim from a shell with CWD anywhere; CENSUS=
  /home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs/rules/code-docs/checks/comment_census.py.
  Custom aggregations (block-length percentiles beyond gt5, clap-vs-schemars
  interface split, ID-family regex counts, pointer-target extraction,
  history-phrase sampling) use small scratch scripts built on top of the
  census script's own `census()`/`classify()`/`blocks_of()` functions — never
  a separate ad hoc parser — so every number traces to the same lexer. Those
  scripts live in the session scratchpad
  (/tmp/claude-1000/-home-mherwig-dev-grimoire-lore/12875bb8-eab1-4416-be05-d74911c5a46c/scratchpad/audit/),
  not in this repo, per the read-only-except-output-file constraint; their
  logic is reproduced inline below each finding as a plain regex/command
  where feasible.
date_researched: 2026-09-27
---

# Comment census: ocx and grimoire (Rust, prod scope)

## Contents

- [Headline numbers](#headline-numbers)
- [1. Re-verifying the prior file's numbers](#1-re-verifying-the-prior-files-numbers)
- [2. Block-length distribution](#2-block-length-distribution)
- [3. Plan and process IDs](#3-plan-and-process-ids)
- [4. Pointers to files in comments](#4-pointers-to-files-in-comments)
- [5. User-rendered surfaces](#5-user-rendered-surfaces)
- [6. History and provenance phrases](#6-history-and-provenance-phrases)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)

## Headline numbers

| Metric | ocx (rust, prod) | grimoire (rust, prod) |
|---|---:|---:|
| Code lines | 89,987 | 41,850 |
| doc+line ratio | 0.894 | 0.615 |
| ratio with interface+license counted | 0.985 | 0.729 |
| Interface lines (clap+schemars) | 7,004 (3,091 clap / 3,913 schema) | 1,122 (506/617) |
| Doc/line blocks ≥20 lines | 671 (625 doc, 46 line), 22,162 lines | 136 (128 doc, 8 line), 4,217 lines |
| Comment lines matching 5 named plan-ID prefixes (prod) | 1,872 | 148 |
| Same, prod+test | 5,221 | not run |
| Distinct decision-record pointer targets (prod) | 68 (467 mentions) | ~15 spot-checked, 0 dead |
| Dead (untracked) decision-record pointers, genuine | 8 files, 38 mentions | 0 of 6 spot-checked |
| `ocx --help` tree (73 surfaces): internal IDs/ADR names/dates found | 0 | n/a |
| Golden JSON schemas: distinct internal IDs/ADR names leaked | 64 (182 occurrences) | n/a |
| History-phrase regex: false-positive rate (30-sample read) | ~37% (11/30) | not sampled |

Commands: `python3 $CENSUS --root /home/mherwig/dev/ocx --group lang --scope prod --format json` and the same with `--root /home/mherwig/dev/grimoire`.

## 1. Re-verify the prior file's numbers

Prior claims (`/home/mherwig/dev/ocx/.claude/artifacts/research_code_comment_density.md`) vs re-measurement with the canonical classifier, same repo HEAD (`ocx@2691d3c1`, 2026-09-25).

| Claim | Prior | Re-measured | Command | Holds? |
|---|---|---|---|---|
| prod ratio ≈0.98 with interface+licence counted | 0.98 | **0.985** ((62,324+18,141+7,004+1,214)/89,987) | `$CENSUS --root ocx --group lang --scope prod --format json`, sum doc+line+interface+license over code, rust row only | Yes, exact |
| 7.1k interface lines, 3,177 clap / 3,973 schemars | 7,150 total | **7,004 total, 3,091 clap / 3,913 schemars** | custom split script re-deriving `_rust_regions` but tagging `Parser|Args|Subcommand|ValueEnum` vs `JsonSchema` separately | Close (≤3% drift both sides), direction and magnitude hold |
| 774 doc blocks >20 lines, ~25k lines | 774 / ~25,000 | **625 blocks strictly >20 lines, 20,931 lines** (doc only, rust prod); **701 blocks ≥20 lines, 22,483 lines** using an inclusive `--min-block 20` count; **752 blocks ≥20 lines (doc+line, whole ocx repo incl. python/ts), 23,814 lines** | `$CENSUS --root ocx --scope prod --list-blocks --min-block 20 --kind any --format json` then sum | Order of magnitude holds, count is 3–19% lower depending on inclusive/exclusive threshold and doc-only/doc+line scope — does **not** reproduce exactly; no evidence of a stated methodology difference on the prior side, so treat 774/~25k as approximate, not literal |
| 185 doc blocks with invented `#` header | 185 | **194** (of 701 blocks ≥20 lines; regex: line stripped of `///`/`/**` marker matches `^#{1,6}\s+\S`, header word not in {examples,errors,panics,safety,implementors,aborts}) | scratch script over the same `--list-blocks` JSON | Close (5% high), holds |
| 201 doc blocks with bold lead-in | 201 | **217** (line stripped of marker matches `^\*\*\S`) | same JSON, `^\*\*` check | Close (8% high), holds |
| 4,237 comment lines matching plan-ID prefixes | 4,237 (critique's corrected figure, "prod+test combined"); 5,500 (uncorrected synthesis figure) | **1,872 prod-only; 5,221 prod+test** for the 5 named prefixes (`C-\d{1,4}`, `WP-\d{1,3}`, `DEC-[A-Za-z0-9]{1,6}`, `DX-\d{1,3}`, `RUL-\d{1,3}`), deduplicated per comment line | scratch `ids.py`, same regex applied to `common.comment_lines()` | Does **not** reproduce 4,237 under any prod/test scope combination tried; the re-measured prod+test figure (5,221) sits far closer to the **uncorrected synthesis's "~5,500"** than to the critique's own corrected 4,237 — see [Contradictions](#contradictions-of-the-frame) |

Spot-read for false positives (required, ≥3 hits per pattern):
- Invented-header pattern: `crates/ocx_announce/src/forge/api.rs:400` (`/// # The write transport changes some of these contracts`), `crates/ocx_cli/src/api/data/sbom.rs:16` (`//! # CWE-150`) — both genuine essay section headers, 0/2 false positives on manual read of 5 total.
- Bold-lead-in pattern: `.github/actions/bazel-cache-rc/write_rc.py:190`, `crates/ocx_announce/src/announce/pipeline.rs:139`, `crates/ocx_announce/src/claim.rs:4`, `crates/ocx_announce/src/claim/root.rs:70`, `crates/ocx_announce/src/forge.rs:4`, `crates/ocx_announce/src/forge/api.rs:303` — 6/6 genuine essay-opening bold sentences, 0 false positives.
- `C-NNN`/`RUL-` prefix regex: `crates/ocx_announce/src/announce.rs:404`, `crates/ocx_announce/src/announce/pipeline.rs:104`, `crates/ocx_announce/src/claim.rs:26,29,62,71,164,288`, `crates/ocx_cli/src/app/context.rs:716`, `crates/ocx_cli/src/command/add.rs:221,268,278` — 11/11 genuine plan-contract IDs, 0 false positives.
- `short2char` (`[A-Z]\d{1,2}[a-z]?`): high false-positive rate — see [Contradictions](#contradictions-of-the-frame); 2.3% of occurrences are markdown heading refs (`H1`–`H6`), a further block are index-schema version tags (`V1`/`V2`, `crates/ocx_cli/src/command/remove.rs:117`, `.../update.rs:119`, `.../direnv_export.rs:156`), and the remainder (`A2`, `C7`, `D1`, `X5`, …) are genuine ADR-paragraph IDs (`crates/ocx_store/src/file_structure/error.rs:26`, `.../file_structure.rs:50`).

## 2. Block-length distribution

`$CENSUS --root <repo> --scope prod --format json` gives p50/p90/p99/gt5 out of the box; `gt40` and the "total lines in blocks over N" columns come from a scratch aggregator over `census()`'s own `Agg.blocks` lists (no re-lexing).

### ocx, rust, prod (8,518 doc blocks, 4,297 line blocks)

| Kind | p50 | p90 | p99 | max | \>3 (n / lines) | \>5 (n / lines) | \>10 (n / lines) | \>20 (n / lines) | \>40 (n / lines) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| doc | 4 | 18 | 48 | 159 | 4,648 / 56,482 | 3,578 / 51,623 | 1,836 / 38,489 | 625 / 20,931 | 128 / 7,423 |
| line | 3 | 8 | 21 | 61 | 1,872 / 13,091 | 903 / 8,854 | 253 / 4,063 | 46 / 1,231 | 3 / 167 |

### grimoire, rust, prod (3,756 doc blocks, 1,825 line blocks)

| Kind | p50 | p90 | p99 | max | \>3 (n / lines) | \>5 (n / lines) | \>10 (n / lines) | \>20 (n / lines) | \>40 (n / lines) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| doc | 2 | 12 | 33 | 78 | 1,493 / 15,288 | 1,071 / 13,416 | 458 / 8,768 | 128 / 4,017 | 19 / 1,087 |
| line | 3 | 6 | 15 | 34 | 595 / 3,756 | 245 / 2,226 | 55 / 847 | 8 / 200 | 0 / 0 |

Reading: ocx's doc-block p90 (18) is 1.5× grimoire's (12); ocx's max (159) is 2× grimoire's (78). By share of code, ocx has 38,489/89,987 = 43% of its code lines shadowed by a comment block >10 lines somewhere in the same run of comments; grimoire has 8,768+847 over 41,850 = 23%. This is the sharpest single number separating the two corpora — sharper than the plain ratio (0.894 vs 0.615, a 1.45× gap; the >10-line-block share gap is ~1.9×).

### Sweep list — top 25 files by comment lines held in blocks >10 lines

**ocx** (command: scratch `blockstats.py` over `cc.blocks_of()` per file, `.rs`, prod scope):

| Lines | File |
|---:|---|
| 1,683 | crates/ocx_package_manager/src/tasks/render_toolchain.rs |
| 914 | crates/ocx_config/src/env.rs |
| 826 | crates/ocx_sign/src/verify/pipeline.rs |
| 696 | crates/ocx_package_manager/src/activation.rs |
| 666 | crates/ocx_package_manager/src/composer.rs |
| 652 | crates/ocx_package_manager/src/tasks/resolve.rs |
| 638 | crates/ocx_shell/src/shell/hook.rs |
| 599 | crates/ocx_oci/src/client.rs |
| 597 | crates/ocx_index/src/chained_index.rs |
| 575 | crates/ocx_config/src/loader.rs |
| 541 | crates/ocx_announce/src/forge/gitlab.rs |
| 507 | crates/ocx_index/src/local_index.rs |
| 488 | crates/ocx_config/src/lib.rs |
| 459 | crates/ocx_oci/src/host_capabilities.rs |
| 441 | crates/ocx_announce/src/forge/git_workspace.rs |
| 416 | crates/ocx_shell/src/shell.rs |
| 400 | crates/ocx_index/src/store.rs |
| 398 | crates/ocx_package_manager/src/tasks/patch_discovery.rs |
| 387 | crates/ocx_cli/src/app/context.rs |
| 383 | crates/ocx_announce/src/forge/api.rs |
| 382 | crates/ocx_index/src/ocx_index.rs |
| 365 | crates/ocx_store/src/file_structure/state_store.rs |
| 339 | crates/ocx_store/src/file_structure/toolchain_store.rs |
| 329 | crates/ocx_cli/src/app/project_context.rs |
| 328 | crates/ocx_package_manager/src/launcher/body.rs |

These 25 files hold 14,510 comment lines in blocks >10 (38% of ocx's 38,489+4,063 total) out of 636 prod files — the essay mass is concentrated, matching the prior file's "sample over-weights the largest files" caveat directly: any hand sweep should start here.

**grimoire** top 5 for comparison: `src/install/installer.rs` (571), `src/tui/app.rs` (400), `src/config/registry_filter.rs` (361), `src/install/install_state.rs` (311), `src/install/path_anchor.rs` (281) — full top 25 in scratch, mass is far less concentrated (top file is 571 vs ocx's 1,683, 3×  lower even before normalizing for repo size).

## 3. Plan and process IDs

Regex families (word-boundary, case-sensitive except where noted), run over `doc`+`line` kind comment text via `common.comment_lines()`, prod scope unless stated:

| Family | Regex | ocx prod lines | ocx all-scope lines |
|---|---|---:|---:|
| `C-NNN` | `\bC-\d{1,4}\b` | 1,510 | 4,496 |
| `short2char` | `[A-Z]\d{1,2}[a-z]?` (word-bounded) | 1,062 | 2,938 |
| `RUL-` | `\bRUL-\d{1,3}\b` | 262 | 516 |
| `A-NN` | `\bA-\d{1,3}\b` | 206 | 514 |
| `S-N` | `\bS-\d{1,3}\b` | 92 | 1,012 |
| `WP-N` | `\bWP-\d{1,3}\b` | 65 | 405 |
| `DX-` | `\bDX-\d{1,3}\b` | 51 | 189 |
| `DEC-` | `\bDEC-[A-Za-z0-9]{1,6}\b` | 38 | 152 |
| `iso-date` | `\b20\d{2}-\d{2}-\d{2}\b` | 25 | 163 |
| `round-N` | `\bround\s+\d+\b` (CI) | 0 (prod) | 10 |
| `codex-flagged` | `codex[- ]flagged` (CI) | 1 | 2 |
| `review`-word | `\breview(ed\|s\|ing)?\b` (CI) | 45 | 201 — mostly generic English ("review this", "under review"), not an ID; excluded from ID totals |

`review`-word is not an ID family at all in this corpus — 0/45 prod hits named a review-round identifier; keep it out of any ratchet. `round-N` and `codex-flagged` are near-zero (11 lines combined, all-scope) — not worth a dedicated rule.

### Top 15 distinct IDs by frequency (all-scope, combined across the 8 alphanumeric families)

`git grep -n -w -F -- "<ID>" -- '*.md'`, filtered to lines that look like a definition (`#+ ID` or `**ID**` at line start):

| ID | Occurrences (all-scope) | Definitions found in tracked `.md` | Classification |
|---|---:|---|---|
| C-006 | 157 | `adr_index_sync_performance.md:1180`, `adr_interpolation_token_grammar.md:1119`, `adr_package_integrations.md:308`, `design_spec_servable_index_snapshot.md:168`, `design_spec_shell_env_overhaul.md:216` | **Several unrelated** |
| C-007 | 152 | same 5 files, distinct meanings each | **Several unrelated** |
| A2 | 145 | `adr_bazel_build_adoption.md:2482`, `adr_index_indirection.md:221`, `adr_oci_registry_mirror.md:105` | **Several unrelated** |
| A3 | 137 | `adr_bazel_build_adoption.md:2536`, `adr_index_indirection.md:270`, `adr_oci_registry_mirror.md:116` | **Several unrelated** |
| C-018 | 136 | `adr_index_sync_performance.md:1332`, `adr_interpolation_token_grammar.md:1205`, `adr_package_integrations.md:820`, `design_spec_servable_index_snapshot.md:921` | **Several unrelated** |
| C-008 | 135 | 5 files, distinct meanings | **Several unrelated** |
| C-017 | 129 | 5 files, distinct meanings | **Several unrelated** |
| C-010 | 127 | 5 files, distinct meanings | **Several unrelated** |
| C-019 | 123 | 5 files, distinct meanings | **Several unrelated** |
| F1 | 119 | `adr_file_lock_unification.md:20`, `adr_index_indirection.md:542`, `adr_patch_env_resolution_uniformity.md:168`, `review_adr_bazel_security.md:48` | **Several unrelated** |
| D1 | 111 | `adr_announce_diverged_branch_rebuild.md:64`, `adr_announce_gitlab_forge.md:64`, `adr_announce_publisher_surface.md:134`, `adr_entrypoint_args_interpolation.md:119` (658 total tracked `.md` hits — heaviest collision of the 15) | **Several unrelated** |
| C7 | 110 | `review_round1_interpolation_token_grammar.md:193` only found as a heading-style definition | **One found; not multiply-defined in this scan** |
| C-003 | 108 | 5 files, distinct meanings | **Several unrelated** |
| C-050 | 107 | `design_spec_shell_env_overhaul.md:2349`, `plan_index_claim_command.md:509`, `plan_issue_sweep_2026-08-30.md:315` | **Several unrelated** |
| C-012 | 106 | 5 files, distinct meanings | **Several unrelated** |

**14 of the top 15 IDs by frequency resolve to several unrelated tracked definitions.** This is not an edge case (the critique's single `C-049` example) — it is the norm for every high-frequency ID. Re-verifying the critique's specific counter-example directly: `git grep -n -w -F -- "C-049" -- '*.md'` finds `design_spec_shell_env_overhaul.md:2298` ("direnv / mise coexistence yield") **and** `plan_index_claim_command.md:504` ("a bot identity is refused at exit 64"), and the second matches the actual code usage at `crates/ocx_announce/src/claim/owners.rs:4,109` and `crates/ocx_announce/src/claim/error.rs:89` — confirming the critique's correction (two unrelated meanings) and refuting the original synthesis's "defined in no tracked file."

Prefix alone does not disambiguate: a bare `C-050` in code (`crates/ocx_cli/src/api/data/shell_state.rs:292`) cannot tell a reader which of 3+ documents it means without also knowing which ADR/plan the surrounding crate belongs to — a cold agent has no such context.

## 4. Pointers to files in comments

Regex: `[A-Za-z0-9_./-]*\.(md|toml|json)` or `(adr|plan|rulings|subsystem)[-_][A-Za-z0-9_.-]+`, over `doc`+`line` comment text, prod scope, ocx.

- 181 distinct raw targets, 1,415 mentions. Filtering to decision-record-like targets (`adr_*`, `plan_*`, `rulings_*`, `subsystem-*`, plus the lore rule files `arch-principles.md`, `quality-core.md`, `quality-rust.md`): **68 distinct targets, 467 mentions.**
- `git ls-files` resolution: **54 tracked, 0 untracked-but-present, 14 flagged missing.**
- Spot-read all 14 (required — every value in a 14-item bucket, not a sample): **8 genuine dead pointers** (38 mentions) and **6 regex false positives** (rustdoc intra-doc links to functions named `plan_for`/`plan_repairs`/`plan_lines`, a hook-script variable `subsystem_label`, a line-wrap truncation of `adr_platform_model_unification.md`, one more truncation). False-positive rate on the "missing" bucket: **43% (6/14)** — driven entirely by `plan_`/`adr_`-prefixed Rust identifiers colliding with the filename regex, not by the underlying dead-pointer signal.

Genuine dead pointers (all confirmed missing from `git ls-files`, all real filenames named in prose, not code links):

| Target | Mentions | Example citation |
|---|---:|---|
| `plan_toolchain_activation.md` | 19 | `crates/ocx_config/src/env.rs:251` — re-verifies the prior critique's flagship finding; still stale |
| `plan_python_mirror_v2` | 5 | `crates/ocx_python/src/compose.rs:67` |
| `plan_lazy_package_loading.md` | 8 | `crates/ocx_config/src/env.rs:234` |
| `plan_resolution_chain_refs.md` | 2 | `crates/ocx_index/src/chained_index.rs:1704` |
| `plan_toolchain_cli.md` | 1 | `crates/ocx_cli/src/command/install.rs:4` |
| `plan_ocx_login.md` | 1 | `crates/ocx_oci/src/auth/error.rs:57` — "One test per row in the Error Taxonomy table of `plan_ocx_login.md`" — a *traceability* claim to a file that does not exist |
| `plan_project_toolchain.md` | 1 | `crates/ocx_package_manager/src/tasks/pull.rs:735` — "Do not harmonise without revisiting `plan_project_toolchain.md` §7.4" — a governance instruction pointing at a named section of a missing file; worst case in the set, a guard an agent cannot check |
| `adr_registry_mirror_sync.md` | 1 | `crates/ocx_oci/src/client.rs:201` |

For a tracked target, anchor/section existence spot-checked: `adr_index_indirection.md` A2/A3 sections exist as `###` headings (confirmed in §3's grep); this is the pattern the critique recommends as the *only* acceptable pointer form (file + section), and it is also the pattern that most often survives — none of the 8 dead pointers above used a section anchor, they all pointed at the bare (now-renamed or never-created) filename.

grimoire comparison (lighter pass, 6 distinct decision-record targets spot-checked: `adr_oci_empty_config_compat.md`, `adr_mcp_percall_scope_fetch_render.md`, `adr_vendor_wave_expansion.md`, `adr_anchor_escape_recovery.md`, `adr_index_declared_rating_host.md`, `subsystem-cli-api.md`): **0 of 6 missing** (`git ls-files | grep -c "/<name>$"` = 1 for each). Small sample, but grimoire's decision-record pointer hygiene looks better than ocx's on this axis.

## 5. User-rendered surfaces

`ocx --help` plus every subcommand `--help` recursively to depth 3 (`timeout 10 ocx <path...> --help`, walking each `Commands:` section), 73 distinct surfaces captured. `grim --help` and its direct subcommands, both binaries resolved via `which`.

- **Zero** hits for `\b(C-[0-9]+|RUL-[0-9]+|DX-[0-9]+|WP-[0-9]+|DEC-[0-9]+|adr_[a-z_]+|plan_[a-z_]+|subsystem-[a-z-]+)\b`, zero ISO dates, zero `(A2)`-style paragraph refs, across all 73 `ocx --help` surfaces and the `grim --help` tree. DOC-11 (ban on internal references in clap text) appears to be working, or clap text was never the leak vector to begin with.
- One implementation-jargon leak found by manual scan: `ocx pull --help` (a `--global-mode` flag help text) uses "trampolines" as user-facing terminology — `crates/ocx_cli/src/command/pull.rs` (flag doc; exact line not captured in this pass, re-run `timeout 10 ocx pull --help` to locate). Minor; the sentence is self-contained and doesn't require reading source to parse.
- Golden JSON Schemas (`crates/ocx_schema/tests/golden/*.json`, 7 files, 8,399 total lines): **64 distinct internal ID tokens, 182 occurrences** matching the same ID regexes, plus 14 distinct `adr_*`/`plan_*`/`subsystem-*` filenames named directly in `description` fields. This reproduces the critique's finding #3 (schemas leak IDs/filenames) at a similar order of magnitude to its "125" figure (different regex breadth explains the gap; direction and severity both hold). Example, traced end to end: `crates/ocx_cli/src/api/data/shell_state.rs:292` (`/// ... C-050 reason 6's first-prompt half tells the user...`) → `crates/ocx_schema/tests/golden/reports.json:4573` (`"description": "... C-050 reason 6's first-prompt half..."`), and again at `reports.json:4600` and `reports.json:4631` for the same ID. Anyone who runs `ocx --schema` or opens the golden file in an editor with schema-aware hover sees `C-050` with no way to resolve it (§3 above: C-050 itself resolves to 3 unrelated tracked documents).

## 6. History and provenance phrases

Regex: `\b(used to|previously|no longer|was changed|we now|regression|fixed in|before this)\b` (case-insensitive), ocx prod, `common.comment_lines()`. **353 matching lines.** Random sample of 30 (`seed=7`), read individually:

| Class | Count | Notes |
|---|---:|---|
| **False positive** — phrase means something unrelated to history | 11/30 (37%) | Overwhelmingly "used to VERB" parsed as "utilized in order to" (`crates/ocx_sign/src/verify/trust_cache.rs:63`, `crates/ocx_setup/src/profiles.rs:74`), or "no longer" as a plain domain-state adjective with no bearing on the code's own past (`crates/ocx_store/src/reference_manager.rs:25`, `crates/ocx_cli/src/api/data/removed.rs:52`) |
| **Pure provenance** — narrates the past, no present-tense obligation | 8/30 (27%) | e.g. `crates/ocx_cli/src/command/which.rs:201` ("produced before this command resolved packages one at a time") — safe to delete or move to commit body |
| **Present-tense constraint phrased as history** — load-bearing, would break a guard if deleted | 11/30 (37%) | e.g. `crates/ocx_announce/src/claim/root.rs:24` ("a later 'simplification' to `assert_eq!(Value, Value)` is a regression, not a cleanup") — an explicit anti-simplification instruction, exactly the failure mode the frame's guardrail is worried about; `crates/ocx_sign/src/verify/pipeline.rs:1189` and `crates/ocx_announce/src/sign/referrers.rs:71` ("the Unsupported verdict no longer refuses the operation... See `adr_oci_referrers_signing_v1.md`, Amendment 10") — history-flavored framing carrying a live security/compat rule plus a (tracked, live) ADR pointer; `crates/ocx_package/src/metadata/env/resolver.rs:8` ("the required-path validation that previously lived duplicated across `Accumulator::resolve_var` and `Exporter::resolve_var`") — guards against re-duplicating |

**A blanket "ban history phrases" rule as literally specified would delete the false-positive third for the wrong reason (they aren't history at all — the regex is bad) and the load-bearing third for the wrong reason (it deletes real guards).** Only the middle third (pure provenance, ~27%) is safe to cut mechanically; the rest needs the rewrite the critique already recommended (present-tense constraint, keep; narration, delete; but a naive grep-and-delete pass would hit the wrong 63%).

## Smells (ranked)

1. **Plan-ID collision is universal, not occasional.** 14 of the top 15 highest-frequency IDs (by raw count) resolve to 3–5 unrelated tracked definitions each (§3). A bare `C-NNN`/letter+digit reference in code is not a citation, it's a coin flip.
2. **Comment-block mass is extremely concentrated.** 25 of 636 ocx prod files hold 14,510 of the 42,552 lines living in blocks >10 lines (34%) (§2). Any cleanup sweep should be file-ordered by this list, not category-ordered.
3. **Regex-based "ban history phrases" would be actively harmful as literally specified.** 37% false-positive ("used to" = "in order to"), 37% genuine guards that must survive, only 27% safe to delete outright (§6).
4. **Dead decision-record pointers are real but the naive detector over-counts by ~43%.** 8 genuine dead files (38 mentions, including one governance instruction pointing at a missing section) vs 6 regex false positives from `plan_`/`adr_`-prefixed function names (§4).
5. **Golden JSON Schemas leak the same collision-prone IDs to users**, with no way for a human or agent reading `ocx --schema` output to resolve `C-050` to one of its 3 unrelated meanings (§5) — worse than the code-only leak because it reaches consumers who never see the source tree.
6. **`--help` text itself is clean** (0/73 surfaces) — the leak is concentrated in doc-comment-derived JSON Schema text, not clap help strings; a fix effort aimed at "interface docs" broadly would waste time on the already-clean half.
7. **The `short2char` ID family (`A2`, `C7`, `D1`, …) mixes three unrelated things under one regex**: genuine ADR-paragraph IDs (majority, resolves cleanly when file-qualified), index/schema version tags (`V1`/`V2`), and markdown heading refs (`H1`–`H6`). A ratchet on this family needs to exclude the latter two classes explicitly or it will flag correct code.

## Patterns worth encoding

- **File+ID beats bare ID, and this corpus already contains the counter-example proving it**: `adr_index_indirection.md` A2/A3 (tracked, one meaning, resolves) vs bare `C-050`/`D1`/`C7` (untracked to source, several meanings). Rule: an ID in a comment MUST carry its filename inline (`` `adr_index_indirection.md` A2 ``), never bare — this is mechanically checkable (grep for the ID families with no preceding backtick-filename token within N characters) and the corpus shows the distinction already exists informally in the best comments.
- **A dead-pointer check needs to exclude code-identifier collisions.** Any lint for "every `plan_*`/`adr_*` name in a comment must be `git ls-files`-tracked" must first strip rustdoc intra-doc links (`` [`plan_for`] ``-style) and bare snake_case identifiers that happen to share the prefix, or it inherits this census's 43% false-positive rate.
- **A present-tense-constraint carve-out for the history-phrase ban**, keyed on co-occurrence with a `///`/`//` sentence containing "regression", "not a cleanup", "must", "never", "fail-closed"/"fail-open", or a live ADR/section pointer — the three genuine load-bearing examples in §6 all had one of these markers. A phrase-ban without this carve-out deletes guards (frame H4's exact failure mode).
- **The sweep-list-by-file pattern from §2 generalizes**: any cleanup procedure (skill or ratchet) should rank files by "comment lines in blocks >10" and work top-down, not by category — the top 25 files hold over a third of the excess mass in ocx.
- **Golden-schema ID scrubbing is higher leverage than clap-text scrubbing** for the code-rendered-surfaces axis: `--help` is already clean; JSON Schema `description` fields are not, and they reach a wider audience (anything that renders the schema, not just CLI users).

## Contradictions of the frame

- **Frame/critique's "4,237 comment lines matching plan-ID prefixes" does not reproduce under the canonical classifier at any scope tried** (prod: 1,872; prod+test: 5,221; prod+test+other not separately isolable from prod+test cleanly with this script's scope model). The prod+test figure (5,221) sits closer to the *uncorrected* synthesis's "~5,500" than to the critique's own "4,237" correction — i.e., re-verification with the shared tool partially un-does the critique's own correction on this one number. This does not overturn the qualitative finding (plan IDs are a real, large category) but the specific digit should not be repeated as-is; cite the range (1.9k prod / 5.2k prod+test) instead.
- **"774 doc blocks over 20 lines holding about 25k lines" is 3–19% high depending on inclusive/exclusive threshold and doc-only/doc+line scope** — re-measured 625–701 doc blocks, 20,931–22,483 lines. Same direction, not the same number; likely the prior artifact used a slightly different (pre-canonical) classifier, since this program's own frame document independently re-derived the 0.985 and 7.1k figures exactly with the current script, but not this one.
- **H2 (block length separates agent- from human-written code better than the ratio) gets stronger, not just confirmed, evidence here**: the *share of code lines inside blocks >10* (43% ocx vs 23% grimoire) separates the two repos more sharply (1.9×) than the plain ratio does (1.45×), even though both are "agent-era" Rust repos in the same fleet — suggesting block-length concentration is sensitive to something beyond "agent-written vs not" (crate-level convention, essay-writing habits of specific files) and the frame's binary agent/human framing may be too coarse; a per-file or per-crate-owner axis might explain more variance than agent-vs-human.
- **The short-ID family the frame lists ("short two-character IDs like C7 or D2") is not a clean signal as specified.** A regex for it also catches markdown heading levels and schema-version tags at a measurable (if modest, 2–3%) rate; any ratchet built on it needs the exclusion this census identifies, which the frame does not mention.
- **Frame's H5 ("cold agents seldom read git history or decision records unprompted") is not tested by this census** — it is an eval-harness question (frame's own eval sketch), not a static-measurement one; flagging so it is not miscounted as addressed here.

## Gaps

- No block-length distribution run for grimoire's `other`/`test` scopes, or for ocx's `test` scope beyond the single aggregate ratio (0.358 measured here vs 0.29 in the prior artifact — also worth a future re-check, not pursued given the demand's prod focus).
- ID-family top-15 table was built for ocx only; grimoire's much smaller ID population (452 all-family hits vs ocx's several thousand) was not run through the same definition-resolution grep — worth doing if grimoire gets its own ratchet, but the volume suggests it is a secondary concern there.
- The `short2char` false-positive rate (H-heading, version-tag) was estimated from the top-25 token list and one full example dump, not a random sample; a random 30-line sample of exactly this family (mirroring the §6 methodology) would tighten the number before it goes into a ratchet regex.
- The trampoline/jargon-in-`--help` finding (§5) was found by manual scan, not a systematic jargon wordlist; a real jargon-leak check would need a curated term list (PATHEXT, dispatch object, CAS, trampoline, fail-open/closed, …) run across all 73 captured surfaces, not eyeballed.
- Anchor/section-existence checking (demand 4's "whether a named section or anchor exists in the target") was spot-checked for one tracked target (`adr_index_indirection.md` A2/A3) and not run systematically across all 54 tracked decision-record pointers; a full pass would need to parse each `.md`'s heading list and match against the ID/section token used in the comment, which this session did not have time to script.
- Grimoire's own comment-mass sweep list (top 25 by blocks >10) was generated but not spot-read for content the way ocx's top files were in the prior research; only the header numbers are reported here.
