---
title: Record-to-code citation rot across refactors
topic: record-to-code-rot
agent: research-lang subagent (code-docs-linkage)
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 14
scope: >
  Covers only the record-cites-code direction (a decision record's backtick
  path/symbol citations going stale as the code moves) across ocx, grimoire
  and arcana, the diff-time-vs-scheduled check trade-off, and the
  edit-vs-addendum rule for repairing a stale citation. Does not cover
  code-cites-record (the C-NNN ID collision problem — that is `plan-ids` and
  `pointer-form-and-check`'s territory), record format/lifecycle, or
  comment:code ratios.
---

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Full-population rename-rot, all tracked ADRs, three repos](#1-full-population-rename-rot-all-tracked-adrs-three-repos)
   2. [Most "gone" citations were never real same-repo paths — a precision problem, not just recall](#2-most-gone-citations-were-never-real-same-repo-paths--a-precision-problem-not-just-recall)
   3. [The textbook rename-trace recipe silently fails on the exact case it's for](#3-the-textbook-rename-trace-recipe-silently-fails-on-the-exact-case-its-for)
   4. [Citation form durability: path vs path+symbol vs symbol-only](#4-citation-form-durability-path-vs-pathsymbol-vs-symbol-only)
   5. [A diff-time check replayed on ocx's last 200 commits: 2 fires, 0 false positives](#5-a-diff-time-check-replayed-on-ocxs-last-200-commits-2-fires-0-false-positives)
   6. [Prior art: repowise.dev's staleness signal and log4brains' immutability doctrine](#6-prior-art-repowisedevs-staleness-signal-and-log4brains-immutability-doctrine)
   7. [Immutability: three sources, two say append, one says amend](#7-immutability-three-sources-two-say-append-one-says-amend)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Decisions this dive proposes](#decisions-this-dive-proposes)
7. [Sources](#sources)

## Summary

- ocx's tracked ADRs cite 1,106 backtick paths; 31.7% (351) don't resolve against the current tree by exact match or a same-2-segment-suffix match; grimoire is 24.6% (65/264), arcana 18.2% (55/303) (`rot_scan.py` run this dive, method below).
- That headline number overcounts real rot 3-4x: sampling 40 "gone" citations per repo and asking git for the commit that ever deleted that exact path, only 22.5% (ocx), 30% (grimoire) and 2.5% (arcana) were ever a real tracked path in that repo's own history — the rest are cross-repo mentions, other-AI-client example paths (`.cursor/hooks.json`, `.codex/config.toml`), gitignored scratch (`.claude/state/...`), or illustrative snippets that were never built as named.
- Arcana in particular is not a rot story: 39 of 40 sampled "gone" arcana citations have no deletion commit anywhere in arcana's history — arcana's ADRs cite other repos (`ocx/.agents/plans/...`) and other clients' config paths as illustration, and a naive detector must not count these as decayed same-repo pointers.
- ocx and grimoire are real rot stories, both traced to one structural commit each: ocx's `ocx_lib` crate dissolve (`b79abbe8d3`, 2026-09-19, 944 files changed) broke 108 exact citations across >40 ADRs in one commit; grimoire's Starlight docs migration (`77558454fd`, 2026-09-07) broke 9 doc paths cited from at least two unrelated ADRs.
- The literal recipe the brief and most tutorials suggest — `git log --follow --diff-filter=R -M -- <path>` on a path that no longer exists — returns nothing, silently, exit 0. `--follow` only walks backward from a path that exists at the starting revision; a deleted path never satisfies that. Verified on 5 known-renamed ocx paths: every one came back empty this way.
- The working recipe: find the deleting commit (`git log --diff-filter=D --pretty=%H -- <path>`), then run `git show -M --name-status <that commit>` with **no trailing pathspec** and grep the old path in the output. Adding the pathspec back (`git show -M --name-status <commit> -- <path>`) degrades the same rename to a bare `D` — confirmed side by side on `b79abbe8d3`.
- Even a git-detected rename isn't durable: `crates/ocx_lib/src/oci/identifier.rs` was renamed (99% similarity) to `crates/ocx_oci/src/identifier.rs` in the crate split, but that file itself no longer exists — its functions (`segment_is_host`, `ocx_cli_identifier`) later moved again into `crates/ocx_oci/src/package_ref.rs`. A path+symbol citation naming the split-era path is dead twice over; the bare symbol name still resolves.
- Bare symbol-only citation is not a free lunch either: `Identifier` (the struct name) matches 705 files and 784 lines fleet-wide — useless as a search anchor. `segment_is_host` (2 files), `binding_key`/`add_binding_in_memory`/`remove_binding_in_memory` (5 files each, definition always among the hits) are workable. A citation check needs a distinctiveness gate, not just "does rg find it."
- Decision: cite **path + symbol** for anything that has a symbol (a function, type, or const); verify the symbol, not the path, via `rg -n -e "pub fn $SYMBOL(" -e "pub struct $SYMBOL"` — treat the path as a hint for a human, not the check's pass/fail condition.
- A diff-time check that protects every exactly-resolving path an ADR currently cites, and fails when a commit deletes or renames that path without also touching the citing ADR, fired 2 times over ocx's last 200 commits — both true positives. One was the crate-split commit itself (108 hits, would have forced the fix at the moment of breakage instead of 8 days and an audit later). The other, `test/tests/test_smoke_coverage.py` → `test/lint/test_smoke_coverage.py` (`c6a97029`, 2026-09-24), is **still uncited-fixed today**: `adr_crate_split_workspace.md:577` still names the old path three days after the rename.
- Same root cause, a second repo: grimoire's `adr_client_compat_matrix.md` still cites `docs/src/clients.md` (3 occurrences) six weeks after the Starlight migration renamed it to `docs/src/content/docs/clients.md` — one migration commit rotted citations in an ADR that was not itself about the migration.
- The diff-time check's exact-path-only design is deliberately narrow: it cannot catch shorthand-fragment citations (the majority of the fleet's real citation style) breaking, only citations that were once fully resolvable and stopped being so. That gap is a scheduled whole-tree job's job, not a pre-commit gate's.
- Log4brains states the canonical doctrine plainly: "an ADR is immutable. Only its status can change" ([thomvaill/log4brains README](https://github.com/thomvaill/log4brains/blob/master/README.md)). Joel Parker Henderson's collection gives the operational form: "Don't alter existing information in an ADR. Instead, amend the ADR by adding new information, or supersede the ADR by creating a new ADR."
- Decision: a stale citation is repaired by **appending a dated one-line note**, never by silently rewriting the backtick path in the original prose — matching the fleet's own existing habit of appending a `Supersedes:`/`Superseded By:` field rather than rewriting body text (106/444 records already do this, `records.md` §1).
- repowise.dev's 2026 stale-ADR tooling recommends the opposite for drifted rationale — "amend: update rationale while keeping the original decision" — a live, contested departure from the 2011-2021 immutability doctrine, aimed specifically at keeping AI agents from trusting stale text; noted as contested, not adopted here for the same reason Nygard's doctrine exists: an edited "decision" can no longer be trusted as a record of what was actually decided at the time.
- MADR 4.0.0's frontmatter already has a `date:` field defined as "when the decision was last updated" — the template already anticipates a controlled metadata-only update channel; a repair note fits that channel without inventing new machinery.

## Findings

### 1. Full-population rename-rot, all tracked ADRs, three repos

The prior audit sampled 15 ADRs across 7 repos by hand and found 76/169 (45%) of backtick path citations gone (`.agents/research/code-docs-audit/records.md` §3). This dive extended that to **every** tracked ADR in ocx, grimoire and arcana (94 + 41 + 23 = 158 files), using a reproducible script (`rot_scan.py`, this dive, stdlib-only Python, run against the repos at `/home/mherwig/dev/{ocx,grimoire,arcana}`):

| Repo | ADRs | Path mentions | Exact match | Suffix-resolves (unique) | Suffix-ambiguous | Gone | Gone % |
|---|---:|---:|---:|---:|---:|---:|---:|
| ocx | 94 | 1,106 | 430 | 305 | 20 | 351 | 31.7% |
| grimoire | 41 | 264 | 183 | 16 | 0 | 65 | 24.6% |
| arcana | 23 | 303 | 89 | 38 | 121 | 55 | 18.2% |

Method: regex `` `([A-Za-z0-9_.\-]+(?:/[A-Za-z0-9_.\-]+)+\.EXT)` `` over every tracked ADR file's raw text (EXT = a closed list of source/doc extensions), checked against `git ls-files` for exact match; a non-exact citation is "suffix-resolves" only if its **last two path segments** match exactly one tracked file (not a bare basename match — a first pass using basename-only matching produced false "resolved" verdicts for generic Rust filenames like `client.rs`, `mod.rs`, `mirror.rs` that exist in a dozen unrelated crates; re-run with the stricter 2-segment suffix on the same four crate-split ADRs reproduced the audit's hand-checked numbers almost exactly, e.g. `adr_cli_high_low_layering.md`: audit 4/9 gone, this run 4/9 gone).

Rot concentrates in a handful of records, not evenly: in ocx the top 5 records by gone-count hold only 27% of the total gone citations (163 records cite *something* gone, but most cite 1-2), while in arcana the top 5 hold 76% — a small number of records carry almost all of the damage (`.agents/research/code-docs-audit/scratch/` not needed; reproduced from `rot_detail.json` this dive).

### 2. Most "gone" citations were never real same-repo paths — a precision problem, not just recall

Sampling 40 "gone" citations per repo (seed 7) and asking, for each, "did this exact path ever exist and get deleted in this repo's own git history" (`git log --diff-filter=D --all --pretty=%H -- "<path>"`):

| Repo | Sample | Rename-detected | Deleted, no rename pairing | Never existed in this repo's history |
|---|---:|---:|---:|---:|
| ocx | 40 | 6 (15%) | 3 (7.5%) | 31 (77.5%) |
| grimoire | 40 | 9 (22.5%) | 3 (7.5%) | 28 (70%) |
| arcana | 40 | 0 (0%) | 1 (2.5%) | 39 (97.5%) |

"Never existed in this repo's history" is not noise to shrug off — reading the 39 arcana cases by hand, they fall into three buckets, none of which is rename rot:

- **Cross-repo mentions**: `ocx/.agents/plans/plan_ocx_lib_v050.md`, `../ocx-mirror/Cargo.toml`, `ocx-soraka/.claude/skills/swarm-loop/SKILL.md` — arcana's ADRs describe fleet-wide tooling and cite paths that live in *other* repos, by design.
- **Other-ecosystem example paths**: `.opencode/plugins/evil.ts`, `.codex/config.toml`, `.codex/hooks.json`, `.vscode/mcp.json`, `.github/mcp.json` — an arcana ADR illustrating multi-client support names the conventional config path for each client as an example, not a citation into arcana's own tree. Same shape as the grimoire `.cursor/hooks.json` false positive `.agents/research/code-docs-audit/records.md` §2 already flagged for the code→record direction; it recurs here for record→code.
- **Gitignored or aspirational paths**: `.tmp/waves.md` (the same untracked-scratch pattern records.md's Smell #5 already names), and generic illustrative snippets (`src/app.py`, `src/api/routes.rs`) from a design doc that was never implemented under those literal names.

**Consequence for any pointer-check tool**: a naive "does this backtick path exist" scan overcounts arcana's rot by roughly 15-40x (55 raw "gone" vs. ~1-2 real repair-worthy citations) and ocx's by roughly 4x (351 raw vs. ~85 extrapolated real). This mirrors the already-known code→record false-positive rate (43%, `records.md` §2) — the record→code direction has the same failure mode, worse in arcana's case because a fleet-research repo's ADRs legitimately talk about other repos and other tools by name.

### 3. The textbook rename-trace recipe silently fails on the exact case it's for

The commission (and most git tutorials) suggest `git log --follow --diff-filter=R -M -- <path>` to trace a rename. Tested on `crates/ocx_lib/src/oci/client.rs`, a path known to have been renamed in `b79abbe8d39192f33c55a752cc3bca12549c0623`:

```
$ git log --follow --diff-filter=R -M --name-status --all -- "crates/ocx_lib/src/oci/client.rs"
(no output, exit 0)
```

Pinning an explicit starting revision (the deleting commit or its parent) does not help — still empty. The reason: [`--follow`](https://git-scm.com/docs/git-log) is documented as "continue listing the history of a file beyond renames (works only for a single file)" — it walks *backward* from a path that exists at the walk's start point. A path that no longer exists anywhere reachable from the given start never has a matching entry to begin walking from, so the flag has nothing to follow, and git says nothing rather than erroring.

The recipe that actually works, verified on the same path and commit:

```
$ git log --diff-filter=D --pretty=%H -- "crates/ocx_lib/src/oci/client.rs" | head -1
b79abbe8d39192f33c55a752cc3bca12549c0623

$ git show -M --name-status b79abbe8d39192f33c55a752cc3bca12549c0623 | grep -F "crates/ocx_lib/src/oci/client.rs"
R085	crates/ocx_lib/src/oci/client.rs	crates/ocx_oci/src/client.rs
```

But adding the pathspec back to the same command silently degrades the rename to a plain delete:

```
$ git show -M --name-status b79abbe8d39192f33c55a752cc3bca12549c0623 -- "crates/ocx_lib/src/oci/client.rs"
D	crates/ocx_lib/src/oci/client.rs
```

Confirmed this is not a `diff.renameLimit` artifact — `git config --get diff.renameLimit` is unset (built-in default), and the unfiltered `git show -M` call finds the rename with no override needed. The pathspec-filtered form simply reports only the old-side status once a path pattern is applied, dropping the paired new name. This is a real, reproducible git behavior (git 2.54.0, tested here), not a version quirk to shrug off — see [§ AI-agent angle](#ai-agent-angle).

### 4. Citation form durability: path vs path+symbol vs symbol-only

Using the crate-split rename pairs from finding 3 as a natural experiment (`b79abbe8d39192f33c55a752cc3bca12549c0623`):

| Old citation (ocx_lib era) | Path-only today | Path+symbol (single-hop rename trace) | Symbol-only via `rg -w` |
|---|---|---|---|
| `crates/ocx_lib/src/oci/identifier.rs` :: `segment_is_host` | dead | dead — `crates/ocx_oci/src/identifier.rs` (the traced destination) **also no longer exists**; the function moved a second time | resolves: `crates/ocx_oci/src/package_ref.rs:360`, 2 files / 6 hits total |
| `crates/ocx_lib/src/oci/identifier.rs` :: `ocx_cli_identifier` | dead | dead, same double-move | resolves: `crates/ocx_oci/src/package_ref.rs:246`, 8 files / 25 hits |
| `crates/ocx_lib/src/project/mutate.rs` :: `binding_key` | dead | resolves once (`crates/ocx_project/src/mutate.rs`) | resolves, 5 files / 18 hits, definition among them |
| (generic) `Identifier` (struct name alone) | n/a | n/a | **705 files, 784 hits fleet-wide — unusable** |

This is decisive against pure path-based citation and against "trust one rename hop": `identifier.rs` was renamed once by the crate split (git-detected, 99% similarity) and then dissolved a second time into `package_ref.rs` in a later, un-audited refactor — a path+symbol citation that only ever re-resolves the path one hop deep is exactly as stale as a bare path citation once a second refactor lands. The bare symbol name survived both hops because nothing renamed the function itself, only the file it lived in.

Symbol-only citation is not unconditionally safe, though: `Identifier` (a one-word, generic struct name) is common enough across the fleet's schema/type code that grepping it is useless for narrowing down "the" identifier the record meant. matklad's "name, don't link" argument — "[d]o name important files, modules, and types. Do not directly link them (links go stale). Instead, encourage the reader to use symbol search to find the mentioned entities by name" ([matklad, ARCHITECTURE.md](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html)) — holds only when the named symbol is distinctive enough to search for; it does not extend to "any identifier, however common."

### 5. A diff-time check replayed on ocx's last 200 commits: 2 fires, 0 false positives

Built a prototype check (`difftime_replay200.py`, this dive): walk ocx's last 200 commits oldest-to-newest, maintaining a running "protected path" set built from the ADR content **as it stood at each point in history** (not today's HEAD — using today's set would make already-broken citations invisible to a backward replay, since a path that's gone today was already excluded from "protected"). For each commit: if it deletes or renames (old side) a path some currently-tracked ADR cites verbatim, and the same commit doesn't also touch that ADR file, flag it.

```
seed protected paths: 260 from 94 ADRs at b083c88a86
commits replayed: 200; fired: 2
```

Both fires are true positives, hand-verified:

1. **`b79abbe8d39192f33c55a752cc3bca12549c0623`** (the crate dissolve) — 108 distinct old-path hits across more than 40 ADRs in one commit. A gate on this check would have blocked the merge (or required a same-commit citation fix) at the moment of breakage, instead of the rot surfacing 8 days later in an audit.
2. **`c6a9702932c67efcfc3db9b68319faf877bf490f`** (2026-09-24, "feat(test): tiered verification…") — renames `test/tests/test_smoke_coverage.py` → `test/lint/test_smoke_coverage.py` (git-detected, 99% similarity). `adr_crate_split_workspace.md` cites the old path at line 577 and again at line 669. **It is still uncited-fixed as of 2026-09-27**, three days after the rename — confirmed by `grep -n "test_smoke_coverage" .claude/artifacts/adr_crate_split_workspace.md` still returning the old path.

False-positive rate over this replay: **0/2 (0%)**. The check's design is deliberately narrow — it only protects citations that currently resolve exactly, so it cannot fire on the fragment/shorthand style that is most of the fleet's actual citation habit (finding 1's "suffix-resolves" bucket, 305 of ocx's 1,106 mentions). That's a feature for a pre-commit gate (a narrow, high-precision check with observed 0% false positives beats a broad, noisy one at commit time) and a gap a scheduled whole-tree job should fill separately, using the fuzzier suffix-match from finding 1 plus a cross-repo map for citations like the ones in finding 2.

Independent second confirmation, different repo: `grimoire:.agents/adr/adr_client_compat_matrix.md` cites `docs/src/clients.md` (lines 70, 96, 137) — renamed to `docs/src/content/docs/clients.md` in `77558454fd4b1de91f74b1f2d9b3182a887c97c8` (2026-09-07, Starlight docs migration) — an ADR that is *not itself about the docs migration* still carries the stale path six weeks later. Same root-cause shape as ocx: one structural commit rots citations scattered across records that never mention the commit's own subject.

### 6. Prior art: repowise.dev's staleness signal and log4brains' immutability doctrine

[repowise.dev's stale-ADR post](https://repowise.dev/blog/guides/use-git-history-to-catch-stale-adrs-before-they-mislead-agents) (2026, commercial tool marketing copy, not a spec) frames the problem for exactly this program's audience — "[a] stale ADR is worse than no ADR when an AI agent is reading it as truth" — and proposes a *correlation* signal rather than an exact-citation check: map an ADR to the files/symbols it governs, then watch for **co-change bursts**, **interface changes**, **ownership turnover**, **hotspot churn**, and **repeated exception language in commit messages** against those files, flagging staleness when "the ADR's governed files have changed materially in the last few weeks and the decision has not." It does not publish the exact git commands or a false-positive rate; its own three prescribed responses are amend, supersede, or archive.

This is a strictly softer, fuzzier signal than the exact-citation check in finding 5 (it can flag an ADR whose governed area is being actively worked without any citation ever going false), and a strictly weaker guarantee for the concrete failure this dive measured — it would not, by itself, have caught the ocx crate split any faster than the exact-path check did, since "material change" and "decision unchanged" are heuristic, not deterministic. It is complementary as the *scheduled* half of the design (finding 5's closing paragraph): a periodic co-change scan for records that are drifting without an outright-broken citation, alongside the deterministic diff-time gate for citations that do go outright false.

[log4brains' README](https://github.com/thomvaill/log4brains/blob/master/README.md) states the doctrine this program should decide against or for: "As you can guess from the template above, an ADR is immutable. Only its status can change. Thanks to this, your documentation is never out-of-date! Yes, an ADR can be deprecated or superseded by another one, but it was at least true one day! And even if it's not the case anymore, it is still a precious piece of information." No tool support for citation-repair is mentioned; log4brains' own roadmap lists an `@adr` annotation "to include code references in ADRs" as a "coming soon" feature, meaning even a purpose-built ADR tool from this era has not yet solved the exact-citation-tracking problem this dive measured.

### 7. Immutability: three sources, two say append, one says amend

Michael Nygard's original 2011 post does not explicitly rule on editing an accepted ADR's body, but its numbering discipline implies it: "ADRs will be numbered sequentially and monotonically. Numbers will not be reused," and a reversed decision is handled by keeping "the old one around, but mark it as superseded" ([Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)) — new information gets a new record, not a rewrite of the old one.

[Joel Parker Henderson's ADR collection](https://github.com/joelparkerhenderson/architecture-decision-record) states the operational rule directly: "Don't alter existing information in an ADR. Instead, amend the ADR by adding new information, or supersede the ADR by creating a new ADR" — and separately recommends a periodic after-action review (e.g., one month post-decision) rather than continuous silent correction, plus notes tools ("Decision Guardian," "ADR Guard") that surface relevant ADRs on a pull request touching their governed paths — the same "code → record, resolved by tooling, not by an agent's memory" pattern `records.md` §6 already found in `grimoire:.claude/hooks/post_tool_use_tracker.py`.

Against both: repowise.dev explicitly recommends "amend — update rationale while keeping the original decision" as one of three responses to a stale ADR, without carving out the citation vs. substance distinction this dive draws (finding in [§ Contested / evolving](#contested--evolving)).

MADR 4.0.0's frontmatter already carries a `date:` field, defined in the template as "when the decision was last updated" ([adr/madr, `adr-template.md`, 4.0.0 tag](https://github.com/adr/madr/blob/4.0.0/template/adr-template.md)) — a controlled, structured place for "this record was touched" that doesn't require rewriting the prose it's attached to. The fleet's own hybrid format already has an equivalent pattern in production: 106/444 records carry a real `Supersedes:`/`Superseded By:` value (`records.md` §1) — new information gets a new field, not a rewritten paragraph.

## Normative guidance candidates

1. **A code-referencing citation in a decision record MUST name a symbol (function, type, const, or macro name), not only a path.** Rationale: prevents the single-hop failure mode in finding 4, where a path+symbol citation that only re-resolves the path once (via a rename trace) goes stale again on a second, unaudited refactor, while the bare symbol survives. Verify: `rg -c -w -e "$SYMBOL" -g '*.rs' crates/` (or the language's source glob) returns at least 1; a citation with zero hits is dead outright. Severity: **MUST**.

2. **A cited symbol MUST resolve to a plausibly-unique definition, not just any occurrence.** Rationale: prevents the `Identifier`-class failure (705 files, unusable as a search anchor) from passing a check that only asks "does it exist anywhere." Verify: `rg -n -e "pub fn $SYMBOL(" -e "pub struct $SYMBOL" -e "pub enum $SYMBOL" -g '*.rs' crates/` must return exactly one line; if it returns zero, the symbol moved or was renamed (dead citation); if it returns more than one, the record must qualify with a module path (`ocx_oci::package_ref::segment_is_host`, matching the qualified form ocx's own doc comments already use at `ocx:crates/ocx_announce/src/forge.rs:112`). Demonstrated on real fleet data this dive: `segment_is_host` (2 files / 1 definition, passes), `binding_key` (5 files / 1 definition among them, passes with qualification advised), `Identifier` (705 files, fails outright). Severity: **MUST**.

3. **A commit that a check's `git show -M --name-status` marks as `D` (not `R`) for a path some ADR cites, or that renames such a path without touching the citing ADR, MUST fail CI unless the same commit also edits the citing record.** Rationale: this is the deterministic half of the design — finding 5 shows it fires exactly on real rot (2/200, both true positives) with an observed 0% false-positive rate over 200 real commits, and would have caught the 108-citation crate-split break and the still-open `test_smoke_coverage.py` rename at the moment each happened. Verify: replay the prototype recipe — build the protected-path set from `` `([A-Za-z0-9_.\-]+(?:/[A-Za-z0-9_.\-]+)+\.[a-z]+)` `` matches in tracked `.claude/artifacts/adr_*.md` files that resolve exactly against `git ls-files`, then for the commit under test (`COMMIT=b79abbe8d39192f33c55a752cc3bca12549c0623` as a worked example) run `git show -M --name-status "$COMMIT"` and check old-side paths against that set. Severity: **MUST** (diff-time gate; narrow by design, see guidance 6 for the complementary scheduled job).

4. **When tracing whether a now-missing path was renamed, MUST NOT use `git log --follow --diff-filter=R -M -- <path>` on a path that no longer exists — it returns nothing, silently, exit 0, and looks identical to "no rename happened."** Rationale: finding 3, reproduced end to end on 5 known-renamed ocx paths. Verify (the working replacement): `git log --diff-filter=D --pretty=%H -- "$OLD_PATH" | head -1` to find the deleting commit, then `git show -M --name-status "$COMMIT"` **with no trailing pathspec** and grep for `$OLD_PATH` in the unfiltered output — an `R<NN>` line means a rename was detected (giving the new path); a `D` line (or no line at all) means git's similarity heuristic did not pair it, which is itself information (the content changed too much, or the move happened as a separate delete+add across commits). Severity: **MUST** (as a rule for any script or agent instruction that performs this trace — this is a correctness bug, not a style preference).

5. **A commit that dissolves, splits, or bulk-renames a module/crate MUST run the unfiltered `git show -M --name-status <commit>` rename map and either fix every ADR the map's old-side paths appear in within the same commit, or attach the rename map to the commit/PR body.** Rationale: both real rot events found this dive (ocx's crate split, grimoire's Starlight migration) are single large commits that broke citations scattered across records that never mention the refactor; a scheduled per-record staleness check would find each of them independently and too late (records.md §3's "root cause, not independent rot" finding, reproduced and quantified here). Verify: for a candidate bulk-rename commit (`COMMIT=b79abbe8d39192f33c55a752cc3bca12549c0623` as a worked example), `git show --numstat --format='' "$COMMIT" | wc -l` over some threshold (e.g., >50 files touched) plus `git show -M --name-status "$COMMIT" | rg -e '^R' | wc -l` > 0 flags a commit that needs this treatment; a planted check would compare that rename map against guidance 3's protected-path set. Severity: **SHOULD** (process guidance for the humans/agents authoring the refactor; guidance 3 is what actually blocks the merge).

6. **A stale citation MUST be repaired by appending a dated one-line note, never by silently rewriting the original backtick path or prose.** Rationale: preserves the audit-trail property that makes a decision record trustworthy (log4brains: "an ADR is immutable... it was at least true one day"; Henderson: "[d]on't alter existing information... amend... by adding new information") while still getting the pointer working again for a cold agent — matches the fleet's own existing habit of adding a `Supersedes:`/`Superseded By:` field rather than rewriting body text (106/444 records, `records.md` §1). Verify (named reading heuristic, no mechanical check proposed yet): a reviewer diffing a "citation repair" commit against an ADR should see only additions inside a designated trailing section (proposed heading: `## Citation updates`), never a changed line inside `## Context`, `## Decision`, or `## Consequences`. Severity: **SHOULD**.

7. **A scheduled (not diff-time) whole-tree job SHOULD run the fuzzy suffix-match check from finding 1 (2-segment-suffix resolution against the current tree) plus a fleet cross-repo path map, to catch the shorthand-fragment and cross-repo citation styles the diff-time gate structurally cannot.** Rationale: the diff-time gate (guidance 3) only protects exact-resolving citations (305 of ocx's 1,106 mentions were shorthand, invisible to it); the scheduled job's job is precisely the fragment style plus the cross-repo case from finding 2, which needs to check against a repo the diff being gated doesn't include. Verify: `rot_scan.py`'s method, generalized — run monthly, diffed against last month's baseline (same ratchet-baseline pattern as `/home/mherwig/dev/ocx/scripts/lint_ratchet.py`), reporting new "gone" entries only, not the full backlog every run. Severity: **CONSIDER** (the check design is sound and demonstrated; wiring it into a schedule is an implementation task outside this dive's evidence).

## AI-agent angle

An agent asked "did this path get renamed, or is this citation just dead?" will very plausibly reach for `git log --follow --diff-filter=R -M -- <path>` — it is the first result a search for "trace git rename" returns, and it is the exact phrasing this dive's own commission brief suggested testing. Finding 3 shows this returns nothing for precisely the case being asked about (a path that no longer exists), and an agent reading empty output will report "no rename found, the citation is simply dead" — a **false negative that looks like a clean, confident answer**, worse than an error message because nothing signals the tool failed to look. The smallest mechanical check: never trust an agent's "no rename found" claim about a missing path unless it also shows the `git show -M --name-status <deleting-commit>` output (no trailing pathspec) it based that claim on — a one-line rule in the record-to-code repair skill.

A second, related mistake: an agent repairing a citation will be tempted to trust the *first* rename hop it finds and stop there. Finding 4 shows a citation can survive one rename trace and still be dead — `identifier.rs` moved once (crate split) and then dissolved a second time into `package_ref.rs`. The mechanical check: after any rename trace, re-verify the destination path still exists at HEAD (`git ls-files --error-unmatch "$NEW_PATH"`) before declaring the citation repaired; if it doesn't, chase the next hop the same way rather than reporting success.

A third mistake, purely quantitative: an agent building or trusting a naive "how much rot is there" scan will over-trust a bare backtick-path regex and report arcana-scale numbers (55 "gone" citations) as decayed same-repo pointers, when 39 of 40 sampled ones were never real arcana paths at all (finding 2). The mechanical check: before counting a "gone" path as rot, confirm `git log --diff-filter=D --all -- "$PATH"` returns at least one commit in *this* repo's history — a citation with no deletion commit anywhere was either never real here, is a cross-repo mention, or is an illustrative example, not rot.

## Contested / evolving

- **Amend-in-place vs. append-only repair for a stale citation is a live disagreement, not a settled one.** The 2011-2021 line (Nygard, log4brains, Henderson) treats an accepted record as immutable except for status and supersession. repowise.dev, a 2026 tool built specifically for AI-agent consumption of ADRs, recommends amending rationale in place as one of three standard responses to drift — explicitly optimizing for "don't let the agent read stale text" over "preserve what was actually decided." This dive sides with the older doctrine for the citation-repair case specifically (guidance 6) because a citation is metadata about where evidence lives, not part of the decision's substance, and the two can be kept separate without picking a side on whether *rationale* itself may ever be amended — that broader question is unresolved and trending toward "yes, for agent consumption" as of 2026.
- **Whether a diff-time check should hard-fail on every detected rename, or only on renames git's own `-M` heuristic cannot pair, is an open design choice this dive did not settle empirically.** The replay in finding 5 hard-failed on both git-detected renames (guidance 3's design) and genuine deletes alike; a softer variant would auto-suggest the new path for a clean `R` pairing and only hard-fail on a bare `D`. No fleet evidence here favors one over the other — it is a false-positive-tolerance judgment call for whoever owns the CI gate.
- **Log4brains lists code-reference annotations (`@adr`) as "coming soon"** as of this dive's research (its README, fetched 2026-09-27) — meaning even a purpose-built, actively maintained ADR tool has not yet shipped a citation-tracking feature. The fleet is not behind the state of the art here; there may not yet be a state of the art to be behind.

## Decisions this dive proposes

- **The citation form records use: path + symbol, with the symbol as the load-bearing, checked part.** Reason: finding 4's natural experiment shows path-only citations die outright at the first rename and path+symbol citations trusted only one hop deep die at the second; a bare, sufficiently distinctive symbol name survived two structural moves in the same real crate split. Path stays in the citation because it's the useful hint for a human skimming the record and because not every citation target has a symbol (a whole file, a config key, a doc page) — but the check (guidance 1-2) verifies the symbol, not the path.
- **The diff-time check, its command, and its measured false-positive rate**: build the protected-path set from exact backtick-path matches in tracked decision records that currently resolve against `git ls-files`; for each new commit, run `git show -M --name-status <commit>` and fail if an old-side path in that set is deleted or renamed without the same commit touching the citing record. Replayed over ocx's last 200 commits: **2 fires, 0 false positives** (both confirmed real — the crate-split commit and a still-open rename from 3 days before this research). This is guidance 3, and it is a MUST because the measured false-positive rate on real history is 0%.
- **The edit-versus-addendum rule: addendum, never edit.** A stale citation is repaired by appending a dated, one-line note (proposed section: `## Citation updates`) rather than rewriting the original backtick path or surrounding prose. Reason: two of three fetched primary sources on ADR practice (log4brains, Henderson) independently converge on "amend by adding, never by altering," the fleet already practices the equivalent pattern for supersession (106/444 records, `records.md` §1), and MADR 4.0's `date`-last-updated frontmatter field already anticipates a structured, non-prose update channel. repowise.dev's contrary "amend rationale in place" recommendation is noted but not adopted (see Contested / evolving) — it addresses a different problem (stale *rationale*, not a stale *pointer*) and this dive's evidence is about pointers specifically.

## Sources

| URL or path | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [cognitect.com/blog/2011/11/15/documenting-architecture-decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) | Michael Nygard's original ADR post | 2011 (fetched 2026-09-27) | The doctrine everything else in this space either follows or reacts against; source for the immutability-except-status norm |
| [github.com/adr/madr, 4.0.0 template](https://github.com/adr/madr/blob/4.0.0/template/adr-template.md) | MADR 4.0.0 full and minimal templates, raw-fetched | released 2024-09-17 (fetched 2026-09-27) | Current canonical field set; shows the `date`-last-updated frontmatter channel this dive's addendum decision reuses |
| [github.com/thomvaill/log4brains, README](https://github.com/thomvaill/log4brains/blob/master/README.md) | Docs-as-code ADR tool, README, raw-fetched | tool active, README fetched 2026-09-27 | States the immutability doctrine in one explicit sentence; roadmap shows code-reference annotation is still "coming soon" fleet-wide, not just here |
| [repowise.dev/blog/.../use-git-history-to-catch-stale-adrs-before-they-mislead-agents](https://repowise.dev/blog/guides/use-git-history-to-catch-stale-adrs-before-they-mislead-agents) | Commercial tool's blog post on stale-ADR detection for AI agents | 2026 (fetched 2026-09-27) | Only 2026-era, AI-agent-specific prior art found; its co-change/hotspot signal is the complementary "scheduled" half this dive's diff-time check doesn't cover; its "amend in place" stance is the contested counterpoint |
| [matklad.github.io/2021/02/06/ARCHITECTURE.md.html](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html) | matklad's ARCHITECTURE.md post | 2021 (fetched 2026-09-27) | Source of "name, don't link"; this dive's finding 4 is a direct empirical test of that claim's limits (generic names don't survive it) |
| [github.com/joelparkerhenderson/architecture-decision-record](https://github.com/joelparkerhenderson/architecture-decision-record) | Widely-used ADR template/practice collection | fetched 2026-09-27 | Gives the operational form of the immutability doctrine ("amend by adding, or supersede") that this dive's edit-vs-addendum decision follows |
| [git-scm.com/docs/git-log](https://git-scm.com/docs/git-log) | Official git-log manual | fetched 2026-09-27 | Confirms `--follow` is documented as single-file, backward-walking only — the doc basis for finding 3's mechanical gotcha, independently reproduced against real ocx history |
| `code-docs-audit/records.md` §1, §2, §3 | Fleet audit: 444 tracked decision records, code→record and record→code pointer health, 15-ADR hand sample | measured 2026-09-27 | The baseline this dive extends to full population; source of the 45%/15-ADR figure this dive's 158-ADR run is checked against |
| `ocx` commit `b79abbe8d39192f33c55a752cc3bca12549c0623` (`refactor!: dissolve ocx_lib into 17 responsibility-derived crates`, local repo only, not fetched over the network) | The actual crate-split commit, 944 files changed | 2026-09-19 | Primary fleet evidence for findings 1, 3, 4, 5 — the single commit responsible for most of ocx's measured rot |
| `ocx` commit `c6a9702932` (`feat(test): tiered verification with cached concurrent acceptance targets`) | A small, recent, still-uncited-fixed rename | 2026-09-24 | Proves the rot mechanism is still live today, not a one-time historical event; the diff-time check's second true positive |
| `grimoire` commit `77558454fd` (Starlight docs migration) + `grimoire:.agents/adr/adr_client_compat_matrix.md:70,96,137` | A second repo's structural-rename rot, independent of ocx | 2026-09-07 | Cross-repo confirmation that "one bulk-rename commit rots citations scattered across unrelated records" is a general pattern, not an ocx-crate-split idiosyncrasy |
| `rot_scan.py`, `rename_trace.py`, `difftime_replay200.py` (this dive, stdlib Python, run against `/home/mherwig/dev/{ocx,grimoire,arcana}`) | This dive's own measurement scripts and their real outputs | run 2026-09-27 | Source of every number in findings 1, 2, 5 — reproducible, not sampled from memory or a prior write-up |
| `rg -w` symbol-resolution runs over `/home/mherwig/dev/ocx/crates/` (`Identifier`, `ocx_cli_identifier`, `segment_is_host`, `binding_key`, `add_binding_in_memory`, `remove_binding_in_memory`) | This dive's own symbol-durability measurement | run 2026-09-27 | Source of finding 4's table; the only place the "symbol-only can also fail" nuance is grounded in real fleet data rather than asserted from matklad's post alone |
| `.agents/research/code-docs-topic-map.md` §"record-to-code-rot" row and "What the grounding changed" | The commissioning topic map | 2026-09-27 | States this direction was audit-only with no wave-1 scout named, and gives the 45%/169-citation figure this dive was commissioned to extend |
