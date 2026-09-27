---
title: code-docs config audit — what the fleet's AI configuration already says about comments, decision records, tests, commits and IDs
agent: code-docs-audit
model: sonnet
scope: >
  Every agent-configuration file (lore rules/skills, fleet-repo .claude/*,
  AGENTS.md, CLAUDE.md, user-level ~/.claude, installed plugins) that governs
  comments, doc comments, docstrings, decision records, test naming, commit
  messages, or plan/contract/work-package IDs. Read-only; no code, plans or
  ADRs were changed to produce this file.
method: >
  Directory surveys via `find`/`wc -l` per repo; targeted `grep -n` for
  section headers and keyword classes (comment, docstring, ADR, decision
  record, test name, commit message, plan/contract/work-package ID),
  restricted to `.claude/{rules,skills,agents}`, `AGENTS.md`, `CLAUDE.md`
  (excluding `.claude/state` and `.claude/artifacts`, which are generated
  planning output, not agent configuration). Every keyword hit was opened and
  read, not just counted. Comment-volume numbers were re-run with
  `python3 rules/code-docs/checks/comment_census.py --root <repo> --scope prod
  [--group none] [--sample N --seed S --min-block K]` from
  `/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs/rules/code-docs/checks/`.
  ID-collision and dead-pointer claims were checked with `grep -rn` for the
  literal ID against the file it should resolve in, plus `git ls-files
  --error-unmatch` to confirm tracked status. Commands are inlined next to
  each result below.
date_researched: 2026-09-27
---

# code-docs config audit

## Contents

- [Headline numbers](#headline-numbers)
- [1. Inventory](#1-inventory)
- [2. Pressure map](#2-pressure-map)
- [3. ID injection](#3-id-injection)
- [4. Where a reason should live — and whether code follows it](#4-where-a-reason-should-live--and-whether-code-follows-it)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)

## Headline numbers

- **ocx prod comment ratio, re-verified today**: 0.852 line-ratio / 1.684
  char-ratio, clap/schemars/licence excluded (`comment_census.py --root ocx
  --scope prod --group none --format json`: code=95,725, doc=63,083,
  line=18,514, interface=7,004, license=1,214). This differs from both the
  frame's 0.89 (rust-group run, same day) and the prior artifact's 0.98
  (interface+licence included) purely by what the classifier buckets —
  method, not drift. Doc-block p90=18 lines, 635 blocks >20 lines.
- **Only one of six lore language-quality families owns a dedicated
  comment/doc-comment depth file**: `rust-quality/docs-and-tracing.md`
  (20 DOC- rules). Python, TypeScript, Go, Java and Kotlin quality sets have
  none — doc-comment rules are single lines inside an API-surface file, or
  absent (`find rules/{python,typescript,go,java,kotlin}-quality -maxdepth 1
  -type f` — no `docs*`/`comment*` file in any of the five).
- **Rust's own comment rules are duplicated and uncross-referenced**: ocx's
  local `quality-rust.md` (auto-loads on `**/*.rs`, not grim-vendored — zero
  hits for `quality-rust` in `grimoire.lock`) carries its own 46-line
  "Comment Quality" section that never mentions `rust-quality.md`
  (`grep -c rust-quality quality-rust.md` = 0), and directly contradicts it
  (see [§2](#2-pressure-map)).
- **DOC-01..20 severity is lopsided toward volume**: 14 MUST / 5 SHOULD /
  1 CONSIDER; every rule that *mandates* a doc comment (DOC-01–04, DOC-10) is
  MUST, every rule that *cuts* one (DOC-19 narration ban, DOC-20 preserve-list)
  is only SHOULD.
- **Plan/contract-ID leakage into ocx source comments, re-verified**:
  `grep -rE '// .*\bC-[0-9]{3}\b|/// .*\bC-[0-9]{3}\b' crates --include=*.rs`
  → 3,354 hits (looser regex than the prior artifact's 4,237/5,500; not
  reconciled, both are grep-derived). Spot-read 5: 0 false positives, all
  genuine plan-contract references.
- **`C-018` alone resolves in 20 different tracked
  `.claude/artifacts/*.md` files, 87 total occurrences**
  (`grep -rln 'C-018\b' .claude/` then `grep -rn 'C-018\b' .claude/ | wc -l`)
  — the collision the prior artifact's critique described, independently
  reconfirmed with a fresh count.
- **The same fleet's own harness config leaks unresolvable IDs, worse than
  ocx's**: `/home/mherwig/.claude/skills/hex-retro/scripts/retro.py` carries
  16 distinct `C-14xx`/`C-1453`/`C-1454` IDs in comments and docstrings
  (11 sites); **zero** are defined in the skill's own `SKILL.md`
  (`grep -n '1424\|1429\|1437' hex-retro/SKILL.md` → no matches, on a
  365-line file). This is not an ocx problem — it is the pattern itself,
  live in the tool used to run this very research program.
- **The one clean, self-resolving marker convention in the fleet** is
  `ponytail:` (`grep -n 'ponytail:' ~/.claude/plugins/cache/ponytail/*/skills/ponytail/SKILL.md` →
  one line, self-contained: names a ceiling and an upgrade path in the
  comment itself, no external ID to resolve), with its own harvesting skill
  (`ponytail-debt`).
- **Test-name traceability exists as a designed convention** (`hex-core
  references/protocol.md` "Traceability IDs": every C-/S- ID must appear in
  a WP's Scope cell **and** in a Specify-phase test name) but is followed
  inconsistently in the one codebase it targets: `shell_state.rs` has ≥10
  test functions with the ID baked into the name
  (`fn c050_s022_every_reason_and_note_variant_is_in_the_arm_corpus`), while
  `toolchain_store.rs:807` and `template.rs:1094` carry the same class of ID
  (`C-018`) as a bare comment *beside* the test, not in its name.
- **Zero of the five non-Rust language testing depth files** define a
  test-naming convention (`grep -n 'naming\|test name' {python,typescript,go,java,kotlin}-quality/testing.md`
  — the one Python hit, `testing.md:63`, is about verbose-flag propagation
  to hung CI logs, not a naming rule).

## 1. Inventory

### 1.1 Lore rules and skills (`grimoire-lore/.../rules`, `.../skills`)

| Path | Size | Activation | Normative text (verbatim) |
|---|---|---|---|
| `rules/rust-quality.md` | 114 ln | `paths: **/*.rs` (frontmatter, ln 2-3) — auto-loads | ln 86: routes to `[rust-quality/docs-and-tracing.md](rust-quality/docs-and-tracing.md)` for "Documentation & comments; tracing/log levels; span design for concurrent I/O" |
| `rules/rust-quality/docs-and-tracing.md` | 169 ln | **No `paths:` frontmatter** — a depth file, reached only through the routing table above, never glob-loaded directly | DOC-01 (ln 29): "The text before the first blank line of any `///`/`//!` is exactly one complete sentence… MUST". DOC-10 (ln 38): "Library crates with an external consumer surface carry `#![warn(missing_docs)]`… MUST (lib) / SHOULD (bin)". DOC-18 (ln 80): "Commented-out code is deleted, not left behind… MUST". DOC-19 (ln 81): "No narration comments restating the next line… no closing-brace labels… SHOULD". DOC-20 (ln 82): "Preserve the comments that survive the gate: non-obvious constraints… phase markers in multi-step orchestration… a diff deleting one of these without replacing the information is a finding. SHOULD" |
| `rules/docs-quality.md` | — | `paths:` (ln 2-10) covers `**/*.md`, `.mdx`, `.rst`, `.adoc`/`.asciidoc`, `mkdocs.yml`, `book.toml`, VitePress/Docusaurus/Antora configs — **no source-code extension**, so it structurally never fires on a `.rs`/`.py`/`.ts` file | ln 173-189 "Not studied": names its own gaps (accessibility, Vale false-positive rate, freshness gating, translations) but nothing about code-rendered surfaces — confirms the boundary code-docs is meant to sit beside, not inside |
| `rules/go-quality/api-design.md` | — | routed depth file, `**/*.go` family | GO-API-04 (ln 93): "Give every package a `// Package x` comment and every exported identifier a doc comment whose first word is its name… MUST (library, SDK) · SHOULD (CLI non-main packages)". GO-API-16 (ln 167): "State concurrency safety in the doc comment of every exported type with mutable state… SHOULD" |
| `rules/java-quality/api-and-evolution.md` | — | routed depth file | JAVA-API-05 (ln 119): "Every `@Deprecated` element carries a `since` value and a Javadoc `@deprecated` tag, both present or both absent… MUST". JAVA-API-12 (ln 109): "diff the `exports` list against the package list the Javadoc task publishes: a package exported but undocumented… is the finding" |
| `rules/kotlin-quality/api-and-abi.md` | — | routed depth file | KT-API-02 (ln 61): "KDoc every public member except an override that adds nothing, and gate it: `dokka { dokkaPublications.configureEach { failOnWarning = true } } }`… SHOULD" |
| `rules/python-quality/api-surface.md` | — | routed depth file | ln 101 section "Errors and Docstrings as Contract"; ln 151: "blanket suppression when 122 findings land on correct docstrings" (a cautionary example against a repo-wide docstring lint) |
| `rules/typescript-quality/*` | — | — | **No file in this family mentions JSDoc/TSDoc at all** (`grep -rn 'JSDoc\|TSDoc' typescript-quality/` → 0 hits anywhere in the family, index or depth) |
| `rules/code-docs/checks/comment_census.py` | 480+ ln (existing, wave-1 output) | invoked manually | The shared classifier this audit and the frame both use; not yet wired to a rule file — `rules/code-docs.md` does not exist yet |

### 1.2 Fleet repo `.claude/`, `AGENTS.md`, `CLAUDE.md`

Sizes (`wc -l`) and config-dir file counts (`find … -name '*.md' | wc -l`):

| Repo | CLAUDE.md | AGENTS.md | `.claude/rules` files | skills | agents |
|---|---|---|---|---|---|
| ocx | 183 | 109 | 149 | 29 | 9 |
| grimoire | 7 | 279 | 126 | 26 | — |
| ocx-mirror | 219 | — | 113 | 13 | 8 |
| grimoire-indexer | 10 | — | 26 | — | — |
| index | 177 | — | 23 | 3 | 9 |
| creeptd-ng | 68 | 69 | 22 | 17 | 22 |
| bob | 3 | 332 | 21 | — | — |
| kate-middlechild | 101 | — | 20 | 17 | 14 |
| ocx-catalog | 14 | 178 | 12 | 4 | 4 |
| ocx-sdk-python | 135 | — | 12 | 1 | — |
| ocx-mirror-sdk | 106 | — | 14 | 3 | — |
| vscode-ocx | 159 | 84 | 13 | 6 | 6 |
| ocx-indexbot | 83 | — | 15 | — | — |
| setup-ocx | 99 | — | 5 | — | — |
| arcana | 54 | — | 1 | 13 | — |
| rules_ocx | 1 | 323 | 4 | 1 | — |
| grimoire-vscode | 67 | 12 | 8 | 4 | 9 |
| find_ocx | — | — | 2 | — | — |
| grimoire-lore | — | — | — | 4 | — |
| grimoire-index, setup-grimoire | no `.claude`, `CLAUDE.md` or `AGENTS.md` present under `/home/mherwig/dev` at audit time | | | | |

Keyword-hit files per repo (`grep -rilE 'comment|docstring|\bADR\b|decision record|test.?name|commit message|plan.?id|work.?package|contract.?id'` over `.claude/{rules,skills,agents}`, `AGENTS.md`, `CLAUDE.md`): ocx 173, grimoire 141, ocx-mirror 98, arcana 64, index 33, bob 20, kate-middlechild 21, grimoire-vscode 18, ocx-indexbot 14, grimoire-indexer 12, vscode-ocx 11, creeptd-ng 10, ocx-catalog 9, ocx-mirror-sdk 7, ocx-sdk-python 7, grimoire-lore 7, rules_ocx 3, find_ocx 0, setup-ocx 0.

ocx local rules, drilled (the flagship repo — every quote below is `ocx/.claude/rules/…` unless noted):

| File:line | Normative text |
|---|---|
| `quality-rust.md:283` § Comment Quality (ln 283-328), `paths:` ln 2-4 `**/*.rs`, `**/Cargo.toml`, `**/Cargo.lock` | ln 309: "Narration comments — comments restating next line… Warn-tier (should fix)". ln 320-327 "Patterns to Preserve": "`// ── Section ──` dividers…", **"Phase/step comments in multi-step orchestration (`// Phase 1:`, `// Step 1:`)"**, "Issue references (`// NOTE: issue #23`)" |
| `arch-principles.md:104` "ADR Index" table (ln 104-142) | ln 108: `\`adr_cascade_platform_aware_push.md\` \| Per-platform version filtering…`; ln 137: `\`adr_index_indirection.md\` \| One index format, many copies…`. **`adr_toolchain_activation.md` (235 KB, tracked: `git ls-files --error-unmatch` succeeds) does not appear in this table at all** — only a distinct draft, `system_design_toolchain_activation.md` (ln 142), is listed |
| `workflow-swarm.md:233` | "**The merge recipe (mechanically enforced, `plan_test_speed_tiers.md` C-017/P-5, ADR D4):**" — the file-qualified ID form |
| `workflow-git.md:24,43,134` | ln 24: "Never `Co-Authored-By` in commit messages. OCX convention." ln 43: "## Conventional Commits (Quick Rules)". ln 134: pointer to `../skills/commit/commit_reference.md` |
| `skills/commit/commit_reference.md:58` | "Explain **why**, not what — diff show what. Include body only when reason non-obvious (hidden constraint, subtle invariant, workaround for specific bug, context future reader miss)." |

### 1.3 User-level config (`~/.claude`)

`CLAUDE.md`, `RTK.md`, `rules/hex-state.md`, `rules/context7.md`: **zero** hits for comment/docstring/decision-record/test-name keywords (`grep -inE 'comment|docstring|doc.comment' …` → none). These govern reporting terseness, CI delegation, worktree hygiene, model routing and retro filing — none reach into code-comment content.

`~/.claude/skills/hex-*` (the planning/execution harness every hex-plan/-execute/-review run uses, fleet-wide):

| File:line | Normative text |
|---|---|
| `hex-init/assets/templates/plan.md:116-120` | "IDs C-001, C-002, ... are stable coverage join keys - carried from the spec when one exists, never renumbered. Every C-ID must appear in the Scope cell of at least one WP and in at least one test step (hex-core references/protocol.md § Traceability IDs)." |
| `hex-core/references/protocol.md:749-768` "Traceability IDs" | "Component contracts are numbered `C-001, C-002, …`; UX scenarios `S-001, S-002, …`… stable within the artifact, never renumbered." "Every ID maps to at least one WP and at least one test… every Specify-phase test names the IDs it covers." |
| `hex-plan/SKILL.md:273` | "Numbered `C-001, C-002, …`; UX scenarios below are numbered `S-001, S-002, …`" |
| `hex-execute/SKILL.md` (11 sites: ln 79,114,135,148,188,194,402,404,413,418,426,434,436,439,440) | Self-referential `C-3xx` IDs cross-referencing the skill's *own* sections (e.g. ln 194 "Federation refusal (C-323)") — an internal documentation convention, distinct from plan-authored C-/S- IDs, but the **same visual grammar** |
| `hex-finalize/SKILL.md:202,220` | `C-807`, `C-808` — same internal convention |

### 1.4 Installed plugins (`~/.claude/plugins/cache`)

| Plugin | File:line | Normative text |
|---|---|---|
| ponytail (active this session, level full) | `ponytail/4.8.4/skills/ponytail/SKILL.md:64` | "Mark deliberate simplifications with a `ponytail:` comment (`// ponytail: this exists`), simple reads as intent, not ignorance. Shortcut with a known ceiling… ? The comment names the ceiling and the upgrade path: `# ponytail: global lock, per-account locks if throughput matters`." |
| ponytail | `ponytail/4.8.4/skills/ponytail-debt/SKILL.md:11,17,20,22,31-38` | "Every deliberate ponytail shortcut is marked with a `ponytail:` comment…" ln 20: `` `grep -rnE '(#|//) ?ponytail:' .` ``. ln 31: "The convention is `ponytail: <ceiling>, <upgrade path>`". ln 35: "Flag the rot risk: any `ponytail:` comment that names no upgrade path or trigger" |
| caveman | `caveman/…/skills/caveman-commit/SKILL.md` (whole file) | "Conventional Commits format… Add body only for: non-obvious *why*, breaking changes, migration notes, linked issues… `Closes #42`… Never: 'This commit does X'… 'Generated with Claude Code' or any AI attribution" |
| claude-plugins-official (frontend-design, pyright-lsp, rust-analyzer-lsp, typescript-lsp) | — | 0 hits for comment/docstring/ADR/commit-message/test-name across the whole plugin tree |
| openai-codex | — | 0 hits for "comment" anywhere under `codex/1.0.3/` |

## 2. Pressure map

**Pushes comment/doc-comment volume UP:**

| Source | Text | Effect |
|---|---|---|
| `rust-quality/docs-and-tracing.md` DOC-01–04 (all MUST) | Mandatory one-sentence summary, `# Errors`, `# Panics`, `# Safety` on every applicable item | Structural, unavoidable per-item doc comments |
| `rust-quality/docs-and-tracing.md` DOC-10 (MUST lib) | `#![warn(missing_docs)]` on every library crate with an external consumer | Repo-wide doc-comment mandate — **not enforced anywhere in ocx today** (`rg -n missing_docs` across `crates/**/Cargo.toml`/lib roots: no crate carries it, confirming the prior artifact's finding still holds) |
| `quality-rust.md:320-327` "Patterns to Preserve" | Protects section dividers, **phase/step comments** (`// Phase 1:`), issue references, "why this looks wrong but is correct" notes | Explicitly forbids deleting a whole class of comments the census (prior artifact) classified as narration |
| `go-quality/api-design.md` GO-API-04 | Every exported identifier needs a doc comment starting with its name | Library-wide `godoc` mandate |
| `java-quality/api-and-evolution.md` JAVA-API-05/12 | `@Deprecated` needs matching Javadoc; module `exports` must match the Javadoc-published package list | Per-item Javadoc mandate on the deprecation and module-boundary path |
| `kotlin-quality/api-and-abi.md` KT-API-02 | KDoc every public member, gate with `failOnWarning = true` | Repo-wide KDoc mandate, the only language family with an enforced *fail-the-build* doc gate |

**Pushes comment/doc-comment volume DOWN:**

| Source | Text | Effect |
|---|---|---|
| `docs-and-tracing.md` DOC-18 (MUST) | Delete commented-out code | Narrow, uncontested cut |
| `docs-and-tracing.md` DOC-19 (SHOULD) | Ban narration, tautological docs, closing-brace labels | Directly targets the classes the census found large |
| `docs-and-tracing.md` DOC-20 (SHOULD) | "A diff deleting one of these without replacing the information is a finding" — but the "these" it protects (non-obvious constraints, **phase markers**) overlaps DOC-19's ban target | Weaker severity (SHOULD) than every volume-generating MUST above |
| `ponytail` SKILL.md (session-active) | "Code first. Then at most three short lines… No essays" (general terseness ethos) | Not comment-specific, but the active session persona actively discourages prose |

**Contradictions between two rules, both auto-loading on the same file, quoted both sides:**

1. **`quality-rust.md` vs `docs-and-tracing.md` on phase/step comments**, both on `**/*.rs`, never cross-referenced (`grep -c rust-quality quality-rust.md` = 0; `diff` confirms `docs-and-tracing.md` is byte-identical between `ocx`, `grimoire` and the lore worktree — not local drift, a genuine unreconciled duplicate):
   - `quality-rust.md:323`: *"Phase/step comments in multi-step orchestration (`// Phase 1:`, `// Step 1:`)"* — listed under **Patterns to Preserve**.
   - `docs-and-tracing.md:81` DOC-19: *"No narration comments restating the next line (`// Create a new vector`)… no closing-brace labels"* — the prior artifact's census (line 114 of `research_code_comment_density.md`) classified exactly this style, `// Step 4: one lock over the whole body…`, as narration, then reversed itself in the adversarial critique (§ objection 5) once it found the comment was load-bearing (it guards `let _render_lock = …` against a silent `let _ =` rewrite). **Both rule files are silent on which register that comment belongs to** — DOC-20's "preserve non-obvious constraints" would keep it, "Patterns to Preserve" would keep it, DOC-19's ban-on-form would flag it. The two files never resolve this by pointing at each other.
2. **DOC-10 vs measured reality**: DOC-10 is MUST-severity for "library crates with an external consumer surface," but nothing in the rule or in `arch-principles.md` states which of ocx's crates have one — the prior artifact's critique (objection 2) already found this ambiguity costs ~5,111 of a ~5,450-line budget in `ocx_cli` alone if applied crate-wide. Re-verified today: still zero `missing_docs` occurrences in `crates/**/Cargo.toml`-adjacent lib roots, so the MUST is currently unenforced rather than resolved.

## 3. ID injection

**Where the ID scheme is defined**: `hex-core/references/protocol.md:749-768` "Traceability IDs" — `C-NNN` (component contracts) and `S-NNN` (UX scenarios), assigned once per plan/spec, "stable within the artifact, never renumbered." The template that emits them is `hex-init/assets/templates/plan.md:116-131` (`- **C-001** \`[Component/function]\`…`).

**What the design explicitly asks for**: an ID in a WP's Scope cell and in a test name (`protocol.md:761-762`: "every Specify-phase test names the IDs it covers"). **Nowhere in `hex-plan`, `hex-execute`, `hex-core` or the plan template does any instruction say to put a C-/S- ID into a *source comment*.** The leak is not authored; it is incidental — an agent implementing "C-018" reads the plan's own vocabulary and reuses it inline while writing the function the plan describes.

**Traced, plan → code, three ways found in ocx**:

1. **Comment beside a test, not in its name** — `crates/ocx_cli/src/api/data/shell_state.rs` uses both patterns in the same file: `fn c050_s022_every_reason_and_note_variant_is_in_the_arm_corpus()` (line 1775, ID in the name, per the design) alongside `crates/ocx_store/src/file_structure/toolchain_store.rs:807` (`/// … C-018's own system-location refusal`, ID in a doc-comment *above* a test, not in the name) and `crates/ocx_package/src/metadata/template.rs:1094` (`/// C-018 (resolver leg) — …`, same pattern, and note: `///` is the rustdoc register — DOC-18..20's "two registers, never mixed" rule is violated independently of the ID, since these are private test-support items, not a public API contract).
2. **Bare, unqualified, and colliding** — `C-018` alone resolves in 20 tracked `.claude/artifacts/*.md` files (`plan_test_speed_tiers.md`, `adr_index_sync_performance.md`, `adr_shell_env_addenda.md`, `rulings_toolchain_activation.md`, and 16 others), 87 total mentions. A cold reader of `toolchain_store.rs:807` has no way to pick the right one.
3. **The same convention, worse, in the harness's own tooling** — `~/.claude/skills/hex-retro/scripts/retro.py` embeds `C-1424` through `C-1437` plus `C-1453`/`C-1454` (16 distinct IDs, 11 sites: lines 48, 54, 78, 140, 744, 829, 1078, 1337, 1607, 1611, 1694) with **zero** matching definitions in `hex-retro/SKILL.md` (365 lines, `grep -n '1424\|1429\|1437'` → empty). Line 54's own comment — `# C-1424 names only -- the values live in ../SKILL.md, never here` — states the intended pointer discipline and then the file fails it: the values are not in `SKILL.md` either.

**A working counter-example already exists**: `ponytail:` marker comments (`SKILL.md:64`) carry their own resolution inline — "ceiling, upgrade path" — so a cold reader never needs a second document. `ponytail-debt/SKILL.md` turns this into a harvestable ledger with one grep. No ID, no collision, no dead pointer possible by construction.

## 4. Where a reason should live — and whether code follows it

Fleet rules that name a destination for the "why":

- `docs-and-tracing.md` DOC-20 (constraints stay local, `//`), the prior artifact's synthesis (§2, "one line pointing at a durable file name… **replaces** the argument"), `arch-principles.md`'s ADR Index (ln 104-142), and `commit_reference.md:58` ("Include body only when reason non-obvious… workaround for specific bug").

Ten spot-checks against current ocx code:

| # | Site | Rule it should follow | Follows it? |
|---|---|---|---|
| 1 | `crates/ocx_index/src/store.rs:4` (22-line `//!`) | "pointer replaces argument" (synthesis §2) | **Partial** — cites `adr_index_indirection.md` Decisions A2/A3/A4/B1/B2/F1 (file-qualified, correct form) but keeps the full essay too; nothing deleted |
| 2 | `crates/ocx_store/src/codesign.rs:14` (24-line `///`) | DOC-20 "non-obvious constraints… preserve" | **Follows** — no ADR exists for this (platform-specific Gatekeeper rationale), kept entirely local, which DOC-20 sanctions |
| 3 | `crates/ocx_package_manager/src/tasks/patch_publish.rs:34` | DOC-01/02 (`///` = API contract) | **Follows** — pure contract text (`# Errors`, design rationale for a free function vs. a method), no ADR reference needed |
| 4 | `crates/ocx_package_manager/src/tasks/auto_verify.rs:4` (33-line `//!`) | "Patterns to Preserve" issue references | **Follows the letter** — cites bug/PR numbers (`#98`, `#196`, `#194`), the sanctioned ID form, not a plan ID — but at 33 lines it would fail the *proposed*, not-yet-written length ratchet |
| 5 | `crates/ocx_package/src/metadata/validation.rs:483` | synthesis §2 "file name plus ID… only form that resolves" | **Fails** — cites "(D14)" with no file name at all, an ungrounded decision letter |
| 6 | `crates/ocx_index/src/local_index.rs:1034` (28-line `///`) | Same as #1 | **Partial**, same pattern: correct file-qualified pointer (`adr_index_indirection.md` C2/C3), essay kept anyway |
| 7 | `toolchain_store.rs:807` | `protocol.md:762` (ID in test name) | **Fails** — ID in a comment beside the test, not the name |
| 8 | `template.rs:1094` | DOC-18..20 register rule + `protocol.md:762` | **Fails twice** — wrong register (`///` on a private test-support fn) and ID-in-comment, not name |
| 9 | `shell_state.rs:1775` and 9 more in the same file | `protocol.md:762` | **Follows** — ID baked into the function name |
| 10 | `arch-principles.md` ADR Index vs `.claude/artifacts/adr_toolchain_activation.md` | "the ADR map" (arch-principles.md:13) | **Fails** — a 235 KB, tracked, heavily-cited ADR is absent from its own index; only a differently-named draft companion is listed |

Net: 3 of 10 clean follows, 2 partial (pointer added, essay not removed — the exact gap the not-yet-written DOC-21/"pointer, not paraphrase" rule targets), 5 clear misses split across three different failure modes (bare ID, wrong register, stale index).

## Smells (ranked)

1. **Two un-cross-referenced, contradictory comment-quality rule files auto-load on every `.rs` edit in ocx** (`quality-rust.md` § Comment Quality vs `rust-quality/docs-and-tracing.md` DOC-18–20) — `quality-rust.md:320-327` protects phase/step comments that DOC-19 bans by form, and neither file names the other. Highest-value single fix: merge or cross-link before code-docs adds a third opinion on the same topic.
2. **Plan-scoped IDs are only locally unique, and the design already documents this as intentional** (`protocol.md:756`: "stable *within the artifact*"), yet the same ID grammar is reused, undocumented, as an internal cross-reference style inside hex-execute/hex-finalize's own prose (`C-303`, `C-807`…) — two different ID universes sharing one visual grammar with no namespace marker between them.
3. **The harness's own retro script (`hex-retro/scripts/retro.py`) has 16 dead-pointer IDs**, contradicting its own stated discipline (`retro.py:54`) in the same file that states it.
4. **DOC-10's `missing_docs` MUST is unenforced and unscoped** — no crate carries it, and nothing says which of ocx's crates count as "external consumer surface," reconfirming the prior artifact's finding with a fresh grep rather than inheriting it.
5. **`arch-principles.md`'s ADR Index is out of sync with tracked reality** — a 235 KB, actively-cited ADR (`adr_toolchain_activation.md`) is missing from the one table meant to be its map.
6. **No language family outside Rust has a comment/doc-comment depth file** — TypeScript has zero JSDoc/TSDoc mentions anywhere in its quality set, so an agent writing TS gets no doc-comment guidance at all, up or down.
7. **No test-naming convention exists in any per-language `testing.md`** — the one traceability mechanism that does exist (`hex-core`'s C-/S- IDs) is orchestration-specific and only reaches test names when an agent remembers to apply it by hand (spot-check #7-#9 above shows it applied inconsistently in one file).
8. **`commit_reference.md` repeats its own rule with drifted wording** (ln 58 "Explain why, not what" vs ln 119 "Explain what not why" — same file, same intent, two phrasings) — minor, but exactly the kind of near-duplicate the census flagged at rule-file scale.

## Patterns worth encoding

- **Self-resolving marker comments** (`ponytail:` — `SKILL.md:64`): the comment carries its own payload (ceiling + upgrade path) and needs no external document, eliminating the dead-pointer failure mode by construction. code-docs's own marker convention (if any) should copy this shape rather than the plan-ID shape.
- **File-qualified pointers, when used** (`workflow-swarm.md:233`: "`plan_test_speed_tiers.md` C-017/P-5, ADR D4"; `store.rs:4`'s `adr_index_indirection.md` Decision A2) resolve every time; bare IDs (`C-018`, `(D14)`) never do. The rule to write is "file name + ID, never ID alone" — not yet stated as a MUST anywhere in the fleet.
- **`docs-quality.md`'s path-scoping as the reuse mechanism**: its frontmatter globs documentation file types only, never source extensions, so it structurally cannot collide with a code-comment rule. code-docs should glob source extensions the same way docs-quality glob doc extensions — disjoint by construction, not by convention.
- **Traceability-ID-in-test-name, where it is actually followed** (`shell_state.rs`'s `c050_s022_…` names): a working example of "test name is the join key," ready to cite as the positive case in a depth file rather than inventing a new scheme.
- **Issue-number references** (`auto_verify.rs:4`'s `#98`/`#196`/`#194`, `commit_reference.md`'s "Closes #42") are a durable, collision-free ID form already in use — unlike plan IDs, GitHub issue numbers are globally unique per repo and resolve in a UI every contributor already has open.

## Contradictions of the frame

- **H2 (block length separates agent- from human-written code) needs a caveat, not a reversal**: the two longest ocx blocks re-sampled today (`auto_verify.rs:4` at 33 lines, `local_index.rs:1034` at 28 lines) both carry file-qualified ADR pointers rather than bare narration — length alone would flag them, but by DOC-20's own "preserve non-obvious constraints" they are exactly the content that rule protects. A length ratchet needs the pointer-form carve-out the frame doesn't yet mention.
- **H4 ("a pointer to a decision record alone is not followed cold") is too pessimistic about the *pointer* half**: every file-qualified pointer sampled here resolved correctly and cited a real decision (spot-checks #1, #6). The failure mode this audit found is not "the pointer doesn't work," it is "the pointer is added *alongside* the essay instead of *replacing* it" (2 of 10) or "the ID has no file at all" (2 of 10). The frame's H4 should split these into separate, differently-fixed failure modes.
- **The frame treats ID injection as an ocx-specific risk to design around; it is already live in the harness itself.** `hex-retro/scripts/retro.py` is not part of ocx, was not written under ocx's rules, and still exhibits the identical dead-pointer pattern with a worse resolution rate (0 of 16 IDs resolve, vs. ocx's `C-018` at least resolving to 20 real files). Any rule code-docs ships needs to bind the tooling that plans and executes work, not only the target repos.
- **The frame implies test naming/traceability is a gap to fill; it is instead a designed, partially-adopted convention.** The gap is not "no scheme exists" but "the scheme (`protocol.md` Traceability IDs) is orchestration-layer only, has no per-language rule enforcing it, and is followed in some functions and violated two lines away in others of the same file."

## Gaps

What no config says today that the frame's intended artifact set needs to say:

1. **No rule states "file name + ID, never a bare ID"** anywhere in the fleet, despite both the working good pattern (`store.rs`, `workflow-swarm.md:233`) and the failure pattern (`C-018`, `(D14)`, `hex-retro`'s `C-14xx`) already coexisting in measured code.
2. **No rule caps doc-comment block length** — DOC-20 protects content, nothing gates line count; the prior artifact's proposed ratchet (checks §5) was never written into `docs-and-tracing.md`.
3. **No comment/doc-comment depth file exists for Python, TypeScript, Go, Java or Kotlin** — code-docs's cross-language index is filling a real hole, not duplicating five existing ones.
4. **No rule tells an agent which register (`///` vs `//`) a comment attached to a `#[test]`/`@Test`/`it(...)` block belongs in** — spot-check #8 shows this ambiguity produces a real DOC-18-style register violation today.
5. **No rule requires `arch-principles.md`'s ADR Index (or its per-language equivalent) to be checked for completeness** — spot-check #10 shows it can silently drift out of sync with tracked, cited files.
6. **No test-naming rule exists per language**; the one traceability scheme that exists is hex-specific, undocumented outside `protocol.md`, and has no lint checking that a Specify-phase test's name actually contains the ID it claims to cover.
7. **No rule addresses the harness's own scripts** (`hex-*/scripts/*.py`) as a target — every comment/ID rule surveyed here scopes to project source trees, none to the `~/.claude/skills` tree that plans and drives that work, which is where this audit found the worst dead-pointer instance.
8. **`quality-rust.md` and `docs-and-tracing.md` need reconciling (or one deprecated in favor of the other) before code-docs adds a third layer** on the same `**/*.rs` glob — otherwise code-docs becomes a fourth un-cross-referenced opinion on the same file type.
