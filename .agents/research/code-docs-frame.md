---
title: code-docs program frame
program: code-docs
date: 2026-09-27
status: wave 1
---

# code-docs: frame

Shorter, better code comments for codebases that AI agents mostly write and
read, without losing the reason a non-obvious line looks the way it does.

## Domain and era

Cross-language, not one language: inline comments, doc comments
(rustdoc, docstrings, TSDoc/JSDoc, godoc, Javadoc/KDoc), test names, and the
stores a comment can point at instead (decision records, tests, types and
names, path-scoped agent rules, git history). Era: September 2026. Most fleet
code is agent-written and agent-read; humans direct and review.

## Adopting codebases

Measured 2026-09-27 with `rules/code-docs/checks/comment_census.py --group lang
--scope prod` (ratio = (doc + plain comment lines) / code lines; clap/schemars
interface docs, licence headers and tool directives excluded; dp90 = 90th
percentile doc-block length in lines).

| Repo | Lang | Code | Ratio | Char ratio | dp90 | Blocks > 10 lines |
|---|---|---|---|---|---|---|
| arcana | python | 6,197 | 1.37 | 1.57 | 49 | 262 |
| ocx-catalog | ts | 3,089 | 1.00 | 1.75 | 18 | 83 |
| ocx-sdk-python | python | 5,362 | 0.97 | 1.19 | 25 | 195 |
| ocx | rust | 89,987 | 0.89 | 1.77 | 18 | 2,089 |
| ocx-indexbot | python | 6,155 | 0.84 | 1.20 | 25 | 170 |
| ocx-mirror | rust | 18,752 | 0.67 | 1.29 | 14 | 309 |
| grimoire | rust | 38,492 | 0.65 | 1.32 | 12 | 513 |
| grimoire-indexer | ts | 7,046 | 0.58 | 1.04 | 12 | 87 |
| grimoire-vscode | ts | 10,839 | 0.52 | 1.14 | 10 | 83 |
| rust-oci-client (upstream fork) | rust | 2,560 | 0.30 | 0.56 | 5 | 2 |
| uv (upstream clone) | rust | 190,992 | 0.16 | 0.35 | 5 | 247 |

ocx with interface docs and licence lines counted as comments: 0.985, which
reproduces the prior 0.98 (`/home/mherwig/dev/ocx/.claude/artifacts/research_code_comment_density.md`).
Raw JSON: `code-docs-audit/scratch/fleet/`.

Excluded from fleet counts: ocx-save, ocx-sion, ocx-soraka, ocx-evelynn
(ocx clones), grimoire-duo, grimoire-wt-* (grimoire clones), index-claims,
index-fix67, mirror-*, `.worktrees/`, `.agents/worktrees/`, `.tmp-*`.

## Prior evidence (re-verify, do not inherit)

`/home/mherwig/dev/ocx/.claude/artifacts/research_code_comment_density.md`.
Its adversarial critique overrides its synthesis. Carried forward as
hypotheses only:

- Reference median about 0.20 across 10 Rust repos, splitting apps (0.02-0.22)
  from doc-enforcing libraries (0.31-0.95).
- ocx comment mass: essays about 30 percent, why-constraints 44 percent,
  API contract 12 percent, narration, plan IDs, history, tautology under
  5 percent each. Sample biased to the largest files.
- Category-wide deletes destroy guards (`let _render_lock` narration, history
  lines that guard regressions). Essays hold local invariants absent from the ADR.
- Plan IDs (`C-018`) collide across plans; pointers to untracked plans are dead.
- Interface docs (clap help, JsonSchema descriptions) leak internal IDs to users.
- The overlapping lore rule is `rules/rust-quality/docs-and-tracing.md`
  DOC-18..DOC-20; DOC-20 as written blocks the cleanup.

## Hypotheses (to test, never premises)

- **H1** Human-written reference repos sit at 0.15-0.30 prod comment:code, apps
  lower than doc-enforcing libraries. The owner's 1:4-1:6 (0.17-0.25) is the
  app band.
- **H2** Block length separates agent-written from human-written code better
  than the ratio: human dp90 at or under 5 lines, agent-written 12 or more.
- **H3** Reference repos at their last pre-2022 commit have density no lower
  than at 2026 HEAD. If HEAD is higher, the agent era already shows in them.
- **H4** A guard survives a cut when its constraint stays as one local line
  that says it is load-bearing, or when a test named for the constraint fails
  on removal. A pointer to a decision record alone is not followed cold.
- **H5** Cold agents seldom read git history or decision records unprompted.
- **H6** Narration, plan IDs, history and tautology carry under 10 percent of
  guard information; essays and why-constraints carry most of it.
- **H7** A ratchet per package holds the line; a fixed ratio gate gets gamed by
  deleting good comments.

## Intended artifact set

- Rule `code-docs`, globbed on every source extension: a short index
  (non-negotiables, a where-it-goes table, routing) plus depth files for
  comments, decision records, tests as documentation, code-rendered surfaces,
  and checks. docs-quality keeps user-facing prose; this set references it.
- `rules/code-docs/checks/`: `comment_census.py` (density, block lengths,
  samples) plus ratchet, ID and pointer checks.
- Skill for the cleanup procedure (split essays, relocate, verify reasons
  still recoverable).
- Amendments to overlapping rules (rust-quality DOC-18..20 and the comment
  parts of the other language sets): supersede by reference, bump versions.
- The reason-recovery eval: harness, arms, results, and the cut line it sets.

## Eval sketch (decides the cut line)

Sites: non-obvious lines whose reason lives in a comment today (locks held by
a named binding, fail-open vs fail-closed, error propagation that must not be
swallowed, ordering, bounds, platform quirks). Arms per site: original, rules
applied, aggressive cut, comments stripped. Probe, cold, per arm: (1) propose
a simplification of the enclosing function, unprimed; (2) explain why the line
is written that way and whether it may change. Score guard survival, reason
recovery, and where the reason was found. The cut line is the most aggressive
arm that holds guard survival at the original arm's level.

## Branch and ledger

Worktree `.agents/worktrees/code-docs`, branch `research/code-docs`, commit
per wave, never pushed. Reference corpus: `~/.cache/research-lang/exemplars/code-docs`
(33 blob-less clones, SHAs in `code-docs-audit/exemplars.tsv`); delete when the
program lands.
