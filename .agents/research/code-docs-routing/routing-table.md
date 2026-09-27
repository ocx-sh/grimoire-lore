---
title: "code-docs routing: where everything else goes"
topic: code-docs / routing-table
agent: research-lang / code-docs-routing
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 20
scope: >
  What one-line test sends each kind of comment content to which store
  (guard, why-constraint, contract, essay, record-paraphrase, pointer,
  provenance, todo-debt, narration, tautology, section-marker), whether a
  commit body may hold provenance across this fleet's rebase/finalize/squash
  flow, and when a reason belongs in a paths-scoped rule instead of a
  comment. Does not build the classifier, the length ratchet, or the guard
  recognizer — those are guard-shape, length-and-ratchet and
  cleanup-procedure's jobs; this dive only decides destinations and tests,
  and demonstrates each on real fleet code and git history.
---

# code-docs routing: where everything else goes

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  - [1. The routing table](#1-the-routing-table)
  - [2. Commit bodies across hex-finalize's rewrite](#2-commit-bodies-across-hex-finalizes-rewrite)
  - [3. Path-scoped rules and the discoverability hook](#3-path-scoped-rules-and-the-discoverability-hook)
  - [4. Essay-split: four fleet essays and one 97-line function](#4-essay-split-four-fleet-essays-and-one-97-line-function)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Decisions this dive proposes](#decisions-this-dive-proposes)
- [Sources](#sources)

## Summary

- The routing table has 11 destinations for 11 comment categories; only three of them are a comment at all (guard, why-constraint, contract) — the rest are a decision record, a pointer, a marker, or nothing.
- A pointer routes correctly only when it is file-qualified (`adr_x.md` plus an anchor); a bare short ID is not a weaker pointer, it is not a pointer — measured today: `C-018` still resolves in 21 tracked `.claude/artifacts/*.md` files in ocx, and `plan_toolchain_activation.md` is still cited by 14 files under `crates/` although the file itself was renamed and no longer exists.
- Provenance (a historical fact with no bearing on today's code) may route to a commit body as a secondary, best-effort record; it must never be the only place a MUST-level reason lives, because `hex-finalize` derives every recomposed commit's body from the diff alone, never from the original branch commit's text.
- Measured on a real finalize: ocx's `feat/extra-ca-certs` branch went from 25 pre-finalize commits (`backup/feat/extra-ca-certs-pre-finalize`) to 10 post-finalize commits; durable mechanism reasoning (issue numbers, invariants) survived, session-local review markers ("Review D2 (option b)", "W8") did not.
- The backup ref sampled for that measurement still carries hex-finalize's *armed* name (`backup/<branch>-pre-finalize`) rather than the terminal inert form its own contract specifies — a stale lock or an interrupted run, not this dive's job to resolve, but worth the owner's attention.
- A forge squash-merge is a second rewrite past hex-finalize's own: GitHub's default squash message "can include the pull request title, pull request description, or commit information" depending on settings, not a guarantee every commit's body survives verbatim.
- Essays are 6% of sampled fleet comment lines but the single highest-value split target: none of the four sampled essays, nor `env.rs::is_ocx_trampoline`'s 97-line doc block, is pure narration — each mixes a real guard or contract with an argument that belongs in a decision record.
- Splitting `is_ocx_trampoline` by the routing table keeps roughly half its length (it is one of the fleet's most guard-dense functions) and removes exactly one header (`# Why this has a body while its sibling C-010 exclusion does not`) whose content guards nothing.
- ocx-catalog's `.lighthouserc.cjs` essay is not one category but three folded together: the threshold numbers are narration (already expressed in the config object below), the ratchet-margin story is a why-constraint, and the preset-rejection argument is a genuine essay that this thin-ADR repo has nowhere else to put.
- grimoire-vscode's `rows` field doc, sampled as an essay by the length-based classifier, is actually a mis-filed guard: it names the exact regression ("index-published signals blinked out on the second paint") a future edit could reintroduce.
- Claude Code's own path-scoped rules fire "when Claude reads files matching the pattern, not on every tool use" — a comment-governing rule can silently not have loaded before a Write-only edit, which is the concrete case for a PostToolUse-hook backstop.
- grimoire's `post_tool_use_tracker.py` already resolves a touched path to its governing subsystem rule, but from a hand-maintained 4-row table, not from the rules' own `paths:` frontmatter — the same staleness failure mode already found in `arch-principles.md`'s ADR index.
- Two independent, un-cross-referenced rules already collide on ocx's own `**/*.rs` glob (`quality-rust.md`'s "Patterns to Preserve" protects exactly the phase/step comments `docs-and-tracing.md` DOC-19 bans) — re-confirmed today, `grep -c rust-quality quality-rust.md` is still 0.
- A record-paraphrase's most common failure in the fleet is not "no pointer" — it is "pointer added, essay not removed" (2 of 10 spot-checked ocx sites keep both).
- Joel Parker Henderson's ADR-worthiness filter ("skip an ADR when a decision is limited in scope and time and risk and cost, or is already covered elsewhere") is a workable per-block test for whether an essay needs a new record or can just be cut.
- Michael Nygard's immutability rationale ("nobody is left scratching their heads to understand 'what were they thinking'") is why record-paraphrase deletes the restatement but never edits the record it points at — supersede, never rewrite.
- matklad's naming-over-linking rule ("use symbol search to find the mentioned entities by name") already shows up unprompted in the fleet: ocx-catalog's `labels.ts` names sibling functions by identifier, never by file link, and that pattern never rotted in this audit's sample while file-path citations rotted 45% of the time fleet-wide.

## Findings

### 1. The routing table

Eleven categories, from the taxonomy `sample.md` hand-classified over a 320-block seeded fleet sample ([code-docs-audit/sample.md §2](../code-docs-audit/sample.md)). Only guard, why-constraint and contract stay as a source comment; everything else either becomes a different artifact or is deleted.

| Category | Destination | One-line routing test | Survives this fleet's git flow |
|---|---|---|---|
| guard | Stays local: `//` at the exact line, or the constraint's own `#[test]`/`def test_` doc comment when a test proves it | Would a plausible rewrite of this line or function break something no type, lint or test already forbids? | Yes — it is text in the current tree, untouched by rebase, finalize or squash |
| why-constraint | Stays local, one sentence, `//` (or `///` only if caller-visible) | Is the reason local to this function and would a competent reader ask "why this way" on first read, with no single named breaking edit? | Yes, same as guard |
| contract | `///`/docstring/TSDoc on the item; scope to the "external consumer surface" DOC-10 already names | Does a caller outside this file or crate need this to use the item correctly (behaviour, errors, panics, invariants)? | Yes |
| essay | Split: 1-2 line invariants stay local; the argument, alternatives and history move to a decision record; one file-qualified pointer replaces the essay in code | Does the comment argue for a decision — weigh alternatives, cite history, or something a maintainer could contest — rather than just state one? | The local half: yes. The moved half: yes only if the target ADR stays tracked and the pointer stays file-qualified (records.md: 45% of sampled ADR path citations already rot after a crate split, but the ADR *files themselves* are 96/96 and 23/23 tracked — the record store is healthy, the citations are what rot) |
| record-paraphrase | Delete the paraphrase; keep only a file-qualified pointer | Does the comment restate content that already lives, verbatim or near it, in a tracked record? | Yes for the pointer; the paraphrase itself was never worth preserving |
| pointer | Stays, file-qualified only: `adr_x.md` / `plan_x.md` plus a heading or decision letter, never a bare short ID alone | Does the comment name a document instead of arguing the case itself? | Yes if file-qualified (100% of sampled file-qualified pointers resolved: `sample.md` Contradictions, `config.md` §4 spot-checks 1 and 6); no if bare — `C-018` alone resolves in 21 tracked files today (re-measured, [§2](#2-commit-bodies-across-hex-finalizes-rewrite) below has the command) |
| provenance | Best-effort: the finalized commit body, or a quantified inline note beside what it explains. Never the sole record of a fact that still constrains an edit — that fact was mis-filed and is actually a guard | Is this a historical fact about how the code came to be, with no bearing on a plausible future edit? | Partially, and only after `hex-finalize`'s rewrite discards the original wording — see [§2](#2-commit-bodies-across-hex-finalizes-rewrite) |
| todo-debt | A self-resolving marker naming its own ceiling and upgrade path (`ponytail:`-shaped), never a bare ID pointing elsewhere | Does this name a deliberate, deferred shortcut? | Yes — the marker carries its own payload, nothing external to rot |
| narration | Delete | Does the very next line already say this, in code? | N/A — it should not exist |
| tautology | Delete, or state the convention once at module/class level if it repeats per method | Does the comment add nothing the identifier's own name doesn't already say? | N/A |
| section-marker | Delete unless a tool literally parses the exact banner text (rare) | Is this pure navigation, no content? | N/A |

Two categories from the wider fleet taxonomy fold into rows above rather than getting their own: **process-id** (a bare `C-`/`WP-`/`DEC-` token with no surrounding argument) is a pointer that failed the file-qualification test — it routes to the pointer row's negative case, never its own destination. **Plan/decision-ID collision is a minting problem, not a comment-content problem** ([sample.md Patterns worth encoding](../code-docs-audit/sample.md#patterns-worth-encoding)): the fix belongs in whatever mints `C-NNN` (`hex-init/assets/templates/plan.md`, `hex-core/references/protocol.md` "Traceability IDs"), not in the comment-routing rule.

**Verified today, not inherited**: the two directional pointer checks below both ran against the live ocx tree.

Dead pointer (renamed file, bare grep instead of a tracked-file check would have missed this rot):
```
cd /home/mherwig/dev/ocx
git ls-files --error-unmatch .claude/artifacts/plan_toolchain_activation.md
# error: pathspec did not match any files — confirmed dead
grep -rl "plan_toolchain_activation.md" crates --include='*.rs' | wc -l
# 14 — still cited by 14 files under crates/
```
Live, file-qualified pointer (the positive control — same repo, same command shape):
```
git ls-files --error-unmatch .claude/artifacts/adr_index_indirection.md
# resolves — this is the file the same 14-file-cited plan should have become
```
Bare-ID collision, re-measured (config.md found ≥20 files; today's count is close, not identical — both are real, neither is stale):
```
ID=C-018
grep -rl -e "$ID" /home/mherwig/dev/ocx/.claude/artifacts/*.md | wc -l
# 21
```
Good vs. bad pointer form, side by side, both in prod scope:
- **Correct**: `ocx:crates/ocx_store/src/file_structure.rs:53` — `` `OCX_INDEX` at the CLI seam (`adr_index_indirection.md` A1) `` — file-qualified, resolves, names the decision letter.
- **Incorrect**: `ocx:crates/ocx_package_manager/src/tasks/pull.rs:669` — "pipeline (commit 40b001f) is meant to live end-to-end on this path" — points at a bare commit SHA, which a future rebase of the same repo can make unreachable by that hash; grepping `crates --include='*.rs'` for a commit-SHA-shaped pointer in a doc/plain comment found exactly this one hit fleet-wide, so it is rare, not a pattern — but it is the wrong shape, and the routing table's pointer row should ban it explicitly (see [Normative guidance §2](#normative-guidance-candidates)).

matklad's naming-over-linking rule shows up already, unprompted, right beside a case where it matters: `ocx-catalog:src/sources/labels.ts:163` — `` Exact sibling of `checkIndexNamespaceCollisions` `` — names a sibling function by identifier, not by file-and-line. That citation form cannot rot the way a `crates/ocx_lib/src/oci/client.rs`-style path citation rots after a rename (`records.md §3`, 45% dead in the 15-ADR sample): a symbol search still finds a renamed function; nothing finds a deleted file path except grep-and-guess ([matklad, ARCHITECTURE.md](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html)).

### 2. Commit bodies across hex-finalize's rewrite

The frame's premise (`code-docs-frame.md`, prior evidence) was a table routing "history and provenance" straight to the commit body. This fleet's git flow makes that only conditionally true, and the mechanism is documented, not inferred.

**The contract, read directly**: [`hex-finalize/SKILL.md`](/home/mherwig/.claude/skills/hex-finalize/SKILL.md) "Recompose" § C-807/C-808 states the rewrite mechanism —`git reset --soft <fetched-target-tip>` collapses the whole branch diff into one staged tree, then the series is rebuilt commit-by-commit from that diff, not from the original commits. C-808 is explicit about what a body may and may not carry:

> "No trailer is ever copied from a branch commit message. A recomposed message is derived from the diff, and the two trailers generated here are the only ones it carries; an original message may inform the summary line alone."

That last clause is the load-bearing one: the **subject line** may echo the original WIP message; the **body** is derived from the diff, full stop. Any reasoning that lived only in prose in a WIP commit's body is not mechanically guaranteed to reach the final series — it reaches it only if the agent running `/hex-finalize` chooses to read the old history and fold that reasoning back in while writing the new body.

**Measured on a real finalize** — ocx's `feat/extra-ca-certs` branch, compared against its own pre-rewrite snapshot:

```
cd /home/mherwig/dev/ocx
git rev-list --count backup/feat/extra-ca-certs-pre-finalize \
  ^$(git merge-base backup/feat/extra-ca-certs-pre-finalize main)
# 25
git rev-list --count feat/extra-ca-certs ^$(git merge-base feat/extra-ca-certs main)
# 10
```

25 pre-finalize commits became 10 post-finalize commits. Reading full bodies on both sides (`git log -1 --format='%B' <sha>`) shows what actually happened, not just the count:

- **Durable mechanism reasoning survived, reworded and consolidated.** The post-finalize commit `5c75411` ("feat(tls): trust extra CA roots from config.toml or `OCX_EXTRA_CA_CERTS`...", 49-line body) states the same load-bearing facts three pre-finalize commits argued separately: the corporate-proxy motivation with its issue number (`#448`), the 32 KiB read cap and `O_NONBLOCK` guard against a FIFO hang, the fail-closed exit-code parity with the Sigstore pair, and the two carve-outs (managed-config fetch, Sigstore client) — all present, all still correct, none of it copied verbatim from any one pre-finalize commit.
- **Session-local review artifacts did not survive, and correctly so.** Pre-finalize bodies carry "Review D2 (option b)" (`e2686016`), "the previous shape is gone with the case it described (W8: ...)" (`e2686016`), and file-scoped refactor notes ("WP-2's test-only home for it", `20298668`) — none of that vocabulary appears in the consolidated body. These are exactly the review-round/plan-ID artifacts the plan-ids dive already flags as fleet-wide collision risks (`C-018` alone resolves in 21 files); losing them from the permanent record is the correct outcome, not an accident.
- **The backup ref that makes this comparison possible is itself in an unexpected state.** `hex-core/references/finalize.md` § "Backup-ref lifecycle" (C-809) names two ref forms: **armed** — `backup/<branch>-pre-finalize`, created before the first history-modifying operation, the sole predicate `hex-state.md` checks for an in-flight run — and **inert** — `backup/<branch>-<pre-rewrite-short-sha>`, the terminal, durable form "every terminal outcome performs the rename" into. The ref sampled here, `backup/feat/extra-ca-certs-pre-finalize`, still carries the **armed** name today, not the inert one. Per this fleet's own contract that means either an interrupted run or a stale, un-released lock on that branch — not this dive's job to chase further, but worth flagging: an agent that finds provenance only in an armed-named backup ref cannot assume the ref survives, or that the branch is safe to build on ([hex-state.md](../../../../../.claude/rules/hex-state.md) codifies exactly this check).

**The verdict**: provenance *may* route to a commit body, but only as a secondary, best-effort record of a logical change's *settled* reasoning after the fact — never as the sole store for something a cold agent needs while editing the code. Three independent reasons stack, not one:

1. **Structural**: `hex-finalize`'s body is diff-derived, not copied — C-808 above. A WIP note that never gets read back in during recompose is gone from the branch tip, full stop, unless the agent doing the recompose happens to preserve it.
2. **Reachability**: even where the original wording survives only on a `backup/*` ref, [hex-state.md](../../../../../.claude/rules/hex-state.md) and this fleet's [worktree-hygiene convention](/home/mherwig/.claude/CLAUDE.md) both treat those refs as disposable once the work they anchor has landed — nothing audited here guarantees an armed or inert backup ref outlives the PR that used it.
3. **A second rewrite waits past the first**: GitHub's own merge-strategy documentation states a squash merge's default message "can include the pull request title, pull request description, or commit information, depending on repository settings" ([GitHub Docs, About pull request merges](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges)) — not a guarantee that every commit's own recomposed body, however carefully written, reaches `main` verbatim. `hex-finalize`'s own ground for defaulting to a bisectable series rather than one commit is exactly this: "squash-to-one is unrecoverable loss performed on the human's behalf, while a series can still be squashed by the merge button — the reversible direction" (`hex-finalize/SKILL.md` "Recompose") — the series format is chosen *because* the forge might still squash it, which is itself the confirmation that a commit body's survival past the PR is not this program's to guarantee.

None of this contradicts records.md's finding that the store is healthy in the other direction: ocx's last 300 commits carry a body 92% of the time, median 17 lines, and grimoire's are 78% `Signed-off-by`-trailed ([records.md §5](../code-docs-audit/records.md#5-git-history-as-a-store)). Commit bodies are a genuinely good place to *write* the settled why of a finished change, for git-blame archaeology and changelogs — they are just not a place a MUST-level rule may point *to* as the only copy.

### 3. Path-scoped rules and the discoverability hook

Claude Code's own memory documentation is specific about when a `paths:`-scoped rule fires, and it is not "on every edit":

> "Path-scoped rules trigger when Claude reads files matching the pattern, not on every tool use." ([code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory))

That single sentence is the whole argument for a PostToolUse-hook backstop: an agent that writes a brand-new file without ever reading a matching existing one, or one whose edit tool bypasses the file-read event the rule keys on, can complete an edit having never seen the rule that should have governed its comments. This is not hypothetical in this fleet — `docs-and-tracing.md` itself has **no `paths:` frontmatter today** (re-verified, still true: `records.md §6`, `config.md §1.1`), so it never auto-loads on `**/*.rs` at all, reached only through `rust-quality.md`'s own routing table.

**A working example already exists, and it is a hook, not a rule.** `grimoire:.claude/hooks/post_tool_use_tracker.py:31-36` ([full file read](/home/mherwig/dev/grimoire/.claude/hooks/post_tool_use_tracker.py)) maps a touched path glob to a named subsystem-rule file and prints a reminder after every matching Edit/Write/MultiEdit:

```python
CONTEXT_REMINDERS: list[tuple[str, str, str]] = [
    ("src/file_structure/**", "subsystem-file-structure.md", "File Structure"),
    ("src/command/**", "subsystem-cli-commands.md", "CLI Commands"),
    ("src/api/**", "subsystem-cli-api.md", "CLI API"),
    ("src/**", "subsystem-cli.md", "CLI"),
]
```

This is exactly the shape the commission asks about, already shipped, already fleet-proven. But it has the same staleness exposure `records.md` already found in `arch-principles.md`'s own ADR index (one tracked, heavily-cited ADR missing from its own table): the mapping is a **hand-maintained 4-row table**, not generated from the rules' own `paths:` frontmatter. Confirmed today:

```
grep -n "paths:" /home/mherwig/dev/grimoire/.claude/hooks/post_tool_use_tracker.py | wc -l
# 0
```

`records.md`'s own `scan_rules.py` (§6) already proves the alternative is cheap: it walked every tracked `.claude/rules/**/*.md`, parsed the YAML `paths:` key, and reported "42 with a `paths:` glob" out of 261 rule files in ocx — the same information the hook should be printing dynamically, generated once at run time instead of copy-pasted whenever a subsystem rule is added, renamed or split.

**When a reason belongs in a paths-scoped rule versus a code comment**: a paths-scoped rule is the right destination for an invariant that is true of a *whole subsystem or file class*, independent of which function an agent happens to be looking at — exactly the shape ocx's existing `subsystem-cli.md` (`paths: crates/ocx_cli/src/**`) already takes. A code comment (guard or why-constraint) is right when the reason is local to one function or one line and would not survive being generalized to the whole path. The routing test: *would this sentence still be true, verbatim, at every other file the glob matches?* If yes, it belongs in the rule, not repeated per file; the arXiv paper measuring agent documentation habits found instruction files and working notes already account for 60.5% of all documentation consultations against 10.6% for classical docs and 1.3% for API references ([arXiv 2608.20195 abstract](https://arxiv.org/abs/2608.20195)) — a subsystem-wide invariant reaches a cold agent far more reliably by living in the artifact class agents already consult most, not by being re-typed into every file the invariant covers.

### 4. Essay-split: four fleet essays and one 97-line function

`sample.md §2` found exactly 4 essay-classified blocks fleet-wide (124 of 2,009 sampled comment lines, 6.2%) — small in volume, but every one measured here mixes at least two routing-table categories, which is itself the finding: an "essay" is rarely pure argument, it is argument wrapped around a guard or contract that the split must not lose.

**ocx — `crates/ocx_cli/src/command/package_verify.rs:4`, 34 lines** ([sampled len 34](../code-docs-audit/scratch/samples/ocx.json)). Already the best-behaved of the four: it opens by pointing at `adr_oci_referrers_signing_v1.md` for "the full state machine" — a correct, file-qualified pointer already in place. What remains after that pointer is (a) contract text a CLI user needs (trust-root precedence order, `--offline` scoping) — **stays**, compressed; (b) one real why-constraint ("no default `--certificate-identity`/`--certificate-oidc-issuer` — keyless verification is meaningless without knowing whose signature you trust") — **stays**, one sentence; (c) a paragraph on how the positive path is tested against a live Sigstore deployment — **moves**, this is a test-infrastructure note that belongs on the integration-test file's own doc comment, not a CLI command's module doc. Net: ~34 lines to roughly 10; nothing guard-relevant is lost because the ADR pointer was already doing its job — the essay here is really an essay that forgot to delete itself after adding the pointer, the same "2 of 10, pointer added, essay not removed" failure `config.md §4` already measured.

**ocx-catalog — `.lighthouserc.cjs:2`, 51 lines** ([sampled len 51](../code-docs-audit/scratch/samples/ocx-catalog.json)). The richest of the four, and it turns out to be three categories stacked, not one:
- The threshold table itself (accessibility 0.97, best-practices 0.93, seo 0.97, performance 0.85) is **narration** — the same numbers are already expressed as the actual gate config in the `module.exports` object a few lines below. Restating them in prose adds a second copy that can drift from the real one.
- "Measured, then ratcheted... dropped by a >=0.03 margin so ordinary run-to-run variance never reds the build" plus the RED-state proof (a deliberate a11y regression measured 0.92→0.77, then reverted) is **provenance**, and it is the fleet's target shape for it — quantified, falsifiable, exactly the pattern `sample.md`'s one genuine provenance exception recommends (`ocx:.claude/rules/docs-quality/checks/prose.py:101`, "12 of 18 were ordinary technical nouns"). It **moves**: a one-line pointer to "the WP2 completion report" the comment already names, rather than re-telling the regression story inline every time someone opens the config.
- "Why category assertions and NOT `preset: 'lighthouse:no-pwa'`" is a genuine **essay**: it weighs a named alternative, cites what that alternative would have broken (several specific Lighthouse audits), and states a maintenance-burden tradeoff a future maintainer could reasonably re-litigate. Applying [Joel Parker Henderson's ADR-worthiness filter](https://github.com/joelparkerhenderson/architecture-decision-record) — "create an ADR when we want future developers to understand the why... skip an ADR when a decision is limited in scope and time and risk and cost, or is already covered elsewhere" — this fails the skip test: it governs an enforced CI gate across the whole site, not a one-off workaround, so it **moves** to a new record (ocx-catalog currently tracks exactly 1 ADR, `records.md §1`; this becomes its second). What is lost if the split is done carelessly: the specific rejected audit names (`color-contrast`, `link-name`, `link-in-text-block`) are the only thing that makes the tradeoff falsifiable later — the ADR must keep them, a one-line "we chose categories over the preset" pointer without them would not.

**ocx-catalog — `src/sources/labels.ts:237`, 21 lines** ([sampled len 21](../code-docs-audit/scratch/samples/ocx-catalog.json)). Mixed contract and guard, not essay at all on a second read against the routing table: "top-level site paths this build owns... a non-root label may not collide with one" is **contract** (a caller — `resolveLabel`'s two branches — must know this); the case-insensitivity clause ("`SAFE_LABEL_RE` admits `Docs`, and macOS and Windows both resolve that to the same directory as `docs`") is a **guard** — it names the exact platform-specific breaking edit (drop the case-fold, collide on a contributor's laptop) — and should have been classified guard, not essay, in the length-based seeded sample; the sibling-relationship sentence is a **pointer**, already correctly naming `checkIndexNamespaceCollisions` by identifier rather than by file (matklad's rule, unprompted). Net: 21 lines to about 6; no ADR needed — Henderson's skip test applies cleanly here (single-file, low-risk, already fully covered by the two functions' own bodies). This is the useful negative case for the essay-split procedure: length alone flagged it, the routing table demoted most of it to guard and contract, and no new record was minted.

**grimoire-vscode — `src/views/details.ts:214`, 18 lines** ([sampled len 18](../code-docs-audit/scratch/samples/grimoire-vscode.json)). This is a mis-filed **guard**, not an essay, and the highest-stakes of the four to get wrong: "`CatalogService.state().items` is a cache the SIDEBAR owns and replaces wholesale on every search... Every VM rebuild re-resolved the row from there, so the row's index-published signals... blinked out on the second paint" names a specific, previously-observed regression a naive simplification of this field would reintroduce. Split: a one-line contract summary stays ("the catalog row each open panel was built from"), the guard compresses to the counterfactual-plus-consequence shape `sample.md`'s Patterns worth encoding recommends ("doing X instead of Y breaks Z") in 2-3 lines, and the trailing `ponytail:` marker (already self-resolving, ceiling plus upgrade path) is untouched. Net: 18 to about 7. **What would be lost by a naive length-only cut**: the mechanism clause ("blinked out on the second paint") — delete that and keep only "cached per repo, refreshed from the shared cache", and a future editor has no way to know *why* the refresh logic can't simply always trust the live cache. This is the cleanup-procedure dive's central risk (agents under-delete comments overall, per the empirical measurements, but the failure mode that actually matters is deleting the wrong 20%), demonstrated concretely on one real field.

**ocx — `crates/ocx_config/src/env.rs:1755`, `is_ocx_trampoline`, ~97 lines, 7 headers** (not in the seeded sample; named directly by the commission and by the prior artifact, `research_code_comment_density.md` line 99: "97 lines with seven invented headers"). Splitting by the routing table, header by header:

| Header | Category | Verdict |
|---|---|---|
| `# POSIX signal` | guard | Stays — two named counterfactual edits, each pinned to a real test (`a_marker_beyond_the_probe_window_is_not_refused`, `a_launcher_whose_baked_path_spells_the_marker_is_not_refused`); compress the prose around the tests, keep both counterfactuals |
| `# Not `ocx_util::fs::read_bounded`` | guard | Stays — textbook "a future search-before-writing agent reaches for the wrong helper" guard, names the exact consequence (C-069 silently disarmed on deep checkouts); compress to ~3 lines |
| `# Windows signal` | guard + provenance | The mechanism (hardlinked blobs share content, so content-matching cannot discriminate them) stays; the struck-design history (`D-V15`) moves to whatever record covers C-069, replaced by one file-qualified pointer instead of three bare IDs (`C-069`, `D-V12`, `D-V15`) threaded through the paragraph |
| `# Regular files only, and the order is load-bearing` | guard | Stays close to as-is — already near-minimal, a fail-open FIFO-hang bug, the "ordering matters" shape `sample.md` flags as a top guard pattern |
| `# Fails open` | why-constraint | Stays — contrasts with a sibling predicate's fail-closed posture; already tight |
| `# Why this has a body while its sibling C-010 exclusion does not` | essay (thin) | **Deletes.** This guards nothing about `is_ocx_trampoline` itself — it is commentary about the fleet's own documentation conventions. Henderson's skip test applies: limited in scope, no future edit becomes wrong for not reading it |
| `# Which validation row measures this` | provenance (quantified) | **Moves** — one line stays ("Item 37 is the only validation row that measures this cost"), the full explanation of why WP-12e's row does not belongs on that benchmark's own file |

Net estimate: ~97 lines to somewhere around 45-55 — a real cut, but nowhere near zero, because this genuinely is one of the fleet's most guard-dense functions (a security- and correctness-critical predicate with distinct POSIX and Windows failure modes). That is itself a finding for the length-and-ratchet dive: a block-length cap applied *after* a correct split can still legitimately flag this function, and the carve-out has to be "every remaining line is guard or contract" (verifiable in principle by the guard recognizer that dive is building), not merely "it went through the cleanup skill once."

## Normative guidance candidates

1. **MUST — File every comment block under exactly one routing-table category before shortening or moving it; a block that fits none defaults to essay, never to silent deletion.** Prevents the reward-hacking failure mode the fleet's own data already shows (category-wide deletes destroy guards, `code-docs-frame.md` prior evidence). Verify: reading heuristic — apply [§1](#1-the-routing-table)'s eleven one-line tests in the order guard → contract → pointer → todo-debt → provenance → record-paraphrase → essay → narration/tautology/section-marker → why-constraint (catch-all); first test that fires wins.
2. **MUST — A pointer to a decision record, plan, or subsystem doc names the tracked file plus an anchor; a bare short ID (`C-NNN`, `WP-`, `DEC-`, `DX-`, `RUL-`, `(D14)`) or a bare commit SHA is never the pointer's only identifying content.** Bare IDs collide (`C-018` resolves in 21 tracked files today) and bare commit SHAs can go unreachable across the same repo's own rebases — measured once fleet-wide (`ocx:crates/ocx_package_manager/src/tasks/pull.rs:669`, "commit 40b001f"). Verify (ran today, real result):
   ```
   ID=C-018
   grep -rl -e "$ID" /home/mherwig/dev/ocx/.claude/artifacts/*.md | wc -l
   # 21 — fails the uniqueness bar
   PTR=adr_index_indirection.md
   git -C /home/mherwig/dev/ocx ls-files --error-unmatch ".claude/artifacts/$PTR"
   # resolves — passes
   ```
3. **MUST — An essay-shaped comment is split at the point it stops stating an invariant and starts arguing for one; the argument moves to a decision record (new if none exists), a single file-qualified pointer replaces it, and every counterfactual-edit clause the essay contained stays local, verbatim, not merely summarized.** Loses the least when the split keeps the exact "doing X instead of Y breaks Z" sentence rather than compressing it to "see the ADR for the rationale" — the four sampled essays and `is_ocx_trampoline` show every one keeps a guard fact the ADR alone would not restate at the call site. Verify: named reading heuristic — [Henderson's ADR-worthiness filter](https://github.com/joelparkerhenderson/architecture-decision-record) per candidate essay ("limited in scope and time and risk and cost, or already covered elsewhere" → cut, no new record; else → new or existing record); confirm no counterfactual clause present in the pre-split text is absent from the post-split text (before/after diff read by hand until the guard-recognizer from the guard-shape dive exists).
4. **SHOULD — Quantified provenance (a calibration or incident note carrying an exact count or a named artifact) stays as a short comment beside what it explains; unquantified provenance ("used to fail", "we saw this once") is deleted or, if it still constrains an edit, rewritten as a present-tense guard.** The fleet's one genuine provenance exception (`ocx:.claude/rules/docs-quality/checks/prose.py:101`, "12 of 18 were ordinary technical nouns") is falsifiable and worth keeping; every other sampled provenance/narration/tautology block carried zero guard content (`sample.md §6`, 1/43 blocks, ~0%). Verify: reading heuristic — does the sentence contain a number, a named test, or a named artifact someone could check? If not, delete.
5. **MUST — A comment, code, or test is the only place a MUST-level reason may live; a commit message (WIP or finalized) is never the *target* a source comment points at.** `hex-finalize` derives every recomposed body from the diff, never copies WIP prose (`hex-finalize/SKILL.md` C-808, quoted in full in [§2](#2-commit-bodies-across-hex-finalizes-rewrite)), and a forge squash-merge can flatten even a correctly recomposed series past that. Verify:
   ```
   grep -rnE -e '// .*\bcommit [0-9a-f]{7,40}\b' -e '/// .*\bcommit [0-9a-f]{7,40}\b' \
     /home/mherwig/dev/ocx/crates --include='*.rs' | wc -l
   # 1 — ocx:crates/ocx_package_manager/src/tasks/pull.rs:669, already flagged in §1 as the wrong-shape example
   ```
6. **SHOULD — The finalized commit's own body remains a legitimate secondary home for a logical change's settled why (mechanism plus issue number), written once at finalize time, not carried in from WIP commits by assumption.** Measured: ocx's `feat/extra-ca-certs` post-finalize body (49 lines) restates every durable fact its 25 pre-finalize commits argued, in the finalizer's own words, dropping only session-local review vocabulary. Verify: reading heuristic — `git log -1 --format='%B' <finalized-sha>` should independently explain the change without requiring `git log` on the pre-finalize ref; if it doesn't, the finalize pass under-read the branch's history.
7. **MUST — When a fleet repo already keeps a `paths:`-scoped subsystem or comment-governing rule for a file's glob, a per-file essay restating that rule's invariant is deleted in favor of the rule plus a one-line pointer; the invariant is never maintained in both places.** ocx's `quality-rust.md` "Patterns to Preserve" and `docs-and-tracing.md` DOC-19 already collide on the same `**/*.rs` glob with no cross-reference (config.md Smell #1), re-confirmed today. Verify:
   ```
   grep -c 'rust-quality' /home/mherwig/dev/ocx/.claude/rules/quality-rust.md
   # 0
   ```
8. **SHOULD — A repo-wide PostToolUse hook prints every `paths:`-scoped rule covering the just-touched path, generated from the rules' own frontmatter, not a hand-maintained table.** Claude Code's own rules fire "when Claude reads files matching the pattern, not on every tool use" ([code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory)) — a Write-only edit can bypass the rule entirely; grimoire's `post_tool_use_tracker.py` already proves the mechanism (`CONTEXT_REMINDERS`) but from a static 4-row table. Verify: confirmed today that no fleet repo generates this from frontmatter —
   ```
   grep -n "paths:" /home/mherwig/dev/grimoire/.claude/hooks/post_tool_use_tracker.py | wc -l
   # 0
   ```
   `records.md`'s own `scan_rules.py` (§6) is the reusable starting point: it already parses every tracked rule's `paths:` key fleet-wide.
9. **MUST — A record-paraphrase is deleted entirely once its file-qualified pointer is added; the pointer and the paraphrase never coexist.** The fleet's own attempted fixes fail this half the time: `config.md §4` spot-checks 1 and 6 both found "correct file-qualified pointer, essay kept anyway." Verify: reading heuristic — if the comment both names a tracked document and restates two or more of its sentences, the restatement is the finding.
10. **SHOULD — todo-debt markers are self-resolving (ceiling plus upgrade path inline); a bare `TODO` naming an external ID for its resolution routes to the pointer row's rules instead, not its own.** Only 1 of 320 sampled fleet blocks is todo-debt (`sample.md §2`), and the fleet's one clean convention (`ponytail:`) already needs no external document. Verify:
    ```
    grep -rnE -e '(#|//) ?ponytail:' <dir> | grep -vE ',' 
    # any hit with no comma (no ", <upgrade path>" clause) fails the self-resolving test
    ```
11. **CONSIDER — Use the counterfactual-plus-consequence shape ("doing X instead of Y breaks Z") as the interim, human-applied test for "this is a guard, don't touch it" until the guard-shape dive ships a mechanical recognizer.** Every guard example measured in this dive and in `sample.md §5` shares this shape; no fleet narration or tautology block does. Verify: reading heuristic only today — no recognizer ships in this program yet (guard-recognition is still P0-uncovered per `code-docs-topic-map.md`).
12. **CONSIDER — When an essay's argument has nowhere to go because the repo's ADR store is thin (fewer than a handful of tracked records), that thinness is not a reason to leave the essay in code; mint the record.** ocx-catalog carries exactly 1 tracked ADR against 924 lines of source comments classified essay or contract in the seeded sample; the `.lighthouserc.cjs` split in [§4](#4-essay-split-four-fleet-essays-and-one-97-line-function) would be its second. Verify: named reading heuristic (Henderson's filter, [rule 3](#normative-guidance-candidates) above) — a repo's thin ADR count is not itself one of Henderson's skip conditions.

## AI-agent angle

- **An agent asked to "shorten this file's comments" reaches for the essay first and stops there, because it is the most visible reduction, and misses that the essay is protecting a guard fact narration-focused deletion would not.** The smallest mechanical check: after any comment-shortening diff, re-run the counterfactual-plus-consequence pattern match (rule 11) against the pre- and post-diff text for the touched block; a match present before and absent after is the finding, independent of line count.
- **An agent writing a new pointer defaults to whatever ID vocabulary its plan handed it (`C-018`, `WP-2`), because that is the ID it is already holding in context — it did not mint the collision, it inherited it.** The smallest mechanical check: any newly-added `C-`/`WP-`/`DEC-`/`DX-`/`RUL-` token in a diff's added comment lines, with no adjacent file name in the same clause, fails rule 2 — `grep -rnE -e '\b(C|WP|DEC|DX|RUL)-[0-9]+\b' <changed-files>` on the diff's added lines, then check each hit's line for a `.md` filename token beside it.
- **An agent running `/hex-finalize` on someone else's branch will, by default, write a plausible-sounding recomposed body even when it did not actually read every pre-finalize commit closely enough to preserve a genuinely load-bearing fact — the mechanism (diff-derived, not copied) makes a confidently-wrong summary and a faithfully-complete one look identical in the gate's disclosure.** The smallest mechanical check available today is manual: diff the recomposed series' combined body text against the pre-finalize ref's combined body text for named nouns (issue numbers, function names, error-code numbers) and confirm every noun that appears in the diff's actual code also appears in at least one recomposed body — a name-level, not a semantic, check, but cheap and already the shape `hex-finalize`'s own message-matches-diff check (C-807 step 4) proves out for the code side.
- **An agent given a `paths:`-scoped rule and told "match its comment density" (a documented Claude Code behavior for dense files) will over-comment a new file in a directory whose existing files happen to be essay-heavy, because density is a per-file convention as much as an agent-versus-human one** (`code-docs-topic-map.md`, per-file-concentration finding: 25 of 636 ocx files hold 34% of the long-block mass). No check in this dive's scope catches this directly — it is the length-and-ratchet dive's ambient-density question, noted here only because the routing table's essay row is where that density concentrates.

## Contested / evolving

- **Whether a repo's own ADR store thinness should lower the bar for "does this need a decision record" is unsettled in this fleet's own practice.** Henderson's filter says no (scope/risk/cost decide it, not how many records already exist); ocx-catalog's actual behavior — write a 51-line in-code essay rather than a second ADR — says the practical bar rises when the store is thin, exactly the opposite direction. This dive takes Henderson's side (rule 12) but the fleet's revealed preference disagrees, as of 2026-09-27.
- **Whether commit-body provenance is worth writing carefully at all, given it survives only conditionally, is a live disagreement this dive did not resolve, only bounded.** `records.md §5` shows the fleet already writes substantial bodies (median 17 lines, 92% presence) — that investment predates this program and is not being told to stop; this dive's contribution is narrower: don't let a *comment* point at a commit as its sole source of truth. The bodies stay valuable for archaeology regardless.
- **The `hex-state.md` armed-backup-ref finding in [§2](#2-commit-bodies-across-hex-finalizes-rewrite) is a live data-hygiene question for the owner, not a settled fact this dive can adjudicate** — it is unclear from the outside whether `backup/feat/extra-ca-certs-pre-finalize` is stale (safe to rename inert or delete) or genuinely marks unfinished work on that branch.

## Decisions this dive proposes

- **The routing table, as it will appear in the rule index**: the 11-row table in [§1](#1-the-routing-table) (category, destination, one-line routing test, survives-git-flow note), with verification commands promoted into the [Normative guidance](#normative-guidance-candidates) numbered rules rather than duplicated in the index table itself — keeps the index table scannable, keeps the checkable commands next to the MUST/SHOULD they verify. Reason: the commission's own output shape puts routing tests in the index and verification detail in guidance; conflating them in one wide table made every cell too long to scan in the drafts tried while writing this file.
- **The essay-split procedure**: (1) read the whole block against the surrounding function/type, never the next line alone; (2) tag every sentence with one routing-table category; (3) for each guard or contract sentence found, keep it local, compressed to the counterfactual-plus-consequence shape where applicable; (4) for the remainder, apply Henderson's ADR-worthiness filter — cut with no new record if it fails, else write or extend a record and leave exactly one file-qualified pointer; (5) confirm no counterfactual clause present before the split is absent after. Reason: this is what [§4](#4-essay-split-four-fleet-essays-and-one-97-line-function)'s four worked examples plus `is_ocx_trampoline` actually did, and each step maps onto why that example split the way it did — it is a description of demonstrated behavior, not an invented procedure.
- **The commit-body verdict**: provenance may route to a commit body as a secondary record of settled reasoning, never as the sole store a MUST-level guard depends on, and a source comment must never point *at* a commit (by SHA or otherwise) as its resolution target. Reason: `hex-finalize`'s C-808 contract structurally derives bodies from diffs, not from WIP text, confirmed by the 25-to-10-commit `feat/extra-ca-certs` measurement in [§2](#2-commit-bodies-across-hex-finalizes-rewrite); a forge squash-merge is a second, uncontrolled rewrite past that; and this fleet's own worktree/backup-ref hygiene treats the refs that would let an agent recover the pre-rewrite text as disposable, not durable infrastructure.

## Sources

| URL or path | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [github.com/joelparkerhenderson/architecture-decision-record](https://raw.githubusercontent.com/joelparkerhenderson/architecture-decision-record/main/README.md) | ADR practice README, fetched directly | Living doc, fetched 2026-09-27 | Supplies the scope filter ("create an ADR when...skip when...") this dive reuses for the essay-split and record-paraphrase rows |
| [arxiv.org/abs/2608.20195](https://arxiv.org/abs/2608.20195) | "From Agent Behaviour to Agent-Friendly Documentation" — empirical study, 557 agentic sessions, 33,097 PRs | 2026 preprint | Measures that instruction files/working notes are 60.5% of agent doc consultations vs 10.6% classical docs, 1.3% API refs — the evidence behind routing subsystem-wide invariants to rules over per-file comments |
| [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory) | Claude Code's own memory/rules documentation | Live docs, fetched 2026-09-27 | States exactly when a `paths:`-scoped rule fires ("when Claude reads... not on every tool use") — the mechanical reason a PostToolUse hook backstop is needed |
| [cognitect.com/blog/…documenting-architecture-decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) | Michael Nygard's original ADR post | 2011, still the base template the fleet's 81%-hybrid format descends from | Grounds the "supersede, never edit" rule this dive applies to record-paraphrase |
| [matklad.github.io/…/ARCHITECTURE.md.html](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html) | matklad, "ARCHITECTURE.md" | 2021, widely cited, still current practice | Naming-over-linking rule, confirmed already present unprompted in `ocx-catalog:src/sources/labels.ts` |
| [conventionalcommits.org/en/v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) | Conventional Commits spec | v1.0.0, current | Defines what a commit body is *for*, the baseline this dive's commit-body verdict narrows further |
| [docs.github.com/…/about-pull-request-merges](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges) | GitHub Docs, PR merge strategies | Live docs, fetched 2026-09-27 | Confirms a squash merge's default message is configuration-dependent, not a guarantee every commit body survives — the second-rewrite half of the commit-body verdict |
| [code-docs-audit/sample.md](../code-docs-audit/sample.md) | Fleet-wide seeded comment sample, 320 blocks, 5 repos | Measured 2026-09-27 | Source of the 11-category taxonomy this dive's routing table is built on, and of the four sampled essays |
| [code-docs-audit/records.md](../code-docs-audit/records.md) | Decision records, tests, git history, path-scoped rules audit, 21-repo fleet | Measured 2026-09-27 | Source of the backup-ref lifecycle evidence, the `post_tool_use_tracker.py` pattern, and the 45% record-to-code rename-rot figure |
| [code-docs-audit/config.md](../code-docs-audit/config.md) | Fleet AI-config audit (rules, skills, IDs) | Measured 2026-09-27 | Source of the `quality-rust.md`/`docs-and-tracing.md` collision and the 10-spot-check pointer-following table this dive builds on |
| [/home/mherwig/dev/ocx/.claude/artifacts/research_code_comment_density.md](/home/mherwig/dev/ocx/.claude/artifacts/research_code_comment_density.md) | Prior ocx research, "where each kind lives" table and `is_ocx_trampoline` finding | 2026, prior wave | The routing table this dive supersedes; `is_ocx_trampoline`'s "97 lines, seven headers" figure re-verified here still holds |
| [/home/mherwig/.claude/skills/hex-finalize/SKILL.md](/home/mherwig/.claude/skills/hex-finalize/SKILL.md) | hex-finalize skill contract | Current, this session | Source of the C-807/C-808 recompose mechanics the commit-body verdict rests on |
| [/home/mherwig/.claude/skills/hex-core/references/finalize.md](/home/mherwig/.claude/skills/hex-core/references/finalize.md) | hex-core shared finalize contract | Current, this session | Source of the armed/inert backup-ref naming (C-809) used to read `backup/feat/extra-ca-certs-pre-finalize`'s state |
| `ocx:feat/extra-ca-certs` vs `ocx:backup/feat/extra-ca-certs-pre-finalize` (git log, both refs) | Real pre- and post-finalize commit history, same branch | Read 2026-09-27 | Primary evidence for the commit-body verdict: 25 commits collapsed to 10, which facts survived and which didn't |
| `ocx:crates/ocx_config/src/env.rs:1755` (`is_ocx_trampoline`) | 97-line, 7-header doc comment | Read 2026-09-27 | Worked essay-split example on the fleet's densest measured guard function |
| `ocx:crates/ocx_cli/src/command/package_verify.rs:4`, `ocx-catalog:.lighthouserc.cjs:2`, `ocx-catalog:src/sources/labels.ts:237`, `grimoire-vscode:src/views/details.ts:214` | The four sample-classified fleet essays | Read 2026-09-27 | The four worked essay-split examples behind §4's table and prose |
| `grimoire:.claude/hooks/post_tool_use_tracker.py` | Live PostToolUse hook, full file read | Read 2026-09-27 | The fleet's one working example of a hook resolving a touched path to its governing rule |
